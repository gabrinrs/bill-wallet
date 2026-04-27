// sw.js — Bolly Service Worker per Push Notifications

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
    data: { url: data.url || '/' }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('getbolly') && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})