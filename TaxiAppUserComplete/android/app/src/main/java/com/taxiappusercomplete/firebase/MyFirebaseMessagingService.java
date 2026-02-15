package com.taxiappusercomplete.firebase;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import com.taxiappusercomplete.MainActivity;
import com.taxiappusercomplete.R;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "FCMService";
    private static final String CHANNEL_ID = "taxi_notifications";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "📨 Mensaje FCM recibido: " + remoteMessage.getFrom());

        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "📦 Datos del mensaje: " + remoteMessage.getData());
            handleDataMessage(remoteMessage);
        }

    if (remoteMessage.getNotification() != null) {
            Log.d(TAG, "🔔 Notificación: " + remoteMessage.getNotification().getBody());
            // No mostrar banner del sistema para DRIVER_ASSIGNED/DRIVER_ARRIVED
            // ya que la app lo maneja con su propia UI
            String dataType = remoteMessage.getData().get("type");
            if (!"DRIVER_ASSIGNED".equals(dataType) && !"DRIVER_ARRIVED".equals(dataType)) {
                showNotification(remoteMessage.getNotification().getTitle(),
                               remoteMessage.getNotification().getBody());
            }
        }
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "🔄 Nuevo FCM token: " + token);
        // Enviar token al servidor aquí
    }

    private void handleDataMessage(RemoteMessage remoteMessage) {
        String type = remoteMessage.getData().get("type");
        
        if ("trip_assigned".equals(type)) {
            Log.d(TAG, "🚗 Conductor asignado");
            showNotification("¡Conductor asignado!", 
                           "Tu conductor llegará pronto");
        }
    }

    private void showNotification(String title, String body) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, 
                                                              PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder notificationBuilder =
                new NotificationCompat.Builder(this, CHANNEL_ID)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle(title)
                        .setContentText(body)
                        .setAutoCancel(true)
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setContentIntent(pendingIntent);

        NotificationManager notificationManager = 
                (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        notificationManager.notify(0, notificationBuilder.build());
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "TaxiApp Notifications";
            String description = "Notificaciones de TaxiApp";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }
}