package com.taxidriverapp;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
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
    
    private CountDownTimer countDownTimer;
    private Vibrator vibrator;
    private String tripId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Log.d(TAG, "🚕 TripRequestActivity onCreate");

        // Mostrar sobre pantalla de bloqueo
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

        // Obtener datos del intent
        Intent intent = getIntent();
        tripId = intent.getStringExtra("tripId");
        String user = intent.getStringExtra("user");
        String phone = intent.getStringExtra("phone");
        String pickup = intent.getStringExtra("pickup");
        String destination = intent.getStringExtra("destination");
        String price = intent.getStringExtra("estimatedPrice");
        String distance = intent.getStringExtra("distance");
        String paymentMethod = intent.getStringExtra("paymentMethod");

        // Crear UI programáticamente
        LinearLayout mainLayout = new LinearLayout(this);
        mainLayout.setOrientation(LinearLayout.VERTICAL);
        mainLayout.setBackgroundColor(Color.parseColor("#1a1a2e"));
        mainLayout.setGravity(Gravity.CENTER);
        mainLayout.setPadding(50, 100, 50, 100);

        // Título
        TextView titleText = new TextView(this);
        titleText.setText("🚕 NUEVO SERVICIO");
        titleText.setTextSize(28);
        titleText.setTextColor(Color.WHITE);
        titleText.setGravity(Gravity.CENTER);
        titleText.setPadding(0, 0, 0, 50);
        mainLayout.addView(titleText);

        // Pasajero
        TextView userText = new TextView(this);
        userText.setText("👤 " + (user != null ? user : "Pasajero"));
        userText.setTextSize(22);
        userText.setTextColor(Color.WHITE);
        userText.setGravity(Gravity.CENTER);
        userText.setPadding(0, 20, 0, 20);
        mainLayout.addView(userText);

        // Origen
        TextView pickupText = new TextView(this);
        pickupText.setText("📍 " + (pickup != null ? pickup : "Origen"));
        pickupText.setTextSize(16);
        pickupText.setTextColor(Color.parseColor("#aaaaaa"));
        pickupText.setGravity(Gravity.CENTER);
        pickupText.setPadding(0, 10, 0, 10);
        mainLayout.addView(pickupText);

        // Destino
        TextView destText = new TextView(this);
        destText.setText("🎯 " + (destination != null ? destination : "Destino"));
        destText.setTextSize(16);
        destText.setTextColor(Color.parseColor("#aaaaaa"));
        destText.setGravity(Gravity.CENTER);
        destText.setPadding(0, 10, 0, 30);
        mainLayout.addView(destText);

        // Precio
        TextView priceText = new TextView(this);
        priceText.setText("💰 RD$" + (price != null ? price : "0"));
        priceText.setTextSize(36);
        priceText.setTextColor(Color.parseColor("#4ade80"));
        priceText.setGravity(Gravity.CENTER);
        priceText.setPadding(0, 20, 0, 20);
        mainLayout.addView(priceText);

        // Método de pago
        TextView paymentText = new TextView(this);
        String paymentDisplay = "cash".equals(paymentMethod) ? "💵 Efectivo" : "💳 Tarjeta";
        paymentText.setText(paymentDisplay);
        paymentText.setTextSize(18);
        paymentText.setTextColor(Color.WHITE);
        paymentText.setGravity(Gravity.CENTER);
        paymentText.setPadding(0, 10, 0, 40);
        mainLayout.addView(paymentText);

        // Timer
        TextView timerText = new TextView(this);
        timerText.setText("⏱️ 20s");
        timerText.setTextSize(20);
        timerText.setTextColor(Color.parseColor("#fbbf24"));
        timerText.setGravity(Gravity.CENTER);
        timerText.setPadding(0, 20, 0, 40);
        mainLayout.addView(timerText);

        // Progress Bar
        ProgressBar progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgress(100);
        LinearLayout.LayoutParams progressParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 20);
        progressParams.setMargins(0, 0, 0, 50);
        progressBar.setLayoutParams(progressParams);
        mainLayout.addView(progressBar);

        // Contenedor de botones
        LinearLayout buttonLayout = new LinearLayout(this);
        buttonLayout.setOrientation(LinearLayout.HORIZONTAL);
        buttonLayout.setGravity(Gravity.CENTER);
        buttonLayout.setPadding(0, 30, 0, 0);

        // Botón Rechazar
        Button rejectButton = new Button(this);
        rejectButton.setText("❌ RECHAZAR");
        rejectButton.setTextSize(16);
        rejectButton.setTextColor(Color.WHITE);
        rejectButton.setBackgroundColor(Color.parseColor("#ef4444"));
        rejectButton.setPadding(60, 40, 60, 40);
        LinearLayout.LayoutParams rejectParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        rejectParams.setMargins(20, 0, 20, 0);
        rejectButton.setLayoutParams(rejectParams);
        rejectButton.setOnClickListener(v -> rejectTrip());
        buttonLayout.addView(rejectButton);

        // Botón Aceptar
        Button acceptButton = new Button(this);
        acceptButton.setText("✅ ACEPTAR");
        acceptButton.setTextSize(16);
        acceptButton.setTextColor(Color.WHITE);
        acceptButton.setBackgroundColor(Color.parseColor("#22c55e"));
        acceptButton.setPadding(60, 40, 60, 40);
        LinearLayout.LayoutParams acceptParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        acceptParams.setMargins(20, 0, 20, 0);
        acceptButton.setLayoutParams(acceptParams);
        acceptButton.setOnClickListener(v -> acceptTrip());
        buttonLayout.addView(acceptButton);

        mainLayout.addView(buttonLayout);
        setContentView(mainLayout);

        // Iniciar vibración
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        long[] pattern = {0, 1000, 500, 1000, 500, 1000};
        vibrator.vibrate(pattern, 0);

        // Iniciar countdown
        countDownTimer = new CountDownTimer(20000, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
                int seconds = (int) (millisUntilFinished / 1000);
                timerText.setText("⏱️ " + seconds + "s");
                progressBar.setProgress((int) ((millisUntilFinished / 20000.0) * 100));
            }

            @Override
            public void onFinish() {
                rejectTrip();
            }
        }.start();

        Log.d(TAG, "✅ UI creada - Trip ID: " + tripId);
    }

    private void acceptTrip() {
        Log.d(TAG, "✅ Viaje aceptado: " + tripId);
        cleanup();
        
        // Guardar datos del viaje para que React Native los lea
        TripIntentModule.savePendingTrip(
            this,
            tripId,
            getIntent().getStringExtra("user"),
            getIntent().getStringExtra("phone"),
            getIntent().getStringExtra("pickup"),
            getIntent().getStringExtra("destination"),
            getIntent().getStringExtra("estimatedPrice"),
            getIntent().getStringExtra("distance"),
            getIntent().getStringExtra("paymentMethod"),
            getIntent().getStringExtra("pickupLat"),
            getIntent().getStringExtra("pickupLng"),
            getIntent().getStringExtra("destinationLat"),
            getIntent().getStringExtra("destinationLng")
        );
        
        // Abrir MainActivity
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        finish();
    }

    private void rejectTrip() {
        Log.d(TAG, "❌ Viaje rechazado: " + tripId);
        cleanup();
        finish();
    }

    private void cleanup() {
        if (countDownTimer != null) {
            countDownTimer.cancel();
        }
        if (vibrator != null) {
            vibrator.cancel();
        }
        // Cancelar notificación
        NotificationManager notificationManager = 
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.cancel(NOTIFICATION_ID);
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