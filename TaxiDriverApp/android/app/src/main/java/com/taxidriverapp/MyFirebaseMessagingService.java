package com.taxidriverapp;

import android.app.ActivityManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.List;
import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "TaxiDriverFCM";
    private static final String CHANNEL_ID = "trip_requests_channel";
    private static final int NOTIFICATION_ID = 1001;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        String type = data.get("type");

        Log.d(TAG, "📨 Mensaje FCM recibido, type: " + type);

        if ("trip_cancelled".equals(type)) {
            Log.d(TAG, "❌ Viaje cancelado por el usuario");
            handleTripCancellation(data);
            return;
        }

        if ("NEW_TRIP_REQUEST".equals(type)) {
            Log.d(TAG, "🚕 Nueva solicitud de viaje recibida");
            
            Log.d(TAG, "📦 Datos recibidos del FCM:");
            Log.d(TAG, "   tripId: " + data.get("tripId"));
            Log.d(TAG, "   user: " + data.get("user"));
            Log.d(TAG, "   pickup: " + data.get("pickup"));
            Log.d(TAG, "   destination: " + data.get("destination"));
            Log.d(TAG, "   estimatedPrice: " + data.get("estimatedPrice"));
            
            // IMPORTANTE: Guardar datos ANTES de mostrar la Activity
            TripDataStore.saveTripData(
                getApplicationContext(),
                data.get("tripId"),
                data.get("user"),
                data.get("phone"),
                data.get("pickup"),
                data.get("destination"),
                data.get("estimatedPrice"),
                data.get("distance"),
                data.get("paymentMethod"),
                data.get("pickupLat"),
                data.get("pickupLng"),
                data.get("destinationLat"),
                data.get("destinationLng"),
                data.get("vehicleType"),
                data.get("additionalStops")
            );
            
            showFullScreenNotification(data);
        }
    }

    private void showFullScreenNotification(Map<String, String> data) {
        try {
            if (isAppInForeground()) {
                Log.d(TAG, "📱 App en foreground - React Native manejará");
                return;
            }

            Log.d(TAG, "📱 App en background - Mostrando pantalla nativa");

            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            PowerManager.WakeLock wakeLock = pm.newWakeLock(
                PowerManager.FULL_WAKE_LOCK |
                PowerManager.ACQUIRE_CAUSES_WAKEUP |
                PowerManager.ON_AFTER_RELEASE,
                "TaxiDriverApp:TripWakeLock"
            );
            wakeLock.acquire(60000);

            createNotificationChannel();

            Intent fullScreenIntent = new Intent(this, TripRequestActivity.class);
            fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);

            fullScreenIntent.putExtra("tripId", data.get("tripId"));
            fullScreenIntent.putExtra("user", data.get("user"));
            fullScreenIntent.putExtra("phone", data.get("phone"));
            fullScreenIntent.putExtra("pickup", data.get("pickup"));
            fullScreenIntent.putExtra("destination", data.get("destination"));
            fullScreenIntent.putExtra("estimatedPrice", data.get("estimatedPrice"));
            fullScreenIntent.putExtra("distance", data.get("distance"));
            fullScreenIntent.putExtra("paymentMethod", data.get("paymentMethod"));
            fullScreenIntent.putExtra("vehicleType", data.get("vehicleType"));
            fullScreenIntent.putExtra("additionalStops", data.get("additionalStops"));
            fullScreenIntent.putExtra("pickupLat", data.get("pickupLat"));
            fullScreenIntent.putExtra("pickupLng", data.get("pickupLng"));
            fullScreenIntent.putExtra("destinationLat", data.get("destinationLat"));
            fullScreenIntent.putExtra("destinationLng", data.get("destinationLng"));

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(this, 0, fullScreenIntent, flags);

            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);

            String userName = data.get("user");
            if (userName == null || userName.isEmpty()) userName = "Pasajero";

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentTitle("🚕 Nuevo Servicio")
                .setContentText("Pasajero: " + userName)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setAutoCancel(true)
                .setOngoing(true)
                .setSound(soundUri)
                .setVibrate(new long[]{0, 1000, 500, 1000, 500, 1000})
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setTimeoutAfter(30000);

            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.notify(NOTIFICATION_ID, builder.build());

            Log.d(TAG, "✅ Full Screen Intent enviado");

            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                if (wakeLock.isHeld()) {
                    wakeLock.release();
                }
            }, 60000);

        } catch (Exception e) {
            Log.e(TAG, "❌ Error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void handleTripCancellation(Map<String, String> data) {
        TripDataStore.clear(getApplicationContext());
        
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.cancel(NOTIFICATION_ID);
        
        //showCancellationNotification(data);
    }

    private boolean isAppInForeground() {
        ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        List<ActivityManager.RunningAppProcessInfo> appProcesses = activityManager.getRunningAppProcesses();
        if (appProcesses == null) return false;

        String packageName = getPackageName();
        for (ActivityManager.RunningAppProcessInfo appProcess : appProcesses) {
            if (appProcess.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
                && appProcess.processName.equals(packageName)) {
                return true;
            }
        }
        return false;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();

            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Solicitudes de Viaje",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notificaciones de nuevas solicitudes de viaje");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 1000, 500, 1000, 500, 1000});
            channel.setSound(soundUri, audioAttributes);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            channel.setBypassDnd(true);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private void showCancellationNotification(Map<String, String> data) {
        try {
            String userName = data.get("userName");
            if (userName == null || userName.isEmpty()) userName = "El usuario";

            createNotificationChannel();

            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            
            PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, flags);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("❌ Viaje Cancelado")
                .setContentText(userName + " ha cancelado el viaje")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setVibrate(new long[]{0, 500, 200, 500});

            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.notify(NOTIFICATION_ID + 1, builder.build());

            Log.d(TAG, "✅ Notificación de cancelación enviada");
        } catch (Exception e) {
            Log.e(TAG, "❌ Error cancelación: " + e.getMessage());
        }
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "🔑 Nuevo token FCM: " + token);
    }
}
