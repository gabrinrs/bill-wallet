// api/delete-account.js — Vercel Serverless Function
// Elimina tutti i dati dell'utente + account auth (GDPR Art. 17 - Diritto all'oblio)
// Autenticazione tramite JWT Supabase nell'header Authorization
// Richiede conferma: body { "conferma": "ELIMINA" }

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verifica conferma esplicita nel body
  const { conferma } = req.body || {}
  if (conferma !== 'ELIMINA') {
    return res.status(400).json({ error: 'Conferma mancante. Invia { "conferma": "ELIMINA" }' })
  }

  // Autenticazione utente tramite JWT
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante' })
  }
  const token = authHeader.replace('Bearer ', '')

  // Client con service_role per accesso completo + admin auth
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Client con token utente per verificare identità
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  )
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Token non valido' })
  }

  const userId = user.id

  try {
    // Ordine di eliminazione: rispetta le foreign key (figli prima dei genitori)
    // 1. Versamenti salvadanaio (FK → salvadanai)
    await supabaseAdmin.from('versamenti_salvadanaio').delete().eq('user_id', userId)

    // 2. Salvadanai
    await supabaseAdmin.from('salvadanai').delete().eq('user_id', userId)

    // 3. Split partecipanti dove l'utente è partecipante
    await supabaseAdmin.from('split_partecipanti').delete().eq('user_id', userId)

    // 4. Split partecipanti degli split creati dall'utente (gli altri partecipanti)
    const { data: userSplits } = await supabaseAdmin.from('split').select('id').eq('creatore_id', userId)
    if (userSplits && userSplits.length > 0) {
      const splitIds = userSplits.map(s => s.id)
      await supabaseAdmin.from('split_partecipanti').delete().in('split_id', splitIds)
    }

    // 5. Split creati dall'utente
    await supabaseAdmin.from('split').delete().eq('creatore_id', userId)

    // 6. Contatti esterni
    await supabaseAdmin.from('contatti_esterni').delete().eq('user_id', userId)

    // 7. Amicizie (come richiedente o destinatario)
    await supabaseAdmin.from('amicizie').delete().or(`richiedente_id.eq.${userId},destinatario_id.eq.${userId}`)

    // 8. Notifiche
    await supabaseAdmin.from('notifiche').delete().eq('user_id', userId)

    // 9. Push subscriptions
    await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId)

    // 10. Spese
    await supabaseAdmin.from('spese').delete().eq('user_id', userId)

    // 11. Bollette (FK → contratti)
    await supabaseAdmin.from('bollette').delete().eq('user_id', userId)

    // 12. Contratti (FK → abitazioni)
    await supabaseAdmin.from('contratti').delete().eq('user_id', userId)

    // 13. Abitazioni
    await supabaseAdmin.from('abitazioni').delete().eq('user_id', userId)

    // 14. PDF su Supabase Storage (cartella utente)
    const { data: files } = await supabaseAdmin.storage.from('bollette-pdf').list(userId)
    if (files && files.length > 0) {
      const filePaths = files.map(f => `${userId}/${f.name}`)
      await supabaseAdmin.storage.from('bollette-pdf').remove(filePaths)
    }

    // 15. Profilo
    await supabaseAdmin.from('profiles').delete().eq('id', userId)

    // 16. Account auth (ultimo — dopo aver eliminato tutto il resto)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteAuthError) {
      console.error('Errore eliminazione account auth:', deleteAuthError)
      return res.status(500).json({ error: 'Dati eliminati ma errore nella cancellazione dell\'account auth. Contatta support@getbolly.app' })
    }

    return res.status(200).json({ success: true, message: 'Account e tutti i dati eliminati con successo' })

  } catch (error) {
    console.error('Errore eliminazione account:', error)
    return res.status(500).json({ error: 'Errore durante l\'eliminazione. Contatta support@getbolly.app' })
  }
}
