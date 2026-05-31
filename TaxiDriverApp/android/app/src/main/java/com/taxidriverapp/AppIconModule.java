package com.taxidriverapp;

import android.app.ActivityManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class AppIconModule extends ReactContextBaseJavaModule {

    private static final String MAIN_ACTIVITY = "com.taxidriverapp.MainActivity";

    public AppIconModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "AppIconModule";
    }

    @ReactMethod
    public void hideIcon(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            PackageManager pm = context.getPackageManager();
            ComponentName main = new ComponentName(context, MAIN_ACTIVITY);

            pm.setComponentEnabledSetting(
                main,
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP
            );

            // Forzar refresh del launcher
            Intent refreshIntent = new Intent(Intent.ACTION_MAIN);
            refreshIntent.addCategory(Intent.CATEGORY_HOME);
            refreshIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(refreshIntent);

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("HIDE_ICON_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void showIcon(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            PackageManager pm = context.getPackageManager();
            ComponentName main = new ComponentName(context, MAIN_ACTIVITY);

            pm.setComponentEnabledSetting(
                main,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            );

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SHOW_ICON_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void exitApp() {
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try {
                if (getCurrentActivity() != null) {
                    getCurrentActivity().finishAffinity();
                }
                ActivityManager am = (ActivityManager) getReactApplicationContext().getSystemService(Context.ACTIVITY_SERVICE);
                if (am != null) {
                    am.killBackgroundProcesses(getReactApplicationContext().getPackageName());
                }
                android.os.Process.killProcess(android.os.Process.myPid());
            } catch (Exception e) {
                // silent
            }
        }, 500);
    }
}