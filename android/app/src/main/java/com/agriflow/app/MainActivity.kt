package com.agriflow.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.agriflow.app.ui.screens.MainScreen
import com.agriflow.app.ui.theme.AgriFlowTheme
import com.agriflow.app.viewmodel.MainViewModel

/**
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  AGRIFLOW SMART IRRIGATION & CLIMATE CONTROLLER — ANDROID 14 COMPANION APP
 *  (100% PURE NATIVE KOTLIN & JETPACK COMPOSE UI + BLE + WEBSOCKETS + MQTT)
 * ═══════════════════════════════════════════════════════════════════════════════════
 */
class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestAppPermissions()

        setContent {
            AgriFlowTheme {
                MainScreen(viewModel = viewModel)
            }
        }
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

        val ungranted = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (ungranted.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, ungranted.toTypedArray(), 101)
        }
    }
}
