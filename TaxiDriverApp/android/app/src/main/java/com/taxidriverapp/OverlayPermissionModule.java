package com.taxidriverapp;

import android.app.Activity;
import android.content.Intent;

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