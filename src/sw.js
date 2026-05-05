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
      // Aggiunge badge numerico sull'icona della PWA
      if (navigator.setAppBadge) {
        return self.registration.getNotifications().then(notifications => {
          navigator.setAppBadge(notifications.length)
        })
      }
    })
  )
})

// Evento click sulla notifica: apre l'app e rimuove badge
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  // Rimuove o aggiorna il badge sull'icona
  if (navigator.setAppBadge) {
    self.registration.getNotifications().then(notifications => {
      if (notifications.length === 0) navigator.clearAppBadge()
      else navigator.setAppBadge(notifications.length)
    })
  }

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se l'app è già aperta, portala in primo piano
      for (const client of windowClients) {
        if (client.url.includes('getbolly') && 'focus' in client) {
          return client.focus()
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

// Attivazione: prende il controllo immediatamente
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})
