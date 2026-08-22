package com.agriflow.app.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agriflow.app.ui.theme.*
import com.agriflow.app.viewmodel.MainViewModel

@Composable
fun DashboardScreen(viewModel: MainViewModel) {
    val telemetry by viewModel.telemetry.collectAsState()
    val isWsConnected by viewModel.isWsConnected.collectAsState()
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDark)
            .padding(16.dp)
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // TOP HEADER CARD
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "AgriFlow Smart Node",
                    color = TextPrimary,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Device ID: ${telemetry.deviceId}",
                    color = TextSecondary,
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace
                )
            }

            Surface(
                color = if (isWsConnected) EmeraldGreen.copy(alpha = 0.15f) else AmberWarning.copy(alpha = 0.15f),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    if (isWsConnected) EmeraldGreen.copy(alpha = 0.5f) else AmberWarning.copy(alpha = 0.5f)
                )
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(if (isWsConnected) EmeraldGreen else AmberWarning)
                    )
                    Text(
                        text = if (isWsConnected) "LIVE LINK" else "SIMULATED",
                        color = if (isWsConnected) EmeraldGreen else AmberWarning,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }

        // MAIN SOIL MOISTURE GAUGE CARD
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = SurfaceDark,
            shape = RoundedCornerShape(24.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "ROOT ZONE SOIL MOISTURE",
                    color = TextSecondary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 1.sp
                )

                // Large Glowing Dial
                Box(
                    modifier = Modifier
                        .size(150.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(CyanPrimary.copy(alpha = 0.2f), Color.Transparent)
                            )
                        )
                        .border(4.dp, CyanPrimary, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "${telemetry.soilMoisture}%",
                            color = TextPrimary,
                            fontSize = 36.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace
                        )
                        Text(
                            text = "OPTIMAL LEVEL",
                            color = CyanGlow,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Text(
                    text = "Sensor: Capacitive V1.2 (ADC Channel 6)",
                    color = TextMuted,
                    fontSize = 11.sp
                )
            }
        }

        // METRICS 2X2 GRID
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            // Temperature Card
            Surface(
                modifier = Modifier.weight(1f),
                color = SurfaceDark,
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("AIR TEMPERATURE", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("${telemetry.airTemperature}°C", color = AmberWarning, fontSize = 22.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                    Text("DHT11 Sensor", color = TextMuted, fontSize = 10.sp)
                }
            }

            // Humidity Card
            Surface(
                modifier = Modifier.weight(1f),
                color = SurfaceDark,
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("HUMIDITY", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("${telemetry.humidity}%", color = CyanPrimary, fontSize = 22.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                    Text("Relative Air RH", color = TextMuted, fontSize = 10.sp)
                }
            }
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            // Battery Card
            Surface(
                modifier = Modifier.weight(1f),
                color = SurfaceDark,
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("BATTERY / SOLAR", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("${telemetry.batteryLevel}%", color = EmeraldGreen, fontSize = 22.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                    Text("4.1V Li-Ion Cell", color = TextMuted, fontSize = 10.sp)
                }
            }

            // RSSI Signal Card
            Surface(
                modifier = Modifier.weight(1f),
                color = SurfaceDark,
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("WI-FI SIGNAL", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("${telemetry.rssi} dBm", color = IndigoAccent, fontSize = 22.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                    Text("IP: ${telemetry.ipAddress}", color = TextMuted, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                }
            }
        }

        // WATER PUMP RELAY CONTROL CARD
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = if (telemetry.isPumpActive) EmeraldGreen.copy(alpha = 0.12f) else SurfaceDark,
            shape = RoundedCornerShape(24.dp),
            border = androidx.compose.foundation.BorderStroke(
                1.dp,
                if (telemetry.isPumpActive) EmeraldGreen else BorderDark
            )
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Water Pump Relay Actuator",
                            color = TextPrimary,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = if (telemetry.isPumpActive) "⚡ Pump is ACTIVE (Irrigating)" else "🛑 Pump is IDLE (Relay OFF)",
                            color = if (telemetry.isPumpActive) EmeraldGreen else TextSecondary,
                            fontSize = 12.sp
                        )
                    }
                }

                Button(
                    onClick = { viewModel.togglePump() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (telemetry.isPumpActive) RedAlert else EmeraldGreen
                    ),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text(
                        text = if (telemetry.isPumpActive) "🛑 STOP PUMP RELAY" else "⚡ START PUMP (PULSE 6 SECONDS)",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            }
        }
    }
}
