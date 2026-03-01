package com.taxiappusercomplete;

import android.app.KeyguardManager;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.graphics.Color;
import android.view.Gravity;
import android.util.TypedValue;

import androidx.appcompat.app.AppCompatActivity;

public class ChatActivity extends AppCompatActivity {
    private static final String TAG = "ChatActivity";
    private String tripId;
    private String message;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d(TAG, "ChatActivity onCreate");

        // Configurar para mostrar sobre lockscreen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            if (km != null) {
                km.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }

        // Obtener datos del intent
        tripId = getIntent().getStringExtra("tripId");
        message = getIntent().getStringExtra("message");
        Log.d(TAG, "tripId: " + tripId + ", message: " + message);

        // Crear UI programáticamente
        createUI();
    }

    private void createUI() {
        // Layout principal
        LinearLayout mainLayout = new LinearLayout(this);
        mainLayout.setOrientation(LinearLayout.VERTICAL);
        mainLayout.setBackgroundColor(Color.parseColor("#1a1a2e"));
        mainLayout.setGravity(Gravity.CENTER);
        mainLayout.setPadding(60, 100, 60, 100);

        // Icono/Título
        TextView titleText = new TextView(this);
        titleText.setText("\uD83D\uDE95 Mensaje del Conductor");
        titleText.setTextColor(Color.WHITE);
        titleText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 24);
        titleText.setGravity(Gravity.CENTER);
        titleText.setPadding(0, 0, 0, 40);
        mainLayout.addView(titleText);

        // Card para el mensaje
        LinearLayout cardLayout = new LinearLayout(this);
        cardLayout.setOrientation(LinearLayout.VERTICAL);
        cardLayout.setBackgroundColor(Color.parseColor("#16213e"));
        cardLayout.setPadding(40, 40, 40, 40);
        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        cardParams.setMargins(0, 0, 0, 60);
        cardLayout.setLayoutParams(cardParams);

        // Mensaje
        TextView messageText = new TextView(this);
        messageText.setText(message != null ? message : "Nuevo mensaje");
        messageText.setTextColor(Color.WHITE);
        messageText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        messageText.setGravity(Gravity.CENTER);
        messageText.setPadding(20, 30, 20, 30);
        cardLayout.addView(messageText);

        mainLayout.addView(cardLayout);

        // Texto de "Abriendo chat..."
        TextView loadingText = new TextView(this);
        loadingText.setText("Abriendo chat...");
        loadingText.setTextColor(Color.parseColor("#888888"));
        loadingText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        loadingText.setGravity(Gravity.CENTER);
        mainLayout.addView(loadingText);

        setContentView(mainLayout);

        // Abrir chat automáticamente después de 1.5 segundos
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            openMainApp();
        }, 1500);
    }

    private void openMainApp() {
        Log.d(TAG, "Abriendo MainActivity con chat");
        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        mainIntent.putExtra("openChat", true);
        mainIntent.putExtra("tripId", tripId);
        startActivity(mainIntent);
        finish();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        tripId = intent.getStringExtra("tripId");
        message = intent.getStringExtra("message");
        Log.d(TAG, "onNewIntent - tripId: " + tripId + ", message: " + message);
        createUI();
    }
}