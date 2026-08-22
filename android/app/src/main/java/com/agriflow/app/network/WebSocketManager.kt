package com.agriflow.app.network

import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import okhttp3.*
import java.util.concurrent.TimeUnit

class WebSocketManager(
    private val onMessageReceived: (JsonObject) -> Unit,
    private val onConnectionStateChanged: (Boolean) -> Unit
) {
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    private var webSocket: WebSocket? = null
    private val gson = Gson()

    fun connect(wsUrl: String = "ws://192.168.4.1:81") {
        try {
            webSocket?.close(1000, "Reconnecting")
            val request = Request.Builder().url(wsUrl).build()
            webSocket = client.newWebSocket(request, object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    Log.d("WebSocketManager", "Connected to $wsUrl")
                    onConnectionStateChanged(true)
                }

                override fun onMessage(webSocket: WebSocket, text: String) {
                    try {
                        val json = gson.fromJson(text, JsonObject::class.java)
                        onMessageReceived(json)
                    } catch (e: Exception) {
                        Log.e("WebSocketManager", "Parse error", e)
                    }
                }

                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                    Log.d("WebSocketManager", "Closed: $reason")
                    onConnectionStateChanged(false)
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    Log.w("WebSocketManager", "Failure: ${t.message}")
                    onConnectionStateChanged(false)
                }
            })
        } catch (e: Exception) {
            Log.e("WebSocketManager", "Connection error", e)
            onConnectionStateChanged(false)
        }
    }

    fun sendWifiCredentials(ssid: String, pass: String, authCode: String) {
        val payload = JsonObject().apply {
            addProperty("type", "SET_WIFI")
            addProperty("ssid", ssid)
            addProperty("password", pass)
            addProperty("authCode", authCode)
        }
        webSocket?.send(payload.toString())
    }

    fun sendPumpCommand(action: String = "ON", durationSec: Int = 6) {
        val payload = JsonObject().apply {
            addProperty("type", "PUMP")
            addProperty("action", action)
            addProperty("durationSec", durationSec)
        }
        webSocket?.send(payload.toString())
    }

    fun sendFactoryReset() {
        val payload = JsonObject().apply {
            addProperty("type", "FACTORY_RESET")
        }
        webSocket?.send(payload.toString())
    }

    fun disconnect() {
        webSocket?.close(1000, "App closed")
        webSocket = null
    }
}
