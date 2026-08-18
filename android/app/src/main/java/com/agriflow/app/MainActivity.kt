package com.agriflow.app

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.agriflow.app.ble.BleProvisionManager
import com.agriflow.app.bridge.AgriNativeBridge
import com.agriflow.app.mqtt.MqttManager
import com.agriflow.app.wifi.WifiScanManager
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "MainActivity"
        private const val PERMISSION_REQUEST_CODE = 101
    }

    private lateinit var webView: WebView
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bleScanner: BluetoothLeScanner? = null
    private var isBleScanning = false

    private lateinit var wifiScanManager: WifiScanManager
    private lateinit var bleProvisionManager: BleProvisionManager
    private lateinit var mqttManager: MqttManager

    private val discoveredBleDevices = ConcurrentHashMap<String, BluetoothDevice>()
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        wifiScanManager = WifiScanManager(this)
        bleProvisionManager = BleProvisionManager(this)
        mqttManager = MqttManager(this)

        val webSettings: WebSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.allowFileAccess = true
        webSettings.allowContentAccess = true
        webSettings.databaseEnabled = true
        webSettings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        val bridge = AgriNativeBridge(this, webView, wifiScanManager, bleProvisionManager, mqttManager)
        webView.addJavascriptInterface(bridge, "AndroidNative")
        webView.addJavascriptInterface(bridge, "AgriNativeBridge")

        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = bluetoothManager?.adapter
        bleScanner = bluetoothAdapter?.bluetoothLeScanner

        requestAppPermissions()

        webView.webViewClient = WebViewClient()
        webView.loadUrl("https://agriculture-automation.vercel.app")
    }

    private fun requestAppPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.ACCESS_WIFI_STATE,
            Manifest.permission.CHANGE_WIFI_STATE
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.add(Manifest.permission.BLUETOOTH_SCAN)
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
        } else {
            permissions.add(Manifest.permission.BLUETOOTH)
            permissions.add(Manifest.permission.BLUETOOTH_ADMIN)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.NEARBY_WIFI_DEVICES)
        }

        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (needed.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), PERMISSION_REQUEST_CODE)
        }
    }

    fun startBleScanning() {
        if (bluetoothAdapter == null || !bluetoothAdapter!!.isEnabled) {
            sendJsCallback("window.onNativeBleError && window.onNativeBleError('Bluetooth is disabled.');")
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED
        ) {
            sendJsCallback("window.onNativeBleError && window.onNativeBleError('Bluetooth permission missing.');")
            return
        }

        if (bleScanner == null) bleScanner = bluetoothAdapter?.bluetoothLeScanner
        if (bleScanner == null) {
            sendJsCallback("window.onNativeBleError && window.onNativeBleError('BLE scanner unavailable.');")
            return
        }

        if (isBleScanning) return
        isBleScanning = true
        discoveredBleDevices.clear()

        mainHandler.postDelayed({
            stopBleScanning()
            sendJsCallback("window.onNativeBleScanFinished && window.onNativeBleScanFinished();")
        }, 12000)

        try {
            bleScanner?.startScan(bleScanCallback)
            sendJsCallback("window.onNativeBleScanStarted && window.onNativeBleScanStarted();")
        } catch (e: Exception) {
            isBleScanning = false
            sendJsCallback("window.onNativeBleError && window.onNativeBleError('${e.message}');")
        }
    }

    fun stopBleScanning() {
        if (isBleScanning && bleScanner != null) {
            try {
                if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED) {
                    bleScanner?.stopScan(bleScanCallback)
                }
            } catch (ignored: Exception) {}
            isBleScanning = false
        }
    }

    fun getBluetoothDeviceByMac(mac: String): BluetoothDevice? {
        return discoveredBleDevices[mac] ?: bluetoothAdapter?.getRemoteDevice(mac)
    }

    private val bleScanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            val device = result?.device ?: return
            val name = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
                ActivityCompat.checkSelfPermission(this@MainActivity, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
            ) {
                device.name
            } else {
                null
            }

            discoveredBleDevices[device.address] = device

            if (name != null && (name.contains("AGRI", ignoreCase = true) ||
                        name.contains("Aether", ignoreCase = true) ||
                        name.contains("ESP32", ignoreCase = true) ||
                        name.contains("ATH", ignoreCase = true))
            ) {
                val json = JSONObject().apply {
                    put("serialNumber", name)
                    put("macAddress", device.address)
                    put("rssi", result.rssi)
                    put("mode", "Native Kotlin BLE Signal")
                    put("boardFamily", "ESP32")
                    put("authCode", "ATH-8F92-4C10-99E4")
                    put("productName", "AgriFlow Smart Irrigation Controller")
                }.toString()

                sendJsCallback("window.onNativeBleDeviceFound && window.onNativeBleDeviceFound($json);")
            }
        }

        override fun onScanFailed(errorCode: Int) {
            isBleScanning = false
            sendJsCallback("window.onNativeBleError && window.onNativeBleError('Scan failed with code: $errorCode');")
        }
    }

    private fun sendJsCallback(script: String) {
        mainHandler.post {
            webView.evaluateJavascript(script, null)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        wifiScanManager.unregister()
        bleProvisionManager.disconnect()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
