const CACHE_NAME = 'contigo-v2'

self.addEventListener('install', () => { self.skipWaiting() })

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', () => { return })

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = { title: 'Contigo', body: '' }
  try { data = event.data.json() } catch { data.body = event.data.text() }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logoc.png',
      badge: '/logoc.png',
      tag: data.tag || 'contigo-reminder',
      vibrate: [200, 100, 200],
    }).then(() => {
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => client.postMessage({
          type: 'PUSH_RECEIVED',
          title: data.title,
          body: data.body
        }))
      })
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      if (list.length > 0) return list[0].focus()
      return clients.openWindow('/')
    })
  )
})
