self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'EudaChat', body: 'New activity' }
  event.waitUntil(self.registration.showNotification(data.title || 'EudaChat', {
    body: data.body || '',
    data: data.url || '/'
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data || '/'))
})
