package com.taxidriverapp;

import android.content.Context;
import android.content.SharedPreferences;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class TripIntentModule extends ReactContextBaseJavaModule {
    private static final String PREFS_NAME = "TripIntentPrefs";

    public TripIntentModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "TripIntent";
    }

    @ReactMethod
    public void getPendingTrip(Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            
            boolean hasPending = prefs.getBoolean("hasPendingTrip", false);
            
            if (hasPending) {
                WritableMap tripData = Arguments.createMap();
                tripData.putString("tripId", prefs.getString("tripId", ""));
                tripData.putString("user", prefs.getString("user", ""));
                tripData.putString("phone", prefs.getString("phone", ""));
                tripData.putString("pickup", prefs.getString("pickup", ""));
                tripData.putString("destination", prefs.getString("destination", ""));
                tripData.putString("estimatedPrice", prefs.getString("estimatedPrice", ""));
                tripData.putString("distance", prefs.getString("distance", ""));
                tripData.putString("paymentMethod", prefs.getString("paymentMethod", ""));
                tripData.putString("pickupLat", prefs.getString("pickupLat", ""));
                tripData.putString("pickupLng", prefs.getString("pickupLng", ""));
                tripData.putString("destinationLat", prefs.getString("destinationLat", ""));
                tripData.putString("destinationLng", prefs.getString("destinationLng", ""));
                
                // Limpiar después de leer
                prefs.edit().clear().apply();
                
                promise.resolve(tripData);
            } else {
                promise.resolve(null);
            }
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    // Método estático para guardar desde TripRequestActivity
    public static void savePendingTrip(Context context, String tripId, String user, 
            String phone, String pickup, String destination, String estimatedPrice,
            String distance, String paymentMethod, String pickupLat, String pickupLng,
            String destinationLat, String destinationLng) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putBoolean("hasPendingTrip", true)
            .putString("tripId", tripId)
            .putString("user", user)
            .putString("phone", phone)
            .putString("pickup", pickup)
            .putString("destination", destination)
            .putString("estimatedPrice", estimatedPrice)
            .putString("distance", distance)
            .putString("paymentMethod", paymentMethod)
            .putString("pickupLat", pickupLat)
            .putString("pickupLng", pickupLng)
            .putString("destinationLat", destinationLat)
            .putString("destinationLng", destinationLng)
            .apply();
    }
}