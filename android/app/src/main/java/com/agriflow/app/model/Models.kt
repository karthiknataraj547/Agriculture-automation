package com.agriflow.app.model

data class TelemetryData(
    val deviceId: String = "ESP32-ATH-8A12",
    val soilMoisture: Double = 54.2,
    val airTemperature: Double = 28.4,
    val humidity: Double = 62.0,
    val batteryLevel: Int = 98,
    val rssi: Int = -35,
    val isPumpActive: Boolean = false,
    val ipAddress: String = "192.168.1.105"
)

data class DiscoveredHardware(
    val name: String,
    val macAddress: String,
    val rssi: Int,
    val signalPercent: Int,
    val boardFamily: String = "ESP32",
    val isBle: Boolean = true,
    val authCode: String = "ATH-8F92-4C10-99E4"
)

data class FarmZone(
    val id: String,
    val name: String,
    val cropType: String,
    val soilMoisture: Double,
    val status: String = "OPTIMAL"
)
