package com.agriflow.app.ble

import android.bluetooth.*
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.util.UUID

class BleProvisionManager(private val context: Context) {

    companion object {
        private const val TAG = "BleProvisionManager"
        val SERVICE_UUID: UUID = UUID.fromString("0000ffe0-0000-1000-8000-00805f9b34fb")
        val CHARACTERISTIC_UUID: UUID = UUID.fromString("0000ffe1-0000-1000-8000-00805f9b34fb")
        val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
    }

    private var bluetoothGatt: BluetoothGatt? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    interface BleCallback {
        fun onConnected()
        fun onDisconnected()
        fun onCredentialsWritten(success: boolean)
        fun onStatusNotification(jsonStr: String)
        fun onError(error: String)
    }

    private var callback: BleCallback? = null

    fun setCallback(cb: BleCallback) {
        this.callback = cb
    }

    fun connectDevice(device: BluetoothDevice) {
        Log.d(TAG, "Connecting to BLE device: ${device.address}")
        bluetoothGatt = device.connectGatt(context, false, gattCallback, BluetoothDevice.TRANSPORT_LE)
    }

    fun disconnect() {
        try {
            bluetoothGatt?.disconnect()
            bluetoothGatt?.close()
            bluetoothGatt = null
        } catch (e: Exception) {
            Log.w(TAG, "Disconnect error: ${e.message}")
        }
    }

    fun writeWifiCredentials(ssid: String, pass: String, authCode: String) {
        val gatt = bluetoothGatt ?: run {
            callback?.onError("BLE Device not connected")
            return
        }

        val service = gatt.getService(SERVICE_UUID)
        if (service == null) {
            callback?.onError("Provisioning service not found on device")
            return
        }

        val characteristic = service.getCharacteristic(CHARACTERISTIC_UUID)
        if (characteristic == null) {
            callback?.onError("Provisioning characteristic not found")
            return
        }

        val json = JSONObject().apply {
            put("ssid", ssid)
            put("password", pass)
            put("authCode", authCode)
        }.toString()

        val data = json.toByteArray(StandardCharsets.UTF_8)
        characteristic.value = data
        characteristic.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT

        val success = gatt.writeCharacteristic(characteristic)
        Log.d(TAG, "Initiated BLE Credential Write (success: $success, payload: $json)")
        if (!success) {
            callback?.onError("Failed to initiate BLE characteristic write")
        }
    }

    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: BluetoothGatt?, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                Log.d(TAG, "GATT Connected. Discovering services...")
                mainHandler.post { callback?.onConnected() }
                gatt?.discoverServices()
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                Log.d(TAG, "GATT Disconnected.")
                mainHandler.post { callback?.onDisconnected() }
            }
        }

        override fun onServicesDiscovered(gatt: BluetoothGatt?, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                val service = gatt?.getService(SERVICE_UUID)
                val characteristic = service?.getCharacteristic(CHARACTERISTIC_UUID)
                if (characteristic != null) {
                    gatt.setCharacteristicNotification(characteristic, true)
                    val descriptor = characteristic.getDescriptor(CCCD_UUID)
                    if (descriptor != null) {
                        descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                        gatt.writeDescriptor(descriptor)
                    }
                }
            }
        }

        override fun onCharacteristicWrite(
            gatt: BluetoothGatt?,
            characteristic: BluetoothGattCharacteristic?,
            status: Int
        ) {
            val isSuccess = (status == BluetoothGatt.GATT_SUCCESS)
            Log.d(TAG, "Characteristic write status: $status (success: $isSuccess)")
            mainHandler.post { callback?.onCredentialsWritten(isSuccess) }
        }

        @Deprecated("Deprecated in Java")
        override fun onCharacteristicChanged(
            gatt: BluetoothGatt?,
            characteristic: BluetoothGattCharacteristic?
        ) {
            val bytes = characteristic?.value ?: return
            val str = String(bytes, StandardCharsets.UTF_8)
            Log.d(TAG, "Characteristic Notification Received: $str")
            mainHandler.post { callback?.onStatusNotification(str) }
        }
    }
}
