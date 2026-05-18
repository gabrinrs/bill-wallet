// api/export-data.js — Vercel Serverless Function
// Esporta tutti i dati dell'utente in formato JSON (GDPR Art. 20 - Portabilità)
// Autenticazione tramite JWT Supabase nell'header Authorization

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Autenticazione utente tramite JWT
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante' })
  }
  const token = authHeader.replace('Bearer ', '')

  // Client con service_role per accesso completo
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
    // Recupera dati da tutte le tabelle dell'utente
    const [
      profileRes,
      contrattiRes,
      bolletteRes,
      speseRes,
      abitazioniRes,
      notificheRes,
      amicizieRes,
      contattiEsterniRes,
      splitRes,
      splitPartecipantiRes,
      salvadanaiRes,
      versamentiRes,
      pushSubsRes
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', userId),
      supabaseAdmin.from('contratti').select('*').eq('user_id', userId),
      supabaseAdmin.from('bollette').select('*').eq('user_id', userId),
      supabaseAdmin.from('spese').select('*').eq('user_id', userId),
      supabaseAdmin.from('abitazioni').select('*').eq('user_id', userId),
      supabaseAdmin.from('notifiche').select('*').eq('user_id', userId),
      supabaseAdmin.from('amicizie').select('*').or(`richiedente_id.eq.${userId},destinatario_id.eq.${userId}`),
      supabaseAdmin.from('contatti_esterni').select('*').eq('user_id', userId),
      supabaseAdmin.from('split').select('*').eq('creatore_id', userId),
      supabaseAdmin.from('split_partecipanti').select('*').eq('user_id', userId),
      supabaseAdmin.from('salvadanai').select('*').eq('user_id', userId),
      supabaseAdmin.from('versamenti_salvadanaio').select('*').eq('user_id', userId),
      supabaseAdmin.from('push_subscriptions').select('user_id, created_at').eq('user_id', userId)
    ])

    const exportData = {
      esportazione: {
        data_esportazione: new Date().toISOString(),
        utente_email: user.email,
        formato: 'Bolly GDPR Export v1.0'
      },
      profilo: profileRes.data?.[0] || null,
      contratti: contrattiRes.data || [],
      bollette: bolletteRes.data || [],
      spese: speseRes.data || [],
      abitazioni: abitazioniRes.data || [],
      notifiche: notificheRes.data || [],
      amicizie: amicizieRes.data || [],
      contatti_esterni: contattiEsterniRes.data || [],
      split_creati: splitRes.data || [],
      split_partecipazioni: splitPartecipantiRes.data || [],
      salvadanai: salvadanaiRes.data || [],
      versamenti_salvadanaio: versamentiRes.data || [],
      dispositivi_notifiche: (pushSubsRes.data || []).length
    }

    // Rispondi con JSON scaricabile
    const filename = `bolly-export-${new Date().toISOString().slice(0, 10)}.json`
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.status(200).json(exportData)

  } catch (error) {
    console.error('Errore export dati:', error)
    return res.status(500).json({ error: 'Errore durante l\'esportazione dei dati' })
  }
}
