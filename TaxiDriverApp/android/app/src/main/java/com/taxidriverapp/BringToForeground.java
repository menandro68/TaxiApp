package com.taxidriverapp;

import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class BringToForeground extends ReactContextBaseJavaModule {
    
    public BringToForeground(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "BringToForeground";
    }

    @ReactMethod
    public void bringAppToForeground() {
        Context context = getReactApplicationContext();
        
        // Encender pantalla si está apagada
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = pm.newWakeLock(
            PowerManager.FULL_WAKE_LOCK | 
            PowerManager.ACQUIRE_CAUSES_WAKEUP | 
            PowerManager.ON_AFTER_RELEASE, 
            "TaxiDriverApp:WakeLock"
        );
        wakeLock.acquire(10000);

        // Traer app al frente
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        intent.addFlags(Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        context.startActivity(intent);
        
        // Liberar WakeLock después de un momento
        wakeLock.release();
    }
}