package com.example.smartcall

import android.content.Context
import android.media.AudioManager
import android.os.Build
import android.telecom.TelecomManager
import android.telephony.PhoneStateListener
import android.telephony.TelephonyManager
import android.view.KeyEvent
import androidx.annotation.NonNull
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.smartcall.app/native"
    private var methodChannel: MethodChannel? = null

    private var lastPowerPressTime: Long = 0
    private var powerPressIntervalMs: Long = 650
    private var isInterceptServiceActive: Boolean = true

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        methodChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)

        methodChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "setInterceptServiceActive" -> {
                    isInterceptServiceActive = call.argument<Boolean>("enabled") ?: true
                    result.success(true)
                }
                "setPowerPressThreshold" -> {
                    powerPressIntervalMs = (call.argument<Int>("ms") ?: 650).toLong()
                    result.success(true)
                }
                "answerCallHardware" -> {
                    val answered = answerActiveRingingCall()
                    result.success(answered)
                }
                "routeAudioToCall" -> {
                    routeAudioToVoiceCallStream()
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }

        registerTelephonyListener()
    }

    /**
     * Intercepts physical Hardware Power button presses to trigger double-press response
     * while suppressing the default single-press ringtone mute if desired.
     */
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_POWER && isInterceptServiceActive) {
            val currentTime = System.currentTimeMillis()
            val timeDiff = currentTime - lastPowerPressTime

            if (timeDiff in 50..powerPressIntervalMs) {
                // Double Power Press Detected!
                methodChannel?.invokeMethod("onHardwarePowerDoublePress", null)
                lastPowerPressTime = 0
                return true // Consume event
            } else {
                lastPowerPressTime = currentTime
                methodChannel?.invokeMethod("onHardwarePowerSinglePress", null)
                // Return true to prevent Android's default behavior from immediately silencing the ringtone
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun registerTelephonyListener() {
        val telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
        val listener = object : PhoneStateListener() {
            override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                super.onCallStateChanged(state, phoneNumber)
                val stateString = when (state) {
                    TelephonyManager.CALL_STATE_RINGING -> "RINGING"
                    TelephonyManager.CALL_STATE_OFFHOOK -> "OFFHOOK"
                    TelephonyManager.CALL_STATE_IDLE -> "IDLE"
                    else -> "UNKNOWN"
                }
                methodChannel?.invokeMethod("onCallStateChanged", mapOf(
                    "state" to stateString,
                    "phoneNumber" to (phoneNumber ?: "Unknown")
                ))
            }
        }
        telephonyManager?.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
    }

    private fun answerActiveRingingCall(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val telecomManager = getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
            return try {
                telecomManager?.acceptRingingCall()
                true
            } catch (e: SecurityException) {
                false
            }
        }
        return false
    }

    private fun routeAudioToVoiceCallStream() {
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        audioManager?.mode = AudioManager.MODE_IN_COMMUNICATION
        audioManager?.isSpeakerphoneOn = true
    }
}