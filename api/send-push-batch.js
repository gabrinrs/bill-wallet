// api/send-push-batch.js — Vercel Serverless Function
// Invia push notification a più utenti in una sola chiamata
// Usato per notifiche social (split, amicizie) dal frontend

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = req.headers['x-api-key'] || req.body?.api_key
  if (apiKey !== process.env.NOTIFICATIONS_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { notifications } = req.body
  // notifications = [{ user_id, title, body, tag }]

  if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
    return res.status(400).json({ error: 'Campo obbligatorio: notifications (array di { user_id, title, body })' })
  }

  try {
    webpush.setVapidDetails(
      'mailto:admin@getbolly.app',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )

    const supabase = createClient(
      process.env.SUPABASE_URL || 'https://iimzetvymamadclfblgy.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Raccogli tutti gli user_id unici
    const userIds = [...new Set(notifications.map(n => n.user_id).filter(Boolean))]

    // Recupera tutte le subscription in una query sola
    const { data: subs, error: errSubs } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, keys_p256dh, keys_auth')
      .in('user_id', userIds)

    if (errSubs) throw errSubs
    if (!subs || subs.length === 0) {
      return res.status(200).json({ message: 'Nessuna subscription trovata', sent: 0 })
    }

    let totalSent = 0
    let totalErrors = 0

    for (const notif of notifications) {
      const userSubs = subs.filter(s => s.user_id === notif.user_id)
      const payload = JSON.stringify({
        title: notif.title,
        body: notif.body,
        tag: notif.tag || 'bolly-social',
        url: notif.url || '/'
      })

      for (const sub of userSubs) {
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
          totalErrors++
        }
      }
    }

    return res.status(200).json({ message: 'Push inviate', inviate: totalSent, errori: totalErrors })
  } catch (err) {
    console.error('Errore send-push-batch:', err)
    return res.status(500).json({ error: err.message })
  }
}
