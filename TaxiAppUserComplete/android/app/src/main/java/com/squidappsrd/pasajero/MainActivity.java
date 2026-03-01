package com.squidappsrd.pasajero;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class MainActivity extends ReactActivity {
    private static final String TAG = "MainActivity";
    private boolean pendingOpenChat = false;
    private String pendingTripId = null;

    @Override
    protected String getMainComponentName() {
        return "TaxiAppUserComplete";
    }

    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new DefaultReactActivityDelegate(
            this,
            getMainComponentName(),
            DefaultNewArchitectureEntryPoint.getFabricEnabled()
        );
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && intent.getBooleanExtra("openChat", false)) {
            String tripId = intent.getStringExtra("tripId");
            Log.d(TAG, "Intent openChat recibido, tripId: " + tripId);
            
            pendingOpenChat = true;
            pendingTripId = tripId;
            
            sendOpenChatEvent();
        }
    }

    private void sendOpenChatEvent() {
        ReactContext reactContext = getReactInstanceManager().getCurrentReactContext();
        if (reactContext != null && pendingOpenChat) {
            Log.d(TAG, "Enviando evento OPEN_CHAT_FROM_NATIVE");
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("OPEN_CHAT_FROM_NATIVE", pendingTripId);
            pendingOpenChat = false;
            pendingTripId = null;
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (pendingOpenChat) {
            new android.os.Handler().postDelayed(this::sendOpenChatEvent, 1000);
        }
    }
}