self.addEventListener('push', (event) => {
    const data = event.data.json();
    console.log("Push Received with data:", data); // Check your console!

    const options = {
        body: data.body,
        icon: 'https://cdn-icons-png.flaticon.com/512/1827/1827347.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/1827/1827347.png' // Status bar icon (monochrome)
        image: data.image, // This MUST match the key in your server.js payload
        badge: 'https://cdn-icons-png.flaticon.com/512/1827/1827347.png',
        vibrate: [100, 50, 100],
        data: {
            url: 'http://localhost:3000' 
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle the button clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Close the notification

    if (event.action === 'open_url') {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});
