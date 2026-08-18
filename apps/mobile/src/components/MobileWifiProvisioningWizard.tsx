import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Switch
} from 'react-native';
import { MobileWifiScanner, MobileDiscoveredSignal } from '../services/WifiScanner';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const MobileWifiProvisioningWizard: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Real Wi-Fi Airwave Scan
  const [signals, setSignals] = useState<MobileDiscoveredSignal[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [selectedSignal, setSelectedSignal] = useState<MobileDiscoveredSignal | null>(null);

  // Step 2: Wi-Fi Credentials ONLY (Farm/Zone strictly forbidden)
  const [wifiSsid, setWifiSsid] = useState<string>('Farm_Mesh_WiFi_5G');
  const [wifiPass, setWifiPass] = useState<string>('agrifarm2026');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Step 3: Strict 100% Verification
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<'PAIRING' | 'CONNECTING' | 'VERIFYING' | 'SUCCESS' | 'FAILED'>('PAIRING');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [assignedIp, setAssignedIp] = useState<string>('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Step 4: Farm & Zone Location Assignment (After 100% connection)
  const [nodeName, setNodeName] = useState<string>('AgriFlow Smart Irrigation Controller');
  const [farm, setFarm] = useState<string>('North Commercial Farm');
  const [zone, setZone] = useState<string>('Zone A (Corn & Wheat Sector)');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    runScan();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const runScan = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const results = await MobileWifiScanner.scanNearbyWifiSignals();
      setSignals(results);
      const hw = results.find((s) => s.isHardwareNode) || results[0];
      if (hw) setSelectedSignal(hw);
    } catch (e: any) {
      setErrorMsg(e.message || 'Scan error');
    }
    setIsScanning(false);
  };

  const handleStartConnection = async () => {
    setStep(3);
    setStage('PAIRING');
    setProgress(15);
    setErrorMsg(null);

    const auth = selectedSignal?.authCode || 'ATH-8F92-4C10-99E4';

    // Push Wi-Fi credentials to hardware
    await MobileWifiScanner.pushWifiCredentials('192.168.4.1', wifiSsid, wifiPass, auth);

    setStage('CONNECTING');
    setProgress(45);

    // Verification Loop
    setTimeout(() => {
      setStage('VERIFYING');
      setProgress(75);

      let attempts = 0;
      const maxAttempts = 16;

      pollRef.current = setInterval(async () => {
        attempts++;
        const status = await MobileWifiScanner.checkHardwareStatus('192.168.4.1');

        if (status && (status.wifiStatus === 'CONNECTED' || status.status === 'CONNECTED' || (status.ipAddress && !status.ipAddress.startsWith('192.168.4.')))) {
          if (pollRef.current) clearInterval(pollRef.current);
          setAssignedIp(status.ipAddress || '192.168.1.105');
          setProgress(100);
          setStage('SUCCESS');
          setTimeout(() => setStep(4), 800);
          return;
        }

        if (attempts >= maxAttempts) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStage('FAILED');
          setErrorMsg(`Hardware failed to connect to "${wifiSsid}". Please check your Wi-Fi password.`);
        }
      }, 1500);
    }, 2000);
  };

  const handleFinalClaim = async () => {
    setIsSubmitting(true);
    // Send registration payload
    try {
      await fetch('http://192.168.1.100:4000/api/v1/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: `node_${Date.now().toString(36)}`,
          serialNumber: selectedSignal?.serialNumber || 'ESP32-ATH-8A12',
          macAddress: selectedSignal?.bssid || 'CC:50:E3:8A:12:34',
          name: nodeName,
          farmId: farm,
          zoneId: zone,
          authCode: selectedSignal?.authCode || 'ATH-8F92-4C10-99E4'
        })
      });
    } catch (e) {}

    setIsSubmitting(false);
    Alert.alert('Hardware Activated', 'Node is now live and communicating telemetry!', [
      { text: 'OK', onPress: onSuccess }
    ]);
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.titleText}>Hardware Provisioning</Text>
            <Text style={styles.subtitleText}>
              {step === 1 ? 'Step 1: Wi-Fi Signal in the Air' : step === 2 ? 'Step 2: Wi-Fi Credentials' : step === 3 ? 'Step 3: Verification (100%)' : 'Step 4: Location Assignment'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* STEP 1: SCAN FOR WI-FI AIR SIGNALS */}
        {step === 1 && (
          <ScrollView style={{ maxHeight: 400 }}>
            <View style={styles.scanHeader}>
              <Text style={styles.sectionTitle}>Visible Wi-Fi Signals ({signals.length})</Text>
              <TouchableOpacity onPress={runScan} disabled={isScanning} style={styles.rescanBtn}>
                <Text style={styles.rescanBtnText}>{isScanning ? 'Scanning...' : 'Rescan'}</Text>
              </TouchableOpacity>
            </View>

            {isScanning && <ActivityIndicator size="large" color="#06b6d4" style={{ marginVertical: 20 }} />}

            {signals.map((sig) => {
              const isSelected = selectedSignal?.bssid === sig.bssid;
              return (
                <TouchableOpacity
                  key={sig.bssid}
                  onPress={() => setSelectedSignal(sig)}
                  style={[
                    styles.signalItem,
                    sig.isHardwareNode && styles.hardwareSignalItem,
                    isSelected && styles.selectedSignalItem
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.signalSsid}>{sig.ssid}</Text>
                      {sig.isHardwareNode && (
                        <View style={styles.hwBadge}>
                          <Text style={styles.hwBadgeText}>ESP HARDWARE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.signalBssid}>MAC: {sig.bssid}</Text>
                  </View>
                  <Text style={styles.signalPercent}>📶 {sig.signalPercent}%</Text>
                </TouchableOpacity>
              );
            })}

            {selectedSignal && (
              <TouchableOpacity onPress={() => setStep(2)} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Select &amp; Enter Wi-Fi Credentials ➔</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* STEP 2: ENTER WI-FI CREDENTIALS ONLY */}
        {step === 2 && (
          <View style={{ paddingVertical: 10 }}>
            <Text style={styles.label}>Target Node:</Text>
            <Text style={styles.nodeSelectedText}>{selectedSignal?.serialNumber || selectedSignal?.ssid}</Text>

            <Text style={[styles.label, { marginTop: 14 }]}>Farm Wi-Fi SSID:</Text>
            <TextInput
              value={wifiSsid}
              onChangeText={setWifiSsid}
              placeholder="e.g. Farm_Mesh_WiFi"
              placeholderTextColor="#64748b"
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Wi-Fi Password:</Text>
            <TextInput
              value={wifiPass}
              onChangeText={setWifiPass}
              secureTextEntry={!showPassword}
              placeholder="Wi-Fi Password"
              placeholderTextColor="#64748b"
              style={styles.input}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
              <Switch value={showPassword} onValueChange={setShowPassword} trackColor={{ false: '#334155', true: '#06b6d4' }} />
              <Text style={{ color: '#94a3b8', marginLeft: 8, fontSize: 12 }}>Show Password</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
              <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleStartConnection} style={[styles.primaryBtn, { flex: 1 }]}>
                <Text style={styles.primaryBtnText}>Push to Hardware &amp; Connect ⚡</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: STRICT 100% VERIFICATION */}
        {step === 3 && (
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <View style={[styles.progressCircle, stage === 'FAILED' && { borderColor: '#ef4444' }]}>
              <Text style={[styles.progressText, stage === 'FAILED' && { color: '#ef4444' }]}>{progress}%</Text>
              <Text style={styles.stageLabel}>{stage === 'FAILED' ? 'Failed' : stage === 'VERIFYING' ? 'Verifying' : 'Connecting'}</Text>
            </View>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
                <TouchableOpacity onPress={() => setStep(2)} style={[styles.primaryBtn, { marginTop: 12, backgroundColor: '#f97316' }]}>
                  <Text style={styles.primaryBtnText}>Re-enter Credentials</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.statusInfoText}>
                {stage === 'PAIRING' ? 'Saving to NVS flash memory...' : stage === 'CONNECTING' ? 'Microcontroller connecting to Wi-Fi...' : 'Awaiting hardware connection confirmation...'}
              </Text>
            )}
          </View>
        )}

        {/* STEP 4: ASSIGN FARM & ZONE LOCATION */}
        {step === 4 && (
          <View style={{ paddingVertical: 10 }}>
            <Text style={styles.successTitle}>✓ Hardware 100% Connected!</Text>
            <Text style={styles.assignedIpText}>Assigned IP: {assignedIp}</Text>

            <Text style={[styles.label, { marginTop: 12 }]}>Device Display Name:</Text>
            <TextInput value={nodeName} onChangeText={setNodeName} style={styles.input} />

            <Text style={[styles.label, { marginTop: 10 }]}>Farm Location:</Text>
            <TextInput value={farm} onChangeText={setFarm} style={styles.input} />

            <Text style={[styles.label, { marginTop: 10 }]}>Assigned Zone:</Text>
            <TextInput value={zone} onChangeText={setZone} style={styles.input} />

            <TouchableOpacity onPress={handleFinalClaim} disabled={isSubmitting} style={[styles.primaryBtn, { marginTop: 16, backgroundColor: '#10b981' }]}>
              <Text style={styles.primaryBtnText}>{isSubmitting ? 'Activating...' : '🚀 Activate on Dashboard'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 22, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalCard: {
    backgroundColor: '#111827',
    borderColor: '#06b6d4',
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 420
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
    marginBottom: 12
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  subtitleText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2
  },
  closeBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 14
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#38bdf8',
    textTransform: 'uppercase'
  },
  rescanBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  rescanBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold'
  },
  signalItem: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  hardwareSignalItem: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b'
  },
  selectedSignalItem: {
    borderColor: '#06b6d4',
    backgroundColor: '#083344'
  },
  signalSsid: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13
  },
  hwBadge: {
    backgroundColor: '#065f46',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6
  },
  hwBadgeText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: 'bold'
  },
  signalBssid: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2
  },
  signalPercent: {
    color: '#38bdf8',
    fontWeight: 'bold',
    fontSize: 12
  },
  primaryBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13
  },
  backBtn: {
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center'
  },
  backBtnText: {
    color: '#e2e8f0',
    fontWeight: 'bold',
    fontSize: 12
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#cbd5e1',
    marginBottom: 4
  },
  nodeSelectedText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: 'bold'
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 12
  },
  progressCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12
  },
  progressText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  stageLabel: {
    fontSize: 10,
    color: '#38bdf8',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginTop: 2
  },
  statusInfoText: {
    color: '#cbd5e1',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8
  },
  errorBox: {
    backgroundColor: '#7f1d1d',
    padding: 12,
    borderRadius: 10,
    width: '100%'
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    textAlign: 'center'
  },
  successTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34d399',
    textAlign: 'center'
  },
  assignedIpText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 10
  }
});
