package com.agriflow.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothLeScanner bleScanner;
    private WifiManager wifiManager;
    private boolean isScanning = false;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private static final int PERMISSION_REQUEST_CODE = 101;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        webView = new WebView(this);
        setContentView(webView);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Register Native Android JS Interface Bridge
        webView.addJavascriptInterface(new AgriNativeBridge(), "AndroidNative");
        webView.addJavascriptInterface(new AgriNativeBridge(), "AgriNativeBridge");

        BluetoothManager bluetoothManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
        if (bluetoothManager != null) {
            bluetoothAdapter = bluetoothManager.getAdapter();
            if (bluetoothAdapter != null) {
                bleScanner = bluetoothAdapter.getBluetoothLeScanner();
            }
        }

        wifiManager = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);

        requestAppPermissions();

        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("https://agriculture-automation.vercel.app");
    }

    private void requestAppPermissions() {
        List<String> permissions = new ArrayList<>();
        permissions.add(Manifest.permission.ACCESS_FINE_LOCATION);
        permissions.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        permissions.add(Manifest.permission.ACCESS_WIFI_STATE);
        permissions.add(Manifest.permission.CHANGE_WIFI_STATE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.add(Manifest.permission.BLUETOOTH_SCAN);
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT);
        } else {
            permissions.add(Manifest.permission.BLUETOOTH);
            permissions.add(Manifest.permission.BLUETOOTH_ADMIN);
        }

        List<String> needed = new ArrayList<>();
        for (String perm : permissions) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                needed.add(perm);
            }
        }

        if (!needed.isEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    public class AgriNativeBridge {

        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public String getPlatform() {
            return "ANDROID_NATIVE";
        }

        @JavascriptInterface
        public void scanNearbyHardwareWifi() {
            if (wifiManager == null) {
                sendJsCallback("window.onNativeWifiScanError && window.onNativeWifiScanError('WifiManager unavailable');");
                return;
            }

            try {
                if (ActivityCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    wifiManager.startScan();
                    List<android.net.wifi.ScanResult> results = wifiManager.getScanResults();
                    JSONArray signals = new JSONArray();

                    if (results != null) {
                        for (android.net.wifi.ScanResult res : results) {
                            String ssid = res.SSID;
                            if (ssid == null || ssid.isEmpty()) continue;

                            JSONObject obj = new JSONObject();
                            obj.put("ssid", ssid);
                            obj.put("bssid", res.BSSID);
                            int level = WifiManager.calculateSignalLevel(res.level, 100);
                            obj.put("signalPercent", level);
                            obj.put("rssi", res.level);

                            boolean isHardware = ssid.toLowerCase().contains("agri") ||
                                                 ssid.toLowerCase().contains("aether") ||
                                                 ssid.toLowerCase().contains("esp32") ||
                                                 ssid.toLowerCase().contains("esp8266") ||
                                                 ssid.toLowerCase().contains("setup") ||
                                                 ssid.toLowerCase().contains("node");

                            obj.put("isHardwareNode", isHardware);
                            obj.put("boardFamily", ssid.toLowerCase().contains("8266") ? "ESP8266" : "ESP32");
                            String cleanMac = (res.BSSID != null) ? res.BSSID.replace(":", "").toUpperCase() : "8A12";
                            String lastFour = cleanMac.length() >= 4 ? cleanMac.substring(cleanMac.length() - 4) : "8A12";
                            obj.put("serialNumber", isHardware ? ssid : "NODE-" + lastFour);
                            obj.put("authCode", "ATH-" + lastFour + "-99E4");
                            obj.put("productName", isHardware ? "AgriFlow Smart Irrigation Controller" : "Wi-Fi Access Point (" + ssid + ")");

                            signals.put(obj);
                        }
                    }

                    sendJsCallback("window.onNativeWifiSignalsFound && window.onNativeWifiSignalsFound(" + signals.toString() + ");");
                }
            } catch (Exception e) {
                sendJsCallback("window.onNativeWifiScanError && window.onNativeWifiScanError('" + e.getMessage() + "');");
            }
        }

        @JavascriptInterface
        public void startNativeBleScan() {
            if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
                sendJsCallback("window.onNativeBleError && window.onNativeBleError('Bluetooth is disabled on this device.');");
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (ActivityCompat.checkSelfPermission(MainActivity.this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                    sendJsCallback("window.onNativeBleError && window.onNativeBleError('Bluetooth Scan permission missing.');");
                    return;
                }
            }

            if (bleScanner == null) {
                bleScanner = bluetoothAdapter.getBluetoothLeScanner();
            }

            if (bleScanner == null) {
                sendJsCallback("window.onNativeBleError && window.onNativeBleError('BLE Scanner unavailable.');");
                return;
            }

            if (isScanning) return;
            isScanning = true;

            handler.postDelayed(() -> {
                if (isScanning && bleScanner != null) {
                    try {
                        bleScanner.stopScan(scanCallback);
                    } catch (Exception ignored) {}
                    isScanning = false;
                    sendJsCallback("window.onNativeBleScanFinished && window.onNativeBleScanFinished();");
                }
            }, 12000);

            try {
                bleScanner.startScan(scanCallback);
                sendJsCallback("window.onNativeBleScanStarted && window.onNativeBleScanStarted();");
            } catch (Exception e) {
                isScanning = false;
                sendJsCallback("window.onNativeBleError && window.onNativeBleError('" + e.getMessage() + "');");
            }
        }

        @JavascriptInterface
        public void stopNativeBleScan() {
            if (isScanning && bleScanner != null) {
                try {
                    bleScanner.stopScan(scanCallback);
                } catch (Exception ignored) {}
                isScanning = false;
            }
        }

        @JavascriptInterface
        public void scanLocalWifiDevices() {
            scanNearbyHardwareWifi();
        }

        @JavascriptInterface
        public void writeWifiCredentialsToHardware(String targetIp, String ssid, String password, String authCode) {
            new Thread(() -> {
                try {
                    String ip = (targetIp != null && !targetIp.isEmpty()) ? targetIp : "192.168.4.1";
                    URL url = new URL("http://" + ip + "/api/wifi/credentials");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(4000);
                    conn.setReadTimeout(4000);
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);

                    JSONObject payload = new JSONObject();
                    payload.put("ssid", ssid);
                    payload.put("password", password);
                    payload.put("authCode", authCode);

                    OutputStream os = conn.getOutputStream();
                    os.write(payload.toString().getBytes());
                    os.flush();
                    os.close();

                    int code = conn.getResponseCode();
                    if (code >= 200 && code < 300) {
                        BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = in.readLine()) != null) sb.append(line);
                        in.close();
                        sendJsCallback("window.onNativeWifiWriteSuccess && window.onNativeWifiWriteSuccess(" + sb.toString() + ");");
                    } else {
                        sendJsCallback("window.onNativeWifiWriteError && window.onNativeWifiWriteError('HTTP error code: " + code + "');");
                    }
                } catch (Exception e) {
                    sendJsCallback("window.onNativeWifiWriteError && window.onNativeWifiWriteError('" + e.getMessage() + "');");
                }
            }).start();
        }

        @JavascriptInterface
        public void checkHardwareWifiStatus(String targetIp) {
            new Thread(() -> {
                try {
                    String ip = (targetIp != null && !targetIp.isEmpty()) ? targetIp : "192.168.4.1";
                    URL url = new URL("http://" + ip + "/api/wifi/status");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(2000);
                    conn.setReadTimeout(2000);
                    conn.setRequestMethod("GET");

                    if (conn.getResponseCode() == 200) {
                        BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = in.readLine()) != null) sb.append(line);
                        in.close();
                        sendJsCallback("window.onNativeHardwareStatus && window.onNativeHardwareStatus(" + sb.toString() + ");");
                    } else {
                        sendJsCallback("window.onNativeHardwareStatusError && window.onNativeHardwareStatusError('Non-200 response');");
                    }
                } catch (Exception e) {
                    sendJsCallback("window.onNativeHardwareStatusError && window.onNativeHardwareStatusError('" + e.getMessage() + "');");
                }
            }).start();
        }
    }

    private final ScanCallback scanCallback = new ScanCallback() {
        @Override
        public void onScanResult(int callbackType, ScanResult result) {
            super.onScanResult(callbackType, result);
            BluetoothDevice device = result.getDevice();
            if (device == null) return;

            String name = null;
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || 
                ActivityCompat.checkSelfPermission(MainActivity.this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) {
                name = device.getName();
            }

            if (name != null && (name.contains("AGRI") || name.contains("Aether") || name.contains("ESP32") || name.contains("ATH"))) {
                try {
                    JSONObject obj = new JSONObject();
                    obj.put("serialNumber", name.replace("AGRI-SETUP-", "AGRI-ESP32-"));
                    obj.put("macAddress", device.getAddress());
                    obj.put("rssi", result.getRssi());
                    obj.put("mode", "Native Android BLE Signal");
                    obj.put("boardFamily", "ESP32");
                    obj.put("authCode", "ATH-8600-4911");
                    obj.put("productName", "AgriFlow Smart Irrigation Controller");

                    sendJsCallback("window.onNativeBleDeviceFound && window.onNativeBleDeviceFound(" + obj.toString() + ");");
                } catch (Exception ignored) {}
            }
        }

        @Override
        public void onScanFailed(int errorCode) {
            super.onScanFailed(errorCode);
            sendJsCallback("window.onNativeBleError && window.onNativeBleError('Scan failed with error: " + errorCode + "');");
        }
    };

    private void sendJsCallback(String script) {
        handler.post(() -> {
            if (webView != null) {
                webView.evaluateJavascript(script, null);
            }
        });
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
