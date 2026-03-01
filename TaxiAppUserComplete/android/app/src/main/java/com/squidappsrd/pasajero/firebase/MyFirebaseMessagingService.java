package com.squidappsrd.pasajero.firebase;

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
import com.squidappsrd.pasajero.ChatActivity;
import com.squidappsrd.pasajero.MainActivity;

import java.util.List;
import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "TaxiUserFCM";
    private static final String CHANNEL_ID = "chat_messages_channel";
    private static final int NOTIFICATION_ID = 2001;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        String type = data.get("type");

        Log.d(TAG, "📨 Mensaje FCM recibido, type: " + type);

        if ("NEW_CHAT_MESSAGE".equals(type)) {
            Log.d(TAG, "💬 Nuevo mensaje de chat recibido");
            
            if (!isAppInForeground()) {
                Log.d(TAG, "📱 App en background - Mostrando pantalla de chat");
                showChatFullScreen(data);
            } else {
                Log.d(TAG, "📱 App en foreground - React Native manejará");
            }
        }
    }

    private void showChatFullScreen(Map<String, String> data) {
        try {
            // Despertar pantalla
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            PowerManager.WakeLock wakeLock = pm.newWakeLock(
                PowerManager.FULL_WAKE_LOCK |
                PowerManager.ACQUIRE_CAUSES_WAKEUP |
                PowerManager.ON_AFTER_RELEASE,
                "TaxiUserApp:ChatWakeLock"
            );
            wakeLock.acquire(60000);

            createNotificationChannel();

            // Intent para abrir la Activity de chat
            Intent fullScreenIntent = new Intent(this, ChatActivity.class);
            fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);

            fullScreenIntent.putExtra("tripId", data.get("tripId"));
            fullScreenIntent.putExtra("message", data.get("message"));
            fullScreenIntent.putExtra("senderType", data.get("senderType"));

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(this, 0, fullScreenIntent, flags);

            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_email)
                .setContentTitle("💬 Mensaje del Conductor")
                .setContentText(data.get("message"))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setAutoCancel(true)
                .setSound(soundUri)
                .setVibrate(new long[]{0, 500, 200, 500})
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.notify(NOTIFICATION_ID, builder.build());

            Log.d(TAG, "✅ Full Screen Intent para chat enviado");

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
            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();

            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Mensajes de Chat",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notificaciones de mensajes del conductor");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});
            channel.setSound(soundUri, audioAttributes);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            channel.setBypassDnd(true);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "🔑 Nuevo token FCM: " + token);
    }
}
