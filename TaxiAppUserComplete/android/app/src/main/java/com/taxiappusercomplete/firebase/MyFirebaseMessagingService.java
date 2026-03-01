package com.taxiappusercomplete.firebase;

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
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import com.taxiappusercomplete.MainActivity;
import com.taxiappusercomplete.ChatActivity;
import com.taxiappusercomplete.WakeScreenService;
import com.taxiappusercomplete.R;

import java.util.List;
import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "FCMService";
    private static final String CHANNEL_ID = "taxi_notifications";
    private static final String CHAT_CHANNEL_ID = "chat_urgent_channel";
    private static final int CHAT_NOTIFICATION_ID = 2001;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        createChatNotificationChannel();
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "Mensaje FCM recibido");

        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Datos: " + remoteMessage.getData());
            
            String type = remoteMessage.getData().get("type");
            
            if ("NEW_CHAT_MESSAGE".equals(type)) {
                Log.d(TAG, "Nuevo mensaje de chat");
                
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                boolean isScreenOn = pm.isInteractive();
                Log.d(TAG, "Pantalla encendida: " + isScreenOn);
                
                if (!isScreenOn || !isAppInForeground()) {
                    Log.d(TAG, "Iniciando WakeScreenService");
                    startWakeService(remoteMessage.getData());
                } else {
                    Log.d(TAG, "App en foreground");
                }
                return;
            }
            
            handleDataMessage(remoteMessage);
        }

        if (remoteMessage.getNotification() != null) {
            String dataType = remoteMessage.getData().get("type");
            if (!"DRIVER_ASSIGNED".equals(dataType) && !"DRIVER_ARRIVED".equals(dataType)) {
                showNotification(remoteMessage.getNotification().getTitle(),
                               remoteMessage.getNotification().getBody());
            }
        }
    }

    private void startWakeService(Map<String, String> data) {
        try {
            // Método 1: WakeScreenService (funciona en la mayoría de dispositivos)
            Intent serviceIntent = new Intent(this, WakeScreenService.class);
            serviceIntent.putExtra("tripId", data.get("tripId"));
            serviceIntent.putExtra("message", data.get("message"));
            serviceIntent.putExtra("senderType", data.get("senderType"));

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
            Log.d(TAG, "WakeScreenService iniciado");

            // Método 2: Full Screen Intent (fallback universal para Samsung y otros)
            showFullScreenNotification(data);

        } catch (Exception e) {
            Log.e(TAG, "Error iniciando servicio: " + e.getMessage());
            // Si falla el servicio, usar solo la notificación
            showFullScreenNotification(data);
        }
    }

    private void showFullScreenNotification(Map<String, String> data) {
        try {
            Intent chatIntent = new Intent(this, ChatActivity.class);
            chatIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            chatIntent.putExtra("tripId", data.get("tripId"));
            chatIntent.putExtra("message", data.get("message"));
            chatIntent.putExtra("fromNotification", true);

            PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                this, 1, chatIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            PendingIntent contentIntent = PendingIntent.getActivity(
                this, 2, chatIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHAT_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("💬 Mensaje del Conductor")
                .setContentText(data.get("message"))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setContentIntent(contentIntent)
                .setAutoCancel(true)
                .setSound(soundUri)
                .setVibrate(new long[]{0, 500, 200, 500, 200, 500})
                .setOngoing(false);

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            nm.notify(CHAT_NOTIFICATION_ID, builder.build());
            Log.d(TAG, "FullScreenNotification mostrada");

        } catch (Exception e) {
            Log.e(TAG, "Error showFullScreenNotification: " + e.getMessage());
        }
    }

    private void showChatNotification(Map<String, String> data) {
        try {
            Intent intent = new Intent(this, ChatActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            intent.putExtra("tripId", data.get("tripId"));

            PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHAT_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Mensaje del Conductor")
                .setContentText(data.get("message"))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setSound(soundUri)
                .setVibrate(new long[]{0, 500, 200, 500});

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            nm.notify(CHAT_NOTIFICATION_ID, builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Error: " + e.getMessage());
        }
    }

    private boolean isAppInForeground() {
        ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        List<ActivityManager.RunningAppProcessInfo> processes = am.getRunningAppProcesses();
        if (processes == null) return false;
        for (ActivityManager.RunningAppProcessInfo p : processes) {
            if (p.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
                && p.processName.equals(getPackageName())) {
                return true;
            }
        }
        return false;
    }

    private void createChatNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHAT_CHANNEL_ID, "Mensajes Chat", NotificationManager.IMPORTANCE_HIGH);
            channel.enableVibration(true);
            channel.setBypassDnd(true);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "Nuevo token: " + token);
    }

    private void handleDataMessage(RemoteMessage remoteMessage) {
        String type = remoteMessage.getData().get("type");
        if ("trip_assigned".equals(type)) {
            showNotification("Conductor asignado!", "Tu conductor llegara pronto");
        }
    }

    private void showNotification(String title, String body) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent);

        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        nm.notify(0, builder.build());
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "TaxiApp", NotificationManager.IMPORTANCE_HIGH);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }
}