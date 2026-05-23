// sw.js — Bolly Service Worker per Push Notifications
// Questo file viene compilato da VitePWA (injectManifest)

// Evento push: riceve la notifica dal server
self.addEventListener('push', (event) => {
  let data = { title: 'Bolly', body: 'Hai bollette in scadenza!' }

  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: '/bolly-icon-192.png',
    badge: '/bolly-icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'bolly-scadenza',
    renotify: true,
    data: {
      url: data.url || '/'
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options).then(() => {
      // Mostra badge "1" sull'icona della PWA
      if (navigator.setAppBadge) {
        return navigator.setAppBadge(1)
      }
    })
  )
})

// Evento click sulla notifica: apre l'app, naviga all'URL e rimuove badge
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  // Azzera sempre il badge quando l'utente interagisce con una notifica
  if (navigator.clearAppBadge) {
    navigator.clearAppBadge().catch(() => {})
  }

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se l'app è già aperta, naviga e poi prendi focus
      for (const client of windowClients) {
        if (client.url.includes('getbolly')) {
          if ('navigate' in client && url !== '/') {
            return client.navigate(url)
              .then((c) => c && 'focus' in c ? c.focus() : client.focus())
              .catch(() => client.focus())
          }
          return 'focus' in client ? client.focus() : null
        }
      }
      // Altrimenti apri una nuova finestra
      return clients.openWindow(url)
    })
  )
})

// Web Share Target: intercetta i PDF condivisi dall'utente
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.pathname === '/' && url.searchParams.has('share') && event.request.method === 'POST') {
    event.respondWith((async () => {
      const formData = await event.request.formData()
      const file = formData.get('file')
      if (file && file.type === 'application/pdf') {
        // Salva il PDF in cache temporanea per passarlo all'app
        const cache = await caches.open('bolly-shared-files')
        await cache.put('/shared-pdf', new Response(file, {
          headers: { 'Content-Type': 'application/pdf', 'X-Filename': file.name }
        }))
      }
      return Response.redirect('/?shared=1', 303)
    })())
    return
  }
})

// Installazione: forza l'attivazione immediata senza attendere la chiusura delle tab
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Attivazione: prende il controllo immediatamente
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})
