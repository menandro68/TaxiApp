package com.taxidriverapp;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

public class TripDataStore {
    private static final String TAG = "TripDataStore";
    private static final String PREFS_NAME = "trip_request_data";
    
    public static void saveTripData(Context context, 
                                    String tripId,
                                    String user,
                                    String phone,
                                    String pickup,
                                    String destination,
                                    String estimatedPrice,
                                    String distance,
                                    String paymentMethod,
                                    String pickupLat,
                                    String pickupLng,
                                    String destinationLat,
                                    String destinationLng,
                                    String vehicleType) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            
            editor.putString("tripId", tripId);
            editor.putString("user", user);
            editor.putString("phone", phone);
            editor.putString("pickup", pickup);
            editor.putString("destination", destination);
            editor.putString("estimatedPrice", estimatedPrice);
            editor.putString("distance", distance);
            editor.putString("paymentMethod", paymentMethod);
            editor.putString("pickupLat", pickupLat);
            editor.putString("pickupLng", pickupLng);
            editor.putString("destinationLat", destinationLat);
            editor.putString("destinationLng", destinationLng);
            editor.putString("vehicleType", vehicleType);
            editor.putLong("timestamp", System.currentTimeMillis());
            
            editor.apply();
            
            Log.d(TAG, "✅ Datos guardados - tripId: " + tripId + ", pickup: " + pickup);
        } catch (Exception e) {
            Log.e(TAG, "❌ Error guardando: " + e.getMessage());
        }
    }
    
    public static String getValue(Context context, String intentValue, String key) {
        if (intentValue != null && !intentValue.isEmpty()) {
            return intentValue;
        }
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String value = prefs.getString(key, null);
            if (value != null) {
                Log.d(TAG, "📦 Recuperado " + key + ": " + value);
            }
            return value;
        } catch (Exception e) {
            return null;
        }
    }
    
    public static String getTripId(Context ctx, String val) { return getValue(ctx, val, "tripId"); }
    public static String getUser(Context ctx, String val) { return getValue(ctx, val, "user"); }
    public static String getPhone(Context ctx, String val) { return getValue(ctx, val, "phone"); }
    public static String getPickup(Context ctx, String val) { return getValue(ctx, val, "pickup"); }
    public static String getDestination(Context ctx, String val) { return getValue(ctx, val, "destination"); }
    public static String getEstimatedPrice(Context ctx, String val) { return getValue(ctx, val, "estimatedPrice"); }
    public static String getDistance(Context ctx, String val) { return getValue(ctx, val, "distance"); }
    public static String getPaymentMethod(Context ctx, String val) { return getValue(ctx, val, "paymentMethod"); }
    public static String getPickupLat(Context ctx, String val) { return getValue(ctx, val, "pickupLat"); }
    public static String getPickupLng(Context ctx, String val) { return getValue(ctx, val, "pickupLng"); }
    public static String getDestinationLat(Context ctx, String val) { return getValue(ctx, val, "destinationLat"); }
    public static String getDestinationLng(Context ctx, String val) { return getValue(ctx, val, "destinationLng"); }
    public static String getVehicleType(Context ctx, String val) { return getValue(ctx, val, "vehicleType"); }
    
    public static void clear(Context context) {
        try {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply();
            Log.d(TAG, "🧹 Datos limpiados");
        } catch (Exception e) {
            Log.e(TAG, "❌ Error limpiando: " + e.getMessage());
        }
    }
}