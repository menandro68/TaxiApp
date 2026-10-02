package com.taxidriverapp;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class OverlayPermissionModule extends ReactContextBaseJavaModule {

    public OverlayPermissionModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "OverlayPermission";
    }

    @ReactMethod
    public void hasPermission(Promise promise) {
        try {
            boolean hasPermission = OverlayPermissionHelper.hasOverlayPermission(getReactApplicationContext());
            promise.resolve(hasPermission);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

      // Bateria sin restricciones: necesario para recibir viajes con pantalla apagada
    @ReactMethod
    public void bateriaSinRestricciones(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                promise.resolve(true);
                return;
            }
            Context ctx = getReactApplicationContext();
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            promise.resolve(pm.isIgnoringBatteryOptimizations(ctx.getPackageName()));
        } catch (Exception e) {
            promise.resolve(true);
        }
    }

    @ReactMethod
    public void pedirBateriaSinRestricciones(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                promise.resolve(true);
                return;
            }
            Activity activity = getCurrentActivity();
            if (activity == null) {
                promise.resolve(false);
                return;
            }
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getReactApplicationContext().getPackageName()));
            activity.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void requestPermission(Promise promise) {
        try {
            Activity activity = getCurrentActivity();
            if (activity != null) {
                Intent intent = OverlayPermissionHelper.getOverlayPermissionIntent(getReactApplicationContext());
                activity.startActivity(intent);
                promise.resolve(true);
            } else {
                promise.reject("ERROR", "Activity not available");
            }
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}