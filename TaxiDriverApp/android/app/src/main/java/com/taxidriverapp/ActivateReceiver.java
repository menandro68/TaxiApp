package com.taxidriverapp;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;

public class ActivateReceiver extends Activity {

    private static final String MAIN_ACTIVITY = "com.taxidriverapp.MainActivity";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            // 1. Reactivar el componente MainActivity (mostrar icono en launcher)
            PackageManager pm = getPackageManager();
            ComponentName main = new ComponentName(this, MAIN_ACTIVITY);
            pm.setComponentEnabledSetting(
                main,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            );

            // 2. Capturar driverId del deep link
            String driverId = "";
            Uri data = getIntent().getData();
            if (data != null) {
                driverId = data.getQueryParameter("driverId");
                if (driverId == null) driverId = "";
            }

            // 3. Abrir MainActivity directamente
            Intent launchIntent = new Intent(this, MainActivity.class);
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            if (!driverId.isEmpty()) {
                launchIntent.putExtra("activationDriverId", driverId);
                launchIntent.setData(Uri.parse("squidconductor://activar?driverId=" + driverId));
            }
            startActivity(launchIntent);

        } catch (Exception e) {
            // En caso de error, igual cerrar este activity
        }

        finish();
    }
}