package com.taxiappusercomplete;

import android.app.KeyguardManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;
import android.view.WindowManager;

import androidx.core.app.NotificationCompat;

public class WakeScreenService extends Service {
    private static final String TAG = "WakeScreenService";
    private static final String CHANNEL_ID = "wake_service_channel";
    private PowerManager.WakeLock wakeLock;
    private String tripId;
    private String message;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "WakeScreenService iniciado");
        
        startForeground(9999, createNotification());
        
        tripId = intent != null ? intent.getStringExtra("tripId") : null;
        message = intent != null ? intent.getStringExtra("message") : null;
        
        // Despertar pantalla
        wakeScreen();
        
        // Desbloquear keyguard si es necesario
        dismissKeyguard();
        
        // Esperar un momento y luego lanzar la Activity
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            launchChatActivity();
            stopSelf();
        }, 500);
        
        return START_NOT_STICKY;
    }

    private void wakeScreen() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            wakeLock = pm.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "TaxiUserApp:WakeScreen"
            );
            wakeLock.acquire(60000);
            Log.d(TAG, "WakeLock adquirido - pantalla despertada");
        } catch (Exception e) {
            Log.e(TAG, "Error wakeScreen: " + e.getMessage());
        }
    }

    private void dismissKeyguard() {
        try {
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null && km.isKeyguardLocked()) {
                Log.d(TAG, "Keyguard detectado");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error dismissKeyguard: " + e.getMessage());
        }
    }

    private void launchChatActivity() {
        try {
            Log.d(TAG, "Lanzando ChatActivity...");
            
            Intent chatIntent = new Intent(this, ChatActivity.class);
            chatIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            chatIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            chatIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
            chatIntent.addFlags(Intent.FLAG_ACTIVITY_NO_USER_ACTION);
            chatIntent.putExtra("tripId", tripId);
            chatIntent.putExtra("message", message);
            chatIntent.putExtra("fromWakeService", true);
            
            startActivity(chatIntent);
            Log.d(TAG, "ChatActivity iniciada");
            
        } catch (Exception e) {
            Log.e(TAG, "Error launchChatActivity: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Mensajes", NotificationManager.IMPORTANCE_HIGH);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private Notification createNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Mensaje del Conductor")
            .setContentText(message != null ? message : "Nuevo mensaje")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        Log.d(TAG, "WakeScreenService destruido");
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d(TAG, "WakeLock liberado");
        }
        super.onDestroy();
    }
}