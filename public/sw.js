// sw.js
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'FaithLy Notification';
      const options = {
        body: data.message || '',
        icon: '/logo192.png',
        badge: '/logo192.png',
        data: data.url || '/'
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      // Fallback for non-JSON payloads
      const title = 'FaithLy Notification';
      const options = {
        body: event.data.text(),
        icon: '/logo192.png',
        badge: '/logo192.png'
      };
      event.waitUntil(self.registration.showNotification(title, options));
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
