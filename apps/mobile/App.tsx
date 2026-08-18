import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  RefreshControl
} from 'react-native';
import { MobileWifiProvisioningWizard } from './src/components/MobileWifiProvisioningWizard';

export default function App() {
  const [showWizard, setShowWizard] = useState<boolean>(false);
  const [pumpActive, setPumpActive] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState({
    soilMoisture: 48.2,
    airTemperature: 28.4,
    humidity: 62.1,
    waterFlow: 3.4,
    battery: 98,
    rssi: -42,
    nodeStatus: 'ONLINE'
  });

  const fetchTelemetry = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('http://192.168.1.100:4000/api/v1/telemetry/latest');
      if (res.ok) {
        const data = await res.json();
        if (data) setTelemetry(data);
      }
    } catch (e) {}
    setRefreshing(false);
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  const togglePump = async (val: boolean) => {
    setPumpActive(val);
    try {
      await fetch('http://192.168.1.100:4000/api/v1/devices/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: val ? 'ON' : 'OFF', durationSec: 60 })
      });
    } catch (e) {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />

      {/* App Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.appName}>🌾 AetherCrop Spatial IoT</Text>
          <Text style={styles.appSubtitle}>Smart Agriculture Mobile Command</Text>
        </View>
        <TouchableOpacity onPress={() => setShowWizard(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Provision</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchTelemetry} tintColor="#06b6d4" />}
      >
        {/* Active Node Banner */}
        <View style={styles.nodeBanner}>
          <View>
            <Text style={styles.nodeName}>AgriFlow Smart Node 01</Text>
            <Text style={styles.nodeMeta}>Serial: ESP32-ATH-8A12 • North Farm</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>● {telemetry.nodeStatus}</Text>
          </View>
        </View>

        {/* Telemetry Sensor Cards */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>SOIL MOISTURE</Text>
            <Text style={styles.metricValue}>{telemetry.soilMoisture}%</Text>
            <Text style={styles.metricSub}>Target: 45 - 65%</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>AIR TEMPERATURE</Text>
            <Text style={styles.metricValue}>{telemetry.airTemperature}°C</Text>
            <Text style={styles.metricSub}>Ambient Optimal</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>RELATIVE HUMIDITY</Text>
            <Text style={styles.metricValue}>{telemetry.humidity}%</Text>
            <Text style={styles.metricSub}>Normal</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>WATER FLOW RATE</Text>
            <Text style={styles.metricValue}>{telemetry.waterFlow} L/m</Text>
            <Text style={styles.metricSub}>Line 1 Active</Text>
          </View>
        </View>

        {/* Irrigation Relay Pump Control Card */}
        <View style={styles.controlCard}>
          <View>
            <Text style={styles.controlTitle}>⚡ Subsurface Pump Relay</Text>
            <Text style={styles.controlSub}>{pumpActive ? 'Pump is RUNNING (Relay Active HIGH)' : 'Pump is STANDBY (Relay OFF)'}</Text>
          </View>
          <Switch
            value={pumpActive}
            onValueChange={togglePump}
            trackColor={{ false: '#334155', true: '#10b981' }}
            thumbColor={pumpActive ? '#ffffff' : '#94a3b8'}
          />
        </View>

        {/* Quick Provisioning Action */}
        <TouchableOpacity onPress={() => setShowWizard(true)} style={styles.provisionBanner}>
          <Text style={styles.provisionBannerTitle}>📡 Wireless Hardware Provisioning</Text>
          <Text style={styles.provisionBannerSub}>
            Scan real Wi-Fi airwaves, discover nearby ESP32/ESP8266 nodes, and push credentials.
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Provisioning Wizard Modal */}
      {showWizard && (
        <MobileWifiProvisioningWizard
          onClose={() => setShowWizard(false)}
          onSuccess={() => setShowWizard(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19'
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  appName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#38bdf8'
  },
  appSubtitle: {
    fontSize: 11,
    color: '#94a3b8'
  },
  addBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12
  },
  scrollContent: {
    padding: 16
  },
  nodeBanner: {
    backgroundColor: '#151d2f',
    borderColor: '#06b6d4',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  nodeName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  nodeMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2
  },
  statusPill: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  statusPillText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: 'bold'
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#111827',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#06b6d4',
    textTransform: 'uppercase'
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginVertical: 4
  },
  metricSub: {
    fontSize: 10,
    color: '#64748b'
  },
  controlCard: {
    backgroundColor: '#111827',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  controlSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    maxWidth: 240
  },
  provisionBanner: {
    backgroundColor: '#082f49',
    borderColor: '#0284c7',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center'
  },
  provisionBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginBottom: 4
  },
  provisionBannerSub: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center'
  }
});
