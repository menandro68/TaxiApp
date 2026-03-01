package com.taxiappusercomplete;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.util.Log;

public class ChatAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "ChatAlarmReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "Alarm recibida - lanzando ChatActivity");
        
        // Despertar pantalla
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = pm.newWakeLock(
            PowerManager.FULL_WAKE_LOCK |
            PowerManager.ACQUIRE_CAUSES_WAKEUP |
            PowerManager.ON_AFTER_RELEASE,
            "TaxiUserApp:ChatAlarm"
        );
        wakeLock.acquire(30000);
        
        // Lanzar ChatActivity
        Intent chatIntent = new Intent(context, ChatActivity.class);
        chatIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | 
                           Intent.FLAG_ACTIVITY_CLEAR_TOP |
                           Intent.FLAG_ACTIVITY_SINGLE_TOP |
                           Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        chatIntent.putExtra("tripId", intent.getStringExtra("tripId"));
        chatIntent.putExtra("message", intent.getStringExtra("message"));
        
        try {
            context.startActivity(chatIntent);
            Log.d(TAG, "ChatActivity lanzada desde BroadcastReceiver");
        } catch (Exception e) {
            Log.e(TAG, "Error lanzando ChatActivity: " + e.getMessage());
        }
    }
}