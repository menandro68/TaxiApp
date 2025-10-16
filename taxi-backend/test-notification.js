const NotificationService = require('./services/notificationService');

// Probar crear una notificación
NotificationService.notifyDriverApproval(2, 'Carlos Rodriguez')
    .then(() => {
        console.log('✅ Notificación creada exitosamente');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });