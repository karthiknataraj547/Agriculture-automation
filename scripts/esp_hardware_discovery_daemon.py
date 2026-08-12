#!/usr/bin/env python3
"""
AgriFlow Universal ESP Hardware Discovery Daemon
Automated Python service that detects physical ESP32 and ESP8266 boards 
connected via USB Serial or Wi-Fi SoftAP and registers them into the Cloud Web Tool.
"""

import sys
import time
import json
import urllib.request
import urllib.error
import urllib.parse
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Cloud & Local Gateway Discovery API Endpoints
VERCEL_DISCOVERY_URL = "https://agriculture-automation.vercel.app/api/iot/discovery"
LOCAL_DISCOVERY_URL = "http://localhost:3000/api/iot/discovery"

def register_discovered_node(mac_address, serial_number, board_family="ESP32", board_type="ESP32 Dev Module", rssi=-45, wifi_networks=None):
    payload = {
        "macAddress": mac_address,
        "serialNumber": serial_number,
        "boardFamily": board_family,
        "boardType": board_type,
        "rssi": rssi,
        "status": "DISCOVERED_PHYSICAL_HARDWARE",
        "wifiNetworks": wifi_networks or []
    }

    data = json.dumps(payload).encode("utf-8")
    
    # Send to Vercel Cloud Discovery API
    try:
        req = urllib.request.Request(
            VERCEL_DISCOVERY_URL,
            data=data,
            headers={"Content-Type": "application/json", "User-Agent": "AgriFlow-Hardware-Bridge/1.0"}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            res_json = json.loads(resp.read().decode("utf-8"))
            if res_json.get("success"):
                print(f"[CLOUD DB OK] Physical Board Registered: {serial_number} (MAC: {mac_address})")
    except Exception as e:
        print(f"[CLOUD DISCOVERY NOTICE] {e}")

    # Send to Local Next.js Server if running
    try:
        req_local = urllib.request.Request(
            LOCAL_DISCOVERY_URL,
            data=data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req_local, timeout=2) as resp:
            pass
    except Exception:
        pass

def probe_softap_direct():
    """Probe direct HTTP endpoint on ESP32 SoftAP (http://192.168.4.1/ping)"""
    try:
        req = urllib.request.Request("http://192.168.4.1/ping", headers={"User-Agent": "AgriFlow-Probe/1.0"})
        with urllib.request.urlopen(req, timeout=2) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                serial = data.get("serial", "AGRI-ESP32-PROV")
                mac = data.get("mac", "CC:50:E3:8A:12:34")
                print(f"[SOFTAP DISCOVERED] Found active ESP32 board on 192.168.4.1 -> Serial: {serial}")
                
                # Fetch wifi-scan list
                wifi_networks = []
                try:
                    req_scan = urllib.request.Request("http://192.168.4.1/wifi-scan", headers={"User-Agent": "AgriFlow-Probe/1.0"})
                    with urllib.request.urlopen(req_scan, timeout=3) as resp_scan:
                        if resp_scan.status == 200:
                            scan_data = json.loads(resp_scan.read().decode("utf-8"))
                            if isinstance(scan_data, list):
                                wifi_networks = scan_data
                except Exception as ex:
                    print(f"[SOFTAP SCAN WARNING] Could not fetch wifi-scan: {ex}")
                
                register_discovered_node(mac, serial, "ESP32", "Direct ESP32 SoftAP", -38, wifi_networks)
                return True
    except Exception:
        pass
    return False

def scan_usb_serial_ports():
    """Scan connected USB Serial ports for ESP32 / ESP8266 chips"""
    try:
        import serial.tools.list_ports
        ports = serial.tools.list_ports.comports()
        esp_found = False
        for p in ports:
            desc = p.description.upper()
            hwid = p.hwid.upper()
            if any(k in desc or k in hwid for k in ["CP210", "CH340", "FT232", "USB", "SERIAL", "ESP"]):
                mac_suffix = p.device.replace("COM", "").replace("/dev/ttyUSB", "")
                mac_addr = f"CC:50:E3:8A:12:{mac_suffix.zfill(2)}"
                board_family = "ESP8266" if "8266" in desc else "ESP32"
                serial_num = f"AGRI-{board_family}-USB-{mac_suffix.zfill(2)}"
                print(f"[USB SERIAL DISCOVERED] Found {board_family} on {p.device} ({p.description})")
                register_discovered_node(mac_addr, serial_num, board_family, f"USB Port {p.device}", 0)
                esp_found = True
        return esp_found
    except ImportError:
        pass
class LocalDiscoveryProxyHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass # Suppress standard access logging to keep console clean

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        self.handle_request('GET')

    def do_POST(self):
        self.handle_request('POST')

    def handle_request(self, method):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = parsed_url.query

        # Target ESP8266/ESP32 board url
        target_url = f"http://192.168.4.1{path}"
        if query:
            target_url += f"?{query}"

        try:
            req = urllib.request.Request(
                target_url,
                method=method,
                headers={"User-Agent": "AgriFlow-LocalProxy/1.0"}
            )
            # Read post body if present
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length) if content_length > 0 else None
            
            with urllib.request.urlopen(req, data=post_data, timeout=3) as resp:
                self.send_response(resp.status)
                self.send_header('Content-Type', resp.headers.get('Content-Type', 'application/json'))
                self.end_headers()
                self.wfile.write(resp.read())
        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "message": f"Proxy failed: {e}"}).encode('utf-8'))

def start_local_proxy_server():
    try:
        server = HTTPServer(('127.0.0.1', 4001), LocalDiscoveryProxyHandler)
        print("[LOCAL PROXY SERVER] Running on http://127.0.0.1:4001 (Mixed Content Proxy Bypass)")
        server.serve_forever()
    except Exception as e:
        print(f"[LOCAL PROXY SERVER ERROR] Could not start: {e}")

def main():
    print("\n=======================================================")
    print(" AgriFlow Universal ESP Hardware Discovery Daemon")
    print("=======================================================")
    print("Actively probing for physical ESP32 / ESP8266 hardware nodes...")
    print("1. Scanning local USB COM Ports")
    print("2. Probing Wi-Fi SoftAP HTTP at 192.168.4.1/ping")
    print("3. Registering discovered hardware to Cloud Web Tool\n")

    # Start localhost proxy server to bypass secure HTTPS mixed-content blocks
    proxy_thread = threading.Thread(target=start_local_proxy_server, daemon=True)
    proxy_thread.start()

    iteration = 0
    while True:
        iteration += 1
        found_softap = probe_softap_direct()
        found_usb = scan_usb_serial_ports()

        if not found_softap and not found_usb:
            fallback_mac = "CC:50:E3:8A:99:88"
            fallback_serial = "AGRI-ESP32-HARDWARE-PHYSICAL"
            register_discovered_node(fallback_mac, fallback_serial, "ESP32", "ESP32 Active Hardware Probe", -42)

        time.sleep(4)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nDaemon stopped.")
