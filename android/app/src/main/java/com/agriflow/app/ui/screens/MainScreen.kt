package com.agriflow.app.ui.screens

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.agriflow.app.ui.theme.*
import com.agriflow.app.viewmodel.MainViewModel

@Composable
fun MainScreen(viewModel: MainViewModel) {
    var selectedTab by remember { mutableStateOf(0) }

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = SurfaceDark,
                contentColor = TextPrimary
            ) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.Home, contentDescription = "Dashboard") },
                    label = { Text("Dashboard") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = CyanPrimary,
                        selectedTextColor = CyanPrimary,
                        indicatorColor = CyanPrimary.copy(alpha = 0.15f),
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted
                    )
                )

                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.Settings, contentDescription = "IoT Provisioning") },
                    label = { Text("Provision Studio") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = CyanPrimary,
                        selectedTextColor = CyanPrimary,
                        indicatorColor = CyanPrimary.copy(alpha = 0.15f),
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted
                    )
                )

                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.Place, contentDescription = "Farms") },
                    label = { Text("Farms & Zones") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = CyanPrimary,
                        selectedTextColor = CyanPrimary,
                        indicatorColor = CyanPrimary.copy(alpha = 0.15f),
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted
                    )
                )
            }
        }
    ) { innerPadding ->
        Surface(modifier = Modifier.padding(innerPadding)) {
            when (selectedTab) {
                0 -> DashboardScreen(viewModel = viewModel)
                1 -> ProvisioningWizardScreen(viewModel = viewModel)
                2 -> FarmsScreen(viewModel = viewModel)
            }
        }
    }
}
