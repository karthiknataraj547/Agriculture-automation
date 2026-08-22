package com.agriflow.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agriflow.app.ui.theme.*
import com.agriflow.app.viewmodel.MainViewModel

@Composable
fun FarmsScreen(viewModel: MainViewModel) {
    val farmZones by viewModel.farmZones.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDark)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "North Commercial Farm",
            color = TextPrimary,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Active Spatial Parcels & Irrigation Zones (3 Zones Active)",
            color = TextSecondary,
            fontSize = 12.sp
        )

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            items(farmZones) { zone ->
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = SurfaceDark,
                    shape = RoundedCornerShape(20.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(zone.name, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Surface(
                                color = if (zone.status == "IRRIGATING") AmberWarning.copy(alpha = 0.2f) else EmeraldGreen.copy(alpha = 0.2f),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(
                                    text = zone.status,
                                    color = if (zone.status == "IRRIGATING") AmberWarning else EmeraldGreen,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }

                        Text("Crop: ${zone.cropType}", color = TextSecondary, fontSize = 12.sp)

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Moisture Target: 50% - 65%", color = TextMuted, fontSize = 11.sp)
                            Text("${zone.soilMoisture}%", color = CyanPrimary, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, fontSize = 16.sp)
                        }
                    }
                }
            }
        }
    }
}
