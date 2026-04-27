import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

webpush.setVapidDetails(
  'mailto:admin@getbolly.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export default async function handler(req, res) {
  // Protezione: solo POST con chiave segreta
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (req.headers['x-api-key'] !== process.env.NOTIFICATIONS_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Data target: oggi + 3 giorni
    const target = new Date()
    target.setDate(target.getDate() + 3)
    const targetStr = target.toISOString().split('T')[0]

    // Bollette in scadenza tra 3 giorni, non pagate
    const { data: bollette, error: errB } = await supabase
      .from('bollette')
      .select('id, user_id, importo, scadenza, descrizione_libera')
      .eq('scadenza', targetStr)
      .eq('pagata', 'no')
      .eq('stato_elaborazione', 'ok')

    if (errB) throw errB
    if (!bollette || bollette.length === 0) {
      return res.status(200).json({ message: 'Nessuna bolletta in scadenza', sent: 0 })
    }

    // Raggruppa per utente
    const perUtente = {}
    for (const b of bollette) {
      if (!perUtente[b.user_id]) perUtente[b.user_id] = []
      perUtente[b.user_id].push(b)
    }

    let totalSent = 0

    for (const [userId, userBollette] of Object.entries(perUtente)) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, keys_p256dh, keys_auth')
        .eq('user_id', userId)

      if (!subs || subs.length === 0) continue

      const count = userBollette.length
      const prima = userBollette[0].descrizione_libera || 'bolletta'
      const totale = userBollette.reduce((s, b) => s + (Number(b.importo) || 0), 0)

      const body = count === 1
        ? `${prima} — ${totale.toFixed(2)}€ in scadenza tra 3 giorni`
        : `Hai ${count} bollette in scadenza tra 3 giorni per un totale di ${totale.toFixed(2)}€`

      const payload = JSON.stringify({
        title: 'Bolly — Scadenza in arrivo',
        body,
        tag: `scadenza-${targetStr}`,
        url: '/'
      })

      for (const sub of subs) {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth }
          }, payload)
          totalSent++
        } catch (pushErr) {
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        }
      }
    }

    return res.status(200).json({
      bollette_trovate: bollette.length,
      utenti: Object.keys(perUtente).length,
      notifiche_inviate: totalSent,
      data_scadenza: targetStr
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}