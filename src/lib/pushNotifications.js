// pushNotifications.js — Gestione sottoscrizione push per Bolly

import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = 'BPvhyuBppwl5lIIErLwAbV8EXc_nBxeJX_gcNoqpb5vVSO9em4Ju7d2EztYscSeuI725uF1WaZ0ViuIeTnkRBKA'

// Converte la chiave VAPID da base64 a Uint8Array (formato richiesto dal browser)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Sottoscrive alle push notifications.
 * NON registra il Service Worker — lo fa VitePWA automaticamente.
 * Salva la subscription su Supabase.
 * Ritorna true se tutto ok, false se l'utente ha rifiutato o c'è un errore.
 */
export async function subscribeToPush(userId) {
  try {
    // 1. Controlla che il browser supporti le push
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('🔔 Push non supportate')
      return false
    }

    // 2. Aspetta che il Service Worker sia pronto
    console.log('🔔 Aspetto SW ready...')
    const registration = await navigator.serviceWorker.ready
    console.log('🔔 SW pronto:', registration.scope)

    // 3. Chiedi il permesso per le notifiche
    const permission = await Notification.requestPermission()
    console.log('🔔 Permesso:', permission)
    if (permission !== 'granted') {
      return false
    }

    // 4. Sottoscrivi alle push
    console.log('🔔 Sottoscrivo pushManager...')
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })

    // 5. Estrai i dati della subscription
    const subscriptionData = subscription.toJSON()
    console.log('🔔 Subscription ottenuta:', subscriptionData.endpoint?.slice(0, 50))

    // 6. Salva su Supabase (rimuovi solo la subscription di QUESTO browser/dispositivo, poi inserisci)
    // Così l'utente può ricevere push su più dispositivi contemporaneamente
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscriptionData.endpoint)
    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: userId,
      endpoint: subscriptionData.endpoint,
      keys_p256dh: subscriptionData.keys.p256dh,
      keys_auth: subscriptionData.keys.auth
    })

    if (error) {
      console.error('🔔 Errore salvataggio Supabase:', error)
      return false
    }

    console.log('🔔 Push subscription salvata su Supabase!')
    return true
  } catch (err) {
    console.error('🔔 Errore subscribeToPush:', err)
    return false
  }
}

/**
 * Controlla se l'utente ha già una subscription push attiva.
 */
export async function isPushSubscribed() {
  try {
    if (!('serviceWorker' in navigator)) return false
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  } catch {
    return false
  }
}

/**
 * Rimuove la subscription push (per logout o disattivazione).
 */
export async function unsubscribeFromPush(userId) {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
    }
    // Rimuovi anche da Supabase
    if (userId) {
      await supabase.from('push_subscriptions').delete().eq('user_id', userId)
    }
  } catch (err) {
    console.error('Errore rimozione subscription:', err)
  }
}
