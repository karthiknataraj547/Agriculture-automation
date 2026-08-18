package com.agriflow.app.mqtt

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class MqttManager(private val context: Context) {

    companion object {
        private const val TAG = "MqttManager"
        const val DEFAULT_BROKER_URL = "http://192.168.1.100:4000/api/v1/devices/command"
    }

    interface MqttCallback {
        fun onCommandPublished(topic: String, message: String)
        fun onError(error: String)
    }

    private var callback: MqttCallback? = null

    fun setCallback(cb: MqttCallback) {
        this.callback = cb
    }

    fun sendPumpCommand(deviceId: String, action: String, durationSec: Int = 60) {
        thread {
            try {
                val url = URL(DEFAULT_BROKER_URL)
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.connectTimeout = 3000
                conn.readTimeout = 3000
                conn.doOutput = true

                val payload = JSONObject().apply {
                    put("deviceId", deviceId)
                    put("action", action)
                    put("durationSec", durationSec)
                }.toString()

                val os: OutputStream = conn.outputStream
                os.write(payload.toByteArray())
                os.flush()
                os.close()

                val code = conn.responseCode
                Log.d(TAG, "Pump command sent via backend MQTT bridge (HTTP $code)")
                callback?.onCommandPublished("aether/farm-alpha/zone-1/commands", payload)
            } catch (e: Exception) {
                Log.w(TAG, "Command failed: ${e.message}")
                callback?.onError(e.message ?: "MQTT bridge error")
            }
        }
    }
}
