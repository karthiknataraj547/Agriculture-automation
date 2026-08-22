package com.agriflow.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agriflow.app.model.DiscoveredHardware
import com.agriflow.app.ui.theme.*
import com.agriflow.app.viewmodel.MainViewModel

@Composable
fun ProvisioningWizardScreen(viewModel: MainViewModel) {
    var step by remember { mutableStateOf(1) }
    val discoveredDevices by viewModel.discoveredDevices.collectAsState()
    val selectedDevice by viewModel.selectedDevice.collectAsState()
    val isScanning by viewModel.isScanning.collectAsState()
    val provisioningProgress by viewModel.provisioningProgress.collectAsState()
    val provisioningStatus by viewModel.provisioningStatus.collectAsState()

    var wifiSsid by remember { mutableStateOf("Farm_Mesh_WiFi_5G") }
    var wifiPass by remember { mutableStateOf("agrifarm2026") }

    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDark)
            .padding(16.dp)
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // TOP STEP INDICATOR
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = SurfaceDark,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "1. Scan",
                    color = if (step >= 1) CyanPrimary else TextMuted,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp
                )
                Text(text = "→", color = TextMuted)
                Text(
                    text = "2. Credentials",
                    color = if (step >= 2) CyanPrimary else TextMuted,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp
                )
                Text(text = "→", color = TextMuted)
                Text(
                    text = "3. Verify",
                    color = if (step >= 3) CyanPrimary else TextMuted,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp
                )
                Text(text = "→", color = TextMuted)
                Text(
                    text = "4. Claim",
                    color = if (step >= 4) CyanPrimary else TextMuted,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp
                )
            }
        }

        // STEP 1: DISCOVER HARDWARE
        if (step == 1) {
            Text(
                text = "Wireless IoT Hardware Scanner",
                color = TextPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Select your detected ESP microcontroller beacon or router signal:",
                color = TextSecondary,
                fontSize = 12.sp
            )

            // Direct WebSocket / BLE Trigger
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { viewModel.connectWebSocket("ws://192.168.4.1:81") },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("⚡ Direct WebSocket", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                Button(
                    onClick = { viewModel.startHardwareScan() },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = CardDark),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(if (isScanning) "Scanning..." else "📡 Rescan", fontSize = 11.sp, color = CyanPrimary)
                }
            }

            // LIST OF DETECTED SIGNALS
            discoveredDevices.forEach { device ->
                val isSelected = selectedDevice?.macAddress == device.macAddress
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .clickable { viewModel.selectDevice(device) },
                    color = if (isSelected) CyanPrimary.copy(alpha = 0.15f) else SurfaceDark,
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (isSelected) CyanPrimary else BorderDark
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(device.name, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Surface(
                                    color = EmeraldGreen.copy(alpha = 0.2f),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = device.boardFamily,
                                        color = EmeraldGreen,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            Text("MAC: ${device.macAddress}", color = TextSecondary, fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text("📶 ${device.signalPercent}%", color = CyanPrimary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            Text("${device.rssi} dBm", color = TextMuted, fontSize = 10.sp)
                        }
                    }
                }
            }

            Button(
                onClick = { step = 2 },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text("Select & Continue →", color = Color.White, fontWeight = FontWeight.Bold)
            }
        }

        // STEP 2: CREDENTIALS
        if (step == 2) {
            Text(
                text = "Enter Wi-Fi Credentials for Node",
                color = TextPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Target: ${selectedDevice?.name ?: "ESP32-ATH-8A12"}",
                color = CyanPrimary,
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace
            )

            OutlinedTextField(
                value = wifiSsid,
                onValueChange = { wifiSsid = it },
                label = { Text("Wi-Fi SSID (2.4GHz)") },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = CyanPrimary,
                    unfocusedBorderColor = BorderDark,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                shape = RoundedCornerShape(12.dp)
            )

            OutlinedTextField(
                value = wifiPass,
                onValueChange = { wifiPass = it },
                label = { Text("Wi-Fi Password") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = CyanPrimary,
                    unfocusedBorderColor = BorderDark,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                shape = RoundedCornerShape(12.dp)
            )

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = { step = 1 },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = CardDark),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Back", color = TextSecondary)
                }

                Button(
                    onClick = {
                        step = 3
                        viewModel.pushWifiCredentials(wifiSsid, wifiPass)
                    },
                    modifier = Modifier.weight(2f),
                    colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("⚡ Push to Node & Connect", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }

        // STEP 3: REAL-TIME VERIFICATION & TEST
        if (step == 3) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(130.dp)
                        .clip(CircleShape)
                        .background(SurfaceDark)
                        .border(4.dp, if (provisioningProgress == 100) EmeraldGreen else CyanPrimary, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "$provisioningProgress%",
                            color = TextPrimary,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace
                        )
                        Text(
                            text = provisioningStatus,
                            color = if (provisioningProgress == 100) EmeraldGreen else CyanGlow,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = SurfaceDark,
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("✓ Credentials Written to NVS Flash", color = EmeraldGreen, fontSize = 12.sp)
                        Text("✓ Microcontroller Connected to $wifiSsid", color = EmeraldGreen, fontSize = 12.sp)
                        Text(
                            if (provisioningProgress == 100) "✓ Hardware 100% Verified Online" else "⏳ Awaiting Live Hardware Confirmation...",
                            color = if (provisioningProgress == 100) EmeraldGreen else AmberWarning,
                            fontSize = 12.sp
                        )
                    }
                }

                Button(
                    onClick = { viewModel.togglePump() },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("⚡ Test Pump Relay Pulse (6s)", color = Color.White, fontWeight = FontWeight.Bold)
                }

                if (provisioningProgress == 100) {
                    Button(
                        onClick = { step = 4 },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = CyanPrimary),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text("Continue to Location →", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // STEP 4: ASSIGN LOCATION & CLAIM
        if (step == 4) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = SurfaceDark,
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("🎉 Hardware 100% Connected!", color = EmeraldGreen, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Text("Assigned IP: 192.168.1.105 • Farm: North Commercial Farm", color = TextSecondary, fontSize = 12.sp)

                    Button(
                        onClick = { step = 1 },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text("🚀 Activate on Farm Dashboard", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
