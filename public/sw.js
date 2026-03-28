const CACHE_NAME = 'contigo-v1'

self.addEventListener('install', () => { self.skipWaiting() })

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', () => { return })

self.addEventListener('push', (event) => {
  if (!event.data) return
  
  let data = { title: 'Contigo', body: '' }
  try { data = event.data.json() } catch { data.body = event.data.text() }

  // Show system notification
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logoc.png',
      badge: '/logoc.png',
      tag: data.tag || 'contigo-reminder',
      vibrate: [200, 100, 200],
    }).then(() => {
      // Also send message to all open app windows to store in-app
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'PUSH_RECEIVED',
            title: data.title,
            body: data.body
          })
        })
      })
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) return clientList[0].focus()
      return clients.openWindow('/')
    })
  )
})