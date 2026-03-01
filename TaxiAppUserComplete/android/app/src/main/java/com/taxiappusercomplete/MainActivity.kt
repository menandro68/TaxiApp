package com.taxiappusercomplete

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {
    private val TAG = "MainActivity"
    private var pendingOpenChat = false
    private var pendingTripId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.AppTheme)
        super.onCreate(savedInstanceState)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        if (intent != null && intent.getBooleanExtra("openChat", false)) {
            val tripId = intent.getStringExtra("tripId")
            Log.d(TAG, "Intent openChat recibido, tripId: ")
            
            pendingOpenChat = true
            pendingTripId = tripId
            
            sendOpenChatEvent()
        }
    }

    private fun sendOpenChatEvent() {
        val reactContext = reactInstanceManager.currentReactContext
        if (reactContext != null && pendingOpenChat) {
            Log.d(TAG, "Enviando evento OPEN_CHAT_FROM_NATIVE")
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("OPEN_CHAT_FROM_NATIVE", pendingTripId)
            pendingOpenChat = false
            pendingTripId = null
        }
    }

    override fun onResume() {
        super.onResume()
        if (pendingOpenChat) {
            Handler(Looper.getMainLooper()).postDelayed({ sendOpenChatEvent() }, 1000)
        }
    }

    override fun getMainComponentName(): String = "TaxiAppUserComplete"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}