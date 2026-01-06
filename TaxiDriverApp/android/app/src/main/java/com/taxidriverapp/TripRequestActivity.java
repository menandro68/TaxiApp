package com.taxidriverapp;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.os.Vibrator;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

public class TripRequestActivity extends Activity {
    private static final String TAG = "TripRequestActivity";
    private static final int NOTIFICATION_ID = 1001;
    private static final int COUNTDOWN_SECONDS = 20;

    private CountDownTimer countDownTimer;
    private Vibrator vibrator;
    
    private String tripId;
    private String user;
    private String phone;
    private String pickup;
    private String destination;
    private String estimatedPrice;
    private String distance;
    private String paymentMethod;
    private String vehicleType;
    private String pickupLat;
    private String pickupLng;
    private String destinationLat;
    private String destinationLng;
    private String additionalStops;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Log.d(TAG, "🚕 TripRequestActivity onCreate");

        setupWindowFlags();
        loadTripData();
        logTripData();
        createUI();
        startVibration();
        startCountdown();

        Log.d(TAG, "✅ TripRequestActivity iniciada");
    }

    private void setupWindowFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }
    }

    private void loadTripData() {
        Intent intent = getIntent();
        
        // Usar TripDataStore - lee del Intent, si está vacío lee de SharedPreferences
        tripId = TripDataStore.getTripId(this, intent.getStringExtra("tripId"));
        user = TripDataStore.getUser(this, intent.getStringExtra("user"));
        phone = TripDataStore.getPhone(this, intent.getStringExtra("phone"));
        pickup = TripDataStore.getPickup(this, intent.getStringExtra("pickup"));
        destination = TripDataStore.getDestination(this, intent.getStringExtra("destination"));
        estimatedPrice = TripDataStore.getEstimatedPrice(this, intent.getStringExtra("estimatedPrice"));
        distance = TripDataStore.getDistance(this, intent.getStringExtra("distance"));
        paymentMethod = TripDataStore.getPaymentMethod(this, intent.getStringExtra("paymentMethod"));
        vehicleType = TripDataStore.getVehicleType(this, intent.getStringExtra("vehicleType"));
        pickupLat = TripDataStore.getPickupLat(this, intent.getStringExtra("pickupLat"));
        pickupLng = TripDataStore.getPickupLng(this, intent.getStringExtra("pickupLng"));
        destinationLat = TripDataStore.getDestinationLat(this, intent.getStringExtra("destinationLat"));
        destinationLng = TripDataStore.getDestinationLng(this, intent.getStringExtra("destinationLng"));
        additionalStops = TripDataStore.getAdditionalStops(this, intent.getStringExtra("additionalStops"));
        
        // Valores por defecto
        if (user == null || user.isEmpty()) user = "Pasajero";
        if (pickup == null || pickup.isEmpty()) pickup = "Ubicación de recogida";
        if (destination == null || destination.isEmpty()) destination = "Destino";
        if (estimatedPrice == null || estimatedPrice.isEmpty()) estimatedPrice = "0";
        if (paymentMethod == null || paymentMethod.isEmpty()) paymentMethod = "cash";
    }

    private void logTripData() {
        Log.d(TAG, "📦 Datos cargados:");
        Log.d(TAG, "   tripId: " + tripId);
        Log.d(TAG, "   user: " + user);
        Log.d(TAG, "   pickup: " + pickup);
        Log.d(TAG, "   destination: " + destination);
        Log.d(TAG, "   price: " + estimatedPrice);
    }

    private void createUI() {
        LinearLayout mainLayout = new LinearLayout(this);
        mainLayout.setOrientation(LinearLayout.VERTICAL);
        mainLayout.setBackgroundColor(Color.parseColor("#1a1a2e"));
        mainLayout.setGravity(Gravity.CENTER);
        mainLayout.setPadding(50, 80, 50, 80);

        // Título
        TextView titleText = new TextView(this);
        titleText.setText("🚕 NUEVO SERVICIO");
        titleText.setTextSize(28);
        titleText.setTextColor(Color.WHITE);
        titleText.setGravity(Gravity.CENTER);
        titleText.setPadding(0, 0, 0, 40);
        mainLayout.addView(titleText);

        // Pasajero
        TextView userText = new TextView(this);
        userText.setText("👤 " + user);
        userText.setTextSize(24);
        userText.setTextColor(Color.WHITE);
        userText.setGravity(Gravity.CENTER);
        userText.setPadding(0, 20, 0, 15);
        mainLayout.addView(userText);

        // Pickup
        TextView pickupText = new TextView(this);
        pickupText.setText("📍 " + pickup);
        pickupText.setTextSize(16);
        pickupText.setTextColor(Color.parseColor("#b0b0b0"));
        pickupText.setGravity(Gravity.CENTER);
        pickupText.setPadding(20, 10, 20, 10);
        mainLayout.addView(pickupText);

        // Destino
        TextView destText = new TextView(this);
        destText.setText("🎯 " + destination);
        destText.setTextSize(16);
        destText.setTextColor(Color.parseColor("#b0b0b0"));
        destText.setGravity(Gravity.CENTER);
        destText.setPadding(20, 10, 20, 30);
        mainLayout.addView(destText);

        // Paradas adicionales
        if (additionalStops != null && !additionalStops.isEmpty() && !additionalStops.equals("[]")) {
            try {
                org.json.JSONArray stopsArray = new org.json.JSONArray(additionalStops);
                for (int i = 0; i < stopsArray.length(); i++) {
                    String stop = stopsArray.getString(i);
                    TextView stopText = new TextView(this);
                    stopText.setText("\uD83D\uDEA9 Parada " + (i + 1) + ": " + stop);
                    stopText.setTextSize(14);
                    stopText.setTextColor(Color.parseColor("#fbbf24"));
                    stopText.setGravity(Gravity.CENTER);
                    stopText.setPadding(20, 5, 20, 5);
                    mainLayout.addView(stopText);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error parsing additionalStops: " + e.getMessage());
            }
        }

        // Precio
        TextView priceText = new TextView(this);
        priceText.setText("💰 RD$" + estimatedPrice);
        priceText.setTextSize(38);
        priceText.setTextColor(Color.parseColor("#4ade80"));
        priceText.setGravity(Gravity.CENTER);
        priceText.setPadding(0, 20, 0, 15);
        mainLayout.addView(priceText);

        // Método de pago
        TextView paymentText = new TextView(this);
        String paymentDisplay = "cash".equals(paymentMethod) ? "💵 Efectivo" : "💳 Tarjeta";
        paymentText.setText(paymentDisplay);
        paymentText.setTextSize(18);
        paymentText.setTextColor(Color.WHITE);
        paymentText.setGravity(Gravity.CENTER);
        paymentText.setPadding(0, 10, 0, 30);
        mainLayout.addView(paymentText);

        // Timer
        final TextView timerText = new TextView(this);
        timerText.setText("⏱️ " + COUNTDOWN_SECONDS + "s");
        timerText.setTextSize(22);
        timerText.setTextColor(Color.parseColor("#fbbf24"));
        timerText.setGravity(Gravity.CENTER);
        timerText.setPadding(0, 20, 0, 15);
        timerText.setTag("timer");
        mainLayout.addView(timerText);

        // Progress Bar
        final ProgressBar progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgress(100);
        progressBar.setTag("progress");
        LinearLayout.LayoutParams progressParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 24);
        progressParams.setMargins(0, 10, 0, 40);
        progressBar.setLayoutParams(progressParams);
        mainLayout.addView(progressBar);

        // Botones
        LinearLayout buttonLayout = new LinearLayout(this);
        buttonLayout.setOrientation(LinearLayout.HORIZONTAL);
        buttonLayout.setGravity(Gravity.CENTER);
        buttonLayout.setPadding(0, 20, 0, 0);

        // Botón Rechazar
        Button rejectButton = new Button(this);
        rejectButton.setText("❌ RECHAZAR");
        rejectButton.setTextSize(16);
        rejectButton.setTextColor(Color.WHITE);
        rejectButton.setBackgroundColor(Color.parseColor("#ef4444"));
        rejectButton.setPadding(50, 35, 50, 35);
        rejectButton.setOnClickListener(v -> rejectTrip());
        LinearLayout.LayoutParams rejectParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        rejectParams.setMargins(10, 0, 10, 0);
        rejectButton.setLayoutParams(rejectParams);
        buttonLayout.addView(rejectButton);

        // Botón Aceptar
        Button acceptButton = new Button(this);
        acceptButton.setText("✅ ACEPTAR");
        acceptButton.setTextSize(16);
        acceptButton.setTextColor(Color.WHITE);
        acceptButton.setBackgroundColor(Color.parseColor("#22c55e"));
        acceptButton.setPadding(50, 35, 50, 35);
        acceptButton.setOnClickListener(v -> acceptTrip());
        LinearLayout.LayoutParams acceptParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        acceptParams.setMargins(10, 0, 10, 0);
        acceptButton.setLayoutParams(acceptParams);
        buttonLayout.addView(acceptButton);

        mainLayout.addView(buttonLayout);
        setContentView(mainLayout);
    }

    private void startVibration() {
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            long[] pattern = {0, 1000, 500, 1000, 500, 1000};
            vibrator.vibrate(pattern, 0);
        }
    }

    private void startCountdown() {
        final View rootView = getWindow().getDecorView().getRootView();
        
        countDownTimer = new CountDownTimer(COUNTDOWN_SECONDS * 1000, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
                int seconds = (int) (millisUntilFinished / 1000);
                
                TextView timerText = rootView.findViewWithTag("timer");
                if (timerText != null) {
                    timerText.setText("⏱️ " + seconds + "s");
                }
                
                ProgressBar progressBar = rootView.findViewWithTag("progress");
                if (progressBar != null) {
                    int progress = (int) ((millisUntilFinished / (float)(COUNTDOWN_SECONDS * 1000)) * 100);
                    progressBar.setProgress(progress);
                }
            }

            @Override
            public void onFinish() {
                Log.d(TAG, "⏱️ Tiempo agotado");
                rejectTrip();
            }
        }.start();
    }

    private void acceptTrip() {
        Log.d(TAG, "✅ Viaje aceptado: " + tripId);
        cleanup();

        TripIntentModule.savePendingTrip(
            this, tripId, user, phone, pickup, destination,
            estimatedPrice, distance, paymentMethod,
            pickupLat, pickupLng, destinationLat, destinationLng, additionalStops
        );

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("tripAccepted", true);
        intent.putExtra("tripId", tripId);
        startActivity(intent);
        finish();
    }

    private void rejectTrip() {
        Log.d(TAG, "❌ Viaje rechazado: " + tripId);
        cleanup();
        TripDataStore.clear(this);
        finish();
    }

    private void cleanup() {
        if (countDownTimer != null) {
            countDownTimer.cancel();
            countDownTimer = null;
        }
        if (vibrator != null) {
            vibrator.cancel();
            vibrator = null;
        }
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.cancel(NOTIFICATION_ID);
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        cleanup();
    }

    @Override
    public void onBackPressed() {
        // No permitir cerrar con back
    }
}
