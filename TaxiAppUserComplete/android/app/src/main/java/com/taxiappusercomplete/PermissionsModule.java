package com.taxiappusercomplete;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class PermissionsModule extends ReactContextBaseJavaModule {
    private static final String TAG = "PermissionsModule";
    private final ReactApplicationContext reactContext;

    public PermissionsModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "PermissionsModule";
    }

    @ReactMethod
    public void canDrawOverlays(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                promise.resolve(Settings.canDrawOverlays(reactContext));
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void requestOverlayPermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + reactContext.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                
                // Verificar si hay actividad que pueda manejar el intent
                if (intent.resolveActivity(reactContext.getPackageManager()) != null) {
                    reactContext.startActivity(intent);
                } else {
                    // Fallback: abrir configuración general de la app
                    openAppSettings();
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error overlay permission: " + e.getMessage());
            // Fallback en caso de error
            try {
                openAppSettings();
            } catch (Exception e2) {
                Log.e(TAG, "Error fallback: " + e2.getMessage());
            }
        }
    }

    private void openAppSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + reactContext.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            reactContext.startActivity(intent);
        } catch (Exception e) {
            // Último fallback: configuración general
            Intent intent = new Intent(Settings.ACTION_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            reactContext.startActivity(intent);
        }
    }

    @ReactMethod
    public void canUseFullScreenIntent(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                NotificationManager nm = (NotificationManager) reactContext.getSystemService(Context.NOTIFICATION_SERVICE);
                promise.resolve(nm.canUseFullScreenIntent());
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void requestFullScreenIntentPermission() {
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
                    Uri.parse("package:" + reactContext.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                reactContext.startActivity(intent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error: " + e.getMessage());
        }
    }

    @ReactMethod
    public void isIgnoringBatteryOptimizations(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
                promise.resolve(pm.isIgnoringBatteryOptimizations(reactContext.getPackageName()));
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void requestBatteryOptimizationExemption() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
                if (!pm.isIgnoringBatteryOptimizations(reactContext.getPackageName())) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + reactContext.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    reactContext.startActivity(intent);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting battery exemption: " + e.getMessage());
        }
    }
}