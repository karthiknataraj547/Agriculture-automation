package com.agriflow.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.agriflow.app.model.DiscoveredHardware
import com.agriflow.app.model.FarmZone
import com.agriflow.app.model.TelemetryData
import com.agriflow.app.network.WebSocketManager
import com.google.gson.JsonObject
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class MainViewModel : ViewModel() {

    private val _telemetry = MutableStateFlow(TelemetryData())
    val telemetry: StateFlow<TelemetryData> = _telemetry.asStateFlow()

    private val _discoveredDevices = MutableStateFlow<List<DiscoveredHardware>>(emptyList())
    val discoveredDevices: StateFlow<List<DiscoveredHardware>> = _discoveredDevices.asStateFlow()

    private val _isScanning = MutableStateFlow(false)
    val isScanning: StateFlow<Boolean> = _isScanning.asStateFlow()

    private val _selectedDevice = MutableStateFlow<DiscoveredHardware?>(null)
    val selectedDevice: StateFlow<DiscoveredHardware?> = _selectedDevice.asStateFlow()

    private val _isWsConnected = MutableStateFlow(false)
    val isWsConnected: StateFlow<Boolean> = _isWsConnected.asStateFlow()

    private val _provisioningProgress = MutableStateFlow(0)
    val provisioningProgress: StateFlow<Int> = _provisioningProgress.asStateFlow()

    private val _provisioningStatus = MutableStateFlow("DISCOVER")
    val provisioningStatus: StateFlow<String> = _provisioningStatus.asStateFlow()

    private val _farmZones = MutableStateFlow(
        listOf(
            FarmZone("zone-1", "Zone A (Corn & Wheat)", "Corn", 54.2, "OPTIMAL"),
            FarmZone("zone-2", "Zone B (Orchard Drip)", "Apple Orchard", 42.8, "IRRIGATING"),
            FarmZone("zone-3", "Zone C (Vineyard Sector)", "Grapevine", 61.0, "OPTIMAL")
        )
    )
    val farmZones: StateFlow<List<FarmZone>> = _farmZones.asStateFlow()

    private val wsManager = WebSocketManager(
        onMessageReceived = { json -> handleWsMessage(json) },
        onConnectionStateChanged = { connected -> _isWsConnected.value = connected }
    )

    init {
        startHardwareScan()
    }

    private fun handleWsMessage(json: JsonObject) {
        val type = json.get("type")?.asString ?: ""
        if (type == "DEVICE_STATUS" || type == "STATUS") {
            val moisture = json.get("soilMoisture")?.asDouble ?: _telemetry.value.soilMoisture
            val temp = json.get("temp")?.asDouble ?: _telemetry.value.airTemperature
            val humidity = json.get("humidity")?.asDouble ?: _telemetry.value.humidity
            val pump = json.get("pumpRunning")?.asBoolean ?: _telemetry.value.isPumpActive
            val ip = json.get("ip")?.asString ?: _telemetry.value.ipAddress

            _telemetry.value = _telemetry.value.copy(
                soilMoisture = moisture,
                airTemperature = temp,
                humidity = humidity,
                isPumpActive = pump,
                ipAddress = ip
            )
        } else if (type == "WIFI_STATUS") {
            val status = json.get("status")?.asString ?: ""
            if (status == "CONNECTED") {
                _provisioningProgress.value = 100
                _provisioningStatus.value = "CONNECTED"
            }
        } else if (type == "PUMP_STATUS") {
            val state = json.get("state")?.asBoolean ?: false
            _telemetry.value = _telemetry.value.copy(isPumpActive = state)
        }
    }

    fun startHardwareScan() {
        viewModelScope.launch {
            _isScanning.value = true
            // Simulate scan or collect live BLE
            delay(800)
            _discoveredDevices.value = listOf(
                DiscoveredHardware("AGRI-ESP32-8A12", "CC:50:E3:8A:12:34", -32, 98, "ESP32", true),
                DiscoveredHardware("AGRI-ESP8266-4C10", "5C:CF:7F:4C:10:99", -45, 88, "ESP8266", false),
                DiscoveredHardware("Aether-Gateway-Alpha", "70:03:9F:12:55:01", -50, 82, "GENERIC_IOT", false)
            )
            _selectedDevice.value = _discoveredDevices.value.firstOrNull()
            _isScanning.value = false
        }
    }

    fun selectDevice(device: DiscoveredHardware) {
        _selectedDevice.value = device
    }

    fun connectWebSocket(url: String = "ws://192.168.4.1:81") {
        wsManager.connect(url)
    }

    fun pushWifiCredentials(ssid: String, pass: String) {
        viewModelScope.launch {
            _provisioningStatus.value = "CONNECTING"
            _provisioningProgress.value = 25
            val auth = _selectedDevice.value?.authCode ?: "ATH-8F92-4C10-99E4"
            wsManager.sendWifiCredentials(ssid, pass, auth)

            delay(1000)
            _provisioningProgress.value = 65

            delay(1500)
            _provisioningProgress.value = 100
            _provisioningStatus.value = "CONNECTED"
        }
    }

    fun togglePump() {
        val newState = !_telemetry.value.isPumpActive
        wsManager.sendPumpCommand(if (newState) "ON" else "OFF", 6)
        _telemetry.value = _telemetry.value.copy(isPumpActive = newState)
    }

    fun triggerFactoryReset() {
        wsManager.sendFactoryReset()
    }

    override fun onCleared() {
        super.onCleared()
        wsManager.disconnect()
    }
}
