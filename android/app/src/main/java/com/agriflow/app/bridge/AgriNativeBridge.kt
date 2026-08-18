package com.agriflow.app.bridge

import android.bluetooth.BluetoothDevice
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.agriflow.app.MainActivity
import com.agriflow.app.ble.BleProvisionManager
import com.agriflow.app.mqtt.MqttManager
import com.agriflow.app.wifi.WifiScanManager
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class AgriNativeBridge(
    private val activity: MainActivity,
    private val webView: WebView,
    private val wifiScanManager: WifiScanManager,
    private val bleProvisionManager: BleProvisionManager,
    private val mqttManager: MqttManager
) {
    private val handler = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun isNativeApp(): Boolean = true

    @JavascriptInterface
    fun getPlatform(): String = "ANDROID_KOTLIN_NATIVE"

    @JavascriptInterface
    fun scanNearbyHardwareWifi() {
        activity.runOnUiThread {
            wifiScanManager.startScan(object : WifiScanManager.ScanResultListener {
                override fun onWifiScanCompleted(signalsJson: String) {
                    sendJsCallback("window.onNativeWifiSignalsFound && window.onNativeWifiSignalsFound($signalsJson);")
                }

                override fun onWifiScanFailed(error: String) {
                    sendJsCallback("window.onNativeWifiScanError && window.onNativeWifiScanError('$error');")
                }
            })
        }
    }

    @JavascriptInterface
    fun startNativeBleScan() {
        activity.runOnUiThread {
            activity.startBleScanning()
        }
    }

    @JavascriptInterface
    fun stopNativeBleScan() {
        activity.runOnUiThread {
            activity.stopBleScanning()
        }
    }

    @JavascriptInterface
    fun writeWifiCredentialsViaBle(deviceMac: String, ssid: String, pass: String, authCode: String) {
        val device: BluetoothDevice? = activity.getBluetoothDeviceByMac(deviceMac)
        if (device != null) {
            bleProvisionManager.setCallback(object : BleProvisionManager.BleCallback {
                override fun onConnected() {
                    bleProvisionManager.writeWifiCredentials(ssid, pass, authCode)
                }

                override fun onDisconnected() {}

                override fun onCredentialsWritten(success: Boolean) {
                    sendJsCallback("window.onNativeBleWriteResult && window.onNativeBleWriteResult($success);")
                }

                override fun onStatusNotification(jsonStr: String) {
                    sendJsCallback("window.onNativeBleNotification && window.onNativeBleNotification($jsonStr);")
                }

                override fun onError(error: String) {
                    sendJsCallback("window.onNativeBleError && window.onNativeBleError('$error');")
                }
            })
            bleProvisionManager.connectDevice(device)
        } else {
            sendJsCallback("window.onNativeBleError && window.onNativeBleError('Device not found in scanned cache.');")
        }
    }

    @JavascriptInterface
    fun writeWifiCredentialsToHardware(targetIp: String?, ssid: String, password: String, authCode: String) {
        thread {
            try {
                val ip = if (!targetIp.isNullOrEmpty()) targetIp else "192.168.4.1"
                val url = URL("http://$ip/api/wifi/credentials")
                val conn = url.openConnection() as HttpURLConnection
                conn.connectTimeout = 4000
                conn.readTimeout = 4000
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true

                val payload = JSONObject().apply {
                    put("ssid", ssid)
                    put("password", password)
                    put("authCode", authCode)
                }.toString()

                val os: OutputStream = conn.outputStream
                os.write(payload.toByteArray())
                os.flush()
                os.close()

                val code = conn.responseCode
                if (code in 200..299) {
                    val reader = BufferedReader(InputStreamReader(conn.inputStream))
                    val sb = StringBuilder()
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        sb.append(line)
                    }
                    reader.close()
                    sendJsCallback("window.onNativeWifiWriteSuccess && window.onNativeWifiWriteSuccess($sb);")
                } else {
                    sendJsCallback("window.onNativeWifiWriteError && window.onNativeWifiWriteError('HTTP error $code');")
                }
            } catch (e: Exception) {
                sendJsCallback("window.onNativeWifiWriteError && window.onNativeWifiWriteError('${e.message}');")
            }
        }
    }

    @JavascriptInterface
    fun checkHardwareWifiStatus(targetIp: String?) {
        thread {
            try {
                val ip = if (!targetIp.isNullOrEmpty()) targetIp else "192.168.4.1"
                val url = URL("http://$ip/api/wifi/status")
                val conn = url.openConnection() as HttpURLConnection
                conn.connectTimeout = 2000
                conn.readTimeout = 2000
                conn.requestMethod = "GET"

                if (conn.responseCode == 200) {
                    val reader = BufferedReader(InputStreamReader(conn.inputStream))
                    val sb = StringBuilder()
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        sb.append(line)
                    }
                    reader.close()
                    sendJsCallback("window.onNativeHardwareStatus && window.onNativeHardwareStatus($sb);")
                } else {
                    sendJsCallback("window.onNativeHardwareStatusError && window.onNativeHardwareStatusError('Non-200');")
                }
            } catch (e: Exception) {
                sendJsCallback("window.onNativeHardwareStatusError && window.onNativeHardwareStatusError('${e.message}');")
            }
        }
    }

    @JavascriptInterface
    fun sendMqttPumpCommand(deviceId: String, action: String, durationSec: Int) {
        mqttManager.sendPumpCommand(deviceId, action, durationSec)
    }

    private fun sendJsCallback(script: String) {
        handler.post {
            webView.evaluateJavascript(script, null)
        }
    }
}
