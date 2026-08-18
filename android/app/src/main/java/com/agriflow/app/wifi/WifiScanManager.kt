package com.agriflow.app.wifi

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.wifi.WifiManager
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

class WifiScanManager(private val context: Context) {

    companion object {
        private const val TAG = "WifiScanManager"
    }

    private val wifiManager: WifiManager? =
        context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager

    interface ScanResultListener {
        fun onWifiScanCompleted(signalsJson: String)
        fun onWifiScanFailed(error: String)
    }

    private var listener: ScanResultListener? = null
    private var isReceiverRegistered = false

    private val wifiScanReceiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, intent: Intent?) {
            val success = intent?.getBooleanExtra(WifiManager.EXTRA_RESULTS_UPDATED, false) ?: false
            Log.d(TAG, "Wi-Fi scan results broadcast received. Success: $success")
            processScanResults()
        }
    }

    fun startScan(l: ScanResultListener) {
        this.listener = l
        if (wifiManager == null) {
            listener?.onWifiScanFailed("WifiManager service unavailable on this Android device.")
            return
        }

        try {
            if (!isReceiverRegistered) {
                val intentFilter = IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION)
                context.registerReceiver(wifiScanReceiver, intentFilter)
                isReceiverRegistered = true
            }

            val success = wifiManager.startScan()
            if (!success) {
                // Return cached scan results if scan was throttled by Android 14 OS
                processScanResults()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error triggering Wi-Fi scan: ${e.message}")
            listener?.onWifiScanFailed(e.message ?: "Wi-Fi Scan Error")
        }
    }

    private fun processScanResults() {
        try {
            val results = wifiManager?.scanResults ?: emptyList()
            val array = JSONArray()

            for (res in results) {
                val ssid = res.SSID ?: continue
                if (ssid.isEmpty()) continue

                val obj = JSONObject()
                obj.put("ssid", ssid)
                obj.put("bssid", res.BSSID ?: "CC:50:E3:8A:12:34")
                val level = WifiManager.calculateSignalLevel(res.level, 100)
                obj.put("signalPercent", level)
                obj.put("rssi", res.level)

                val isHardware = ssid.contains("agri", ignoreCase = true) ||
                        ssid.contains("aether", ignoreCase = true) ||
                        ssid.contains("esp32", ignoreCase = true) ||
                        ssid.contains("esp8266", ignoreCase = true) ||
                        ssid.contains("setup", ignoreCase = true) ||
                        ssid.contains("node", ignoreCase = true)

                obj.put("isHardwareNode", isHardware)
                obj.put("boardFamily", if (ssid.contains("8266", ignoreCase = true)) "ESP8266" else "ESP32")
                val cleanMac = (res.BSSID ?: "8A12").replace(":", "").uppercase()
                val lastFour = if (cleanMac.length >= 4) cleanMac.substring(cleanMac.length - 4) else "8A12"
                obj.put("serialNumber", if (isHardware) ssid else "NODE-$lastFour")
                obj.put("authCode", "ATH-$lastFour-99E4")
                obj.put("productName", if (isHardware) "AgriFlow Smart Irrigation Controller" else "Wi-Fi Access Point ($ssid)")

                array.put(obj)
            }

            listener?.onWifiScanCompleted(array.toString())
        } catch (e: Exception) {
            listener?.onWifiScanFailed(e.message ?: "Failed to parse scan results")
        }
    }

    fun unregister() {
        if (isReceiverRegistered) {
            try {
                context.unregisterReceiver(wifiScanReceiver)
                isReceiverRegistered = false
            } catch (ignored: Exception) {}
        }
    }
}
