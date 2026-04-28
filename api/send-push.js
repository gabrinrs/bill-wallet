// api/send-push.js — Vercel Serverless Function
// Invia push notification in tempo reale a un singolo utente
// Chiamato da Make.com dopo ogni bolletta/comunicazione processata

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Autenticazione con API key
  const apiKey = req.headers['x-api-key']
  if (apiKey !== process.env.NOTIFICATIONS_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { user_id, title, body, tag, url } = req.body

  if (!user_id || !title || !body) {
    return res.status(400).json({ error: 'Campi obbligatori: user_id, title, body' })
  }

  try {
    // Configura VAPID
    webpush.setVapidDetails(
      'mailto:admin@getbolly.app',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )

    // Supabase con service_role (bypassa RLS)
    const supabase = createClient(
      process.env.SUPABASE_URL || 'https://iimzetvymamadclfblgy.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Recupera le push subscriptions dell'utente
    const { data: subs, error: errSubs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys_p256dh, keys_auth')
      .eq('user_id', user_id)

    if (errSubs) throw errSubs

    if (!subs || subs.length === 0) {
      return res.status(200).json({
        message: 'Nessuna subscription trovata per questo utente',
        user_id,
        sent: 0
      })
    }

    // Payload della notifica
    const payload = JSON.stringify({
      title: title,
      body: body,
      tag: tag || 'bolly-realtime',
      url: url || '/'
    })

    let sent = 0
    let errors = []

    // Invia a tutti i dispositivi dell'utente
    for (const sub of subs) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth
          }
        }, payload)
        sent++
      } catch (pushErr) {
        // Subscription scaduta → rimuovi dal DB
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
        }
        errors.push({ endpoint: sub.endpoint, error: pushErr.message })
      }
    }

    return res.status(200).json({
      message: 'Push inviata',
      user_id,
      dispositivi: subs.length,
      inviate: sent,
      errori: errors.length
    })

  } catch (err) {
    console.error('Errore send-push:', err)
    return res.status(500).json({ error: err.message })
  }
}