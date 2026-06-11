// Service Worker - Push Notifications for new requests
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data;
    self.registration.showNotification(title, {
      body: body,
      icon: 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png',
      tag: tag || 'new-request',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      dir: 'rtl',
      lang: 'he',
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
