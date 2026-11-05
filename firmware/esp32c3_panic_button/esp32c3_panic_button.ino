#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <ESPmDNS.h>
#include "esp_wifi.h"
#include "logo_data.h"

// =========================================================================
// BEMS POLRESTA BANDAR LAMPUNG - TRIPLE MODE (HTTPS CLOUD + USB + WI-FI AP)
// Perangkat: ESP32-C3 SuperMini / DevKit
// Lokasi / Unit: BANK MANDIRI KCP Tanjungkarang Kartini
// Pinout Sesuai Board:
//   - Tombol Fisik:  GPIO 1 (INPUT_PULLUP)
//   - Tombol Onboard:GPIO 9 (BOOT)
//   - LED 1:         GPIO 0 (OUTPUT)
//   - LED 2:         GPIO 4 (OUTPUT)
//   - Buzzer:        GPIO 2 (OUTPUT)
// =========================================================================

// --- 1. Konfigurasi Wi-Fi Hotspot Target (HANYA 1 TARGET RESMI) ---
const char* sta_ssid     = "RENO123";
const char* sta_password = "12345678";

// --- 2. URL Endpoint Server Vercel HTTPS & Identitas IoT BEMS ---
const char* triggerUrl   = "https://bms-project-ochre.vercel.app/api/v1/emergency/trigger";
const char* heartbeatUrl = "https://bms-project-ochre.vercel.app/api/v1/emergency/heartbeat";

// Header rahasia otentikasi perangkat IoT & UID unik
const char* deviceToken  = "b3m5-p0lr35t4-53cr3t-t0k3n"; // Nilai header X-Device-Token
const char* deviceUid    = "ESPC32-B";                    // Sesuai Bank Mandiri KCP Kartini

// --- 3. Pengaturan Wi-Fi Access Point Cadangan (Portal Darurat Offline) ---
const char* ssid = "BEMS-Bank-Mandiri";
const char* password = "12345678";

// --- Penataan Pin Hardware ---
const int buttonPin = 1;       // Tombol Fisik Eksternal (GPIO 1)
const int bootButtonPin = 9;   // Tombol On-Board BOOT ESP32-C3 (GPIO 9)
const int led1Pin = 0;         // LED 1 (GPIO 0)
const int led2Pin = 4;         // LED 2 (GPIO 4)
const int buzzerPin = 2;       // Buzzer (GPIO 2)

const bool BUZZER_ACTIVE_HIGH = true;
const bool SILENT_ALARM_MODE = true; // Mode Silent Alarm di lokasi bank

WebServer server(80);
const byte DNS_PORT = 53;
DNSServer dnsServer;

int statusLed1 = 0;
int statusLed2 = 0;
int statusBuzzer = 0;
bool isPanicTriggered = false;

// Filter Debounce & Anti-Noise Tombol
int buttonState = HIGH;
int lastReading = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long DEBOUNCE_DELAY = 25;

// Cooldown Lock: Mencegah trigger bertubi-tubi (3.5 detik)
unsigned long panicCooldownTime = 0;
const unsigned long PANIC_COOLDOWN_MS = 3500;

unsigned long buzzerOffTime = 0;
bool isBuzzerBeeping = false;
unsigned long lastHeartbeat = 0;

// =========================================================================
// HALAMAN WEB MODERN (RESPONSIVE + FULL POPUP MERAH STANDAR POLRESTA)
// =========================================================================
const char HTML_PAGE[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>BEMS Panic Button - Bank Mandiri</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: #070d1e; color: #ffffff; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; }
        .header { margin-bottom: 24px; display: flex; flex-direction: column; align-items: center; }
        .siger-logo { width: 140px; max-width: 65%; height: auto; margin-bottom: 14px; filter: drop-shadow(0 4px 16px rgba(251,191,36,0.35)); }
        .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); margin-bottom: 12px; }
        .badge.active { background: rgba(239,68,68,0.2); color: #ef4444; border-color: #ef4444; animation: pulse 1s infinite; }
        h1 { font-size: 22px; font-weight: 900; letter-spacing: 0.02em; color: #ffffff; margin-bottom: 6px; }
        p.sub { font-size: 13px; color: #94a3b8; font-weight: 500; }
        
        .panic-wrapper { position: relative; margin: 16px 0; }
        .panic-btn {
            width: 220px;
            height: 220px;
            border-radius: 50%;
            background: radial-gradient(circle at 35% 35%, #ef4444 0%, #b91c1c 70%, #7f1d1d 100%);
            border: 8px solid rgba(255,255,255,0.15);
            box-shadow: 0 15px 35px rgba(220,38,38,0.5), inset 0 -8px 16px rgba(0,0,0,0.4), inset 0 8px 16px rgba(255,255,255,0.3);
            color: #ffffff;
            cursor: pointer;
            outline: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.15s ease;
            user-select: none;
        }
        .panic-btn:active {
            transform: scale(0.94);
            box-shadow: 0 5px 15px rgba(220,38,38,0.4), inset 0 4px 10px rgba(0,0,0,0.6);
        }
        .panic-btn.triggered {
            background: radial-gradient(circle at 35% 35%, #dc2626 0%, #991b1b 70%, #450a0a 100%);
            box-shadow: 0 0 50px rgba(239,68,68,0.8), inset 0 4px 12px rgba(0,0,0,0.7);
            border-color: #fca5a5;
            animation: pulse-ring 1.5s infinite;
        }
        .panic-icon { font-size: 48px; line-height: 1; }
        .panic-text { font-size: 16px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; }
        .panic-sub { font-size: 11px; opacity: 0.85; font-weight: 600; }
        
        .status-msg { margin-top: 20px; font-size: 13px; font-weight: 700; color: #94a3b8; min-height: 20px; }
        .status-msg.active { color: #f87171; }

        @keyframes pulse-ring {
            0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
            70% { box-shadow: 0 0 0 25px rgba(239,68,68,0); }
            100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    </style>
</head>
<body>
    <div class="header">
        <img src="/logo.jpg" alt="Logo Siger Polresta" class="siger-logo">
        <div id="badgeStatus" class="badge">🟢 SIAGA TERHUBUNG</div>
        <h1>BEMS PANIC BUTTON</h1>
        <p class="sub">Bank Mandiri KCP Kartini • Polresta Bandar Lampung</p>
    </div>

    <div class="panic-wrapper">
        <button id="panicButton" class="panic-btn" onpointerdown="handlePress(event)">
            <span class="panic-icon">🚨</span>
            <span class="panic-text">PANIC BUTTON</span>
            <span class="panic-sub">TEKAN UNTUK BAHAYA</span>
        </button>
    </div>

    <div id="statusMessage" class="status-msg">Tekan tombol saat terjadi darurat</div>

    <script>
        let isTriggered = false;
        function updateUI(active) {
            isTriggered = active;
            const btn = document.getElementById('panicButton');
            const badge = document.getElementById('badgeStatus');
            const msg = document.getElementById('statusMessage');

            if (active) {
                btn.classList.add('triggered');
                badge.classList.add('active');
                badge.innerText = '🔴 DARURAT DIAKTIFKAN';
                msg.classList.add('active');
                msg.innerText = 'Sinyal bahaya telah terkirim ke Command Center SPKT!';
            } else {
                btn.classList.remove('triggered');
                badge.classList.remove('active');
                badge.innerText = '🟢 SIAGA TERHUBUNG';
                msg.classList.remove('active');
                msg.innerText = 'Tekan tombol saat terjadi darurat';
            }
        }

        function handlePress(e) {
            e.preventDefault();
            if (!isTriggered) {
                fetch('/panic')
                    .then(r => r.json())
                    .then(data => updateUI(data.panic))
                    .catch(() => updateUI(true));
            }
        }

        setInterval(() => {
            fetch('/status')
                .then(r => r.json())
                .then(data => updateUI(data.panic))
                .catch(() => {});
        }, 1500);
    </script>
</body>
</html>
)rawliteral";

// =========================================================================
// HELPER HARDWARE BUZZER & LED
// =========================================================================
void setBuzzerOutput(bool active) {
  if (SILENT_ALARM_MODE) {
    pinMode(buzzerPin, INPUT);
    return;
  }
  pinMode(buzzerPin, OUTPUT);
  if (BUZZER_ACTIVE_HIGH) {
    digitalWrite(buzzerPin, active ? HIGH : LOW);
  } else {
    digitalWrite(buzzerPin, active ? LOW : HIGH);
  }
}

// =========================================================================
// TRANSMISI HTTP POST VIA HTTPS (WIFICLIENTSECURE + VERCEL SSL)
// =========================================================================
bool sendEmergencyTriggerHTTPS() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ [HTTPS POST] Wi-Fi belum tersambung ke Hotspot RENO123.");
    return false;
  }

  Serial.println("\n🚨 [HTTPS POST] MENGIRIM SINYAL DARURAT KE SERVER VERCEL...");

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;
  https.setTimeout(7000);

  bool requestSuccess = false;
  Serial.print("🌐 [TARGET URL]: ");
  Serial.println(triggerUrl);

  if (https.begin(client, triggerUrl)) {
    https.addHeader("Content-Type", "application/json");
    https.addHeader("X-Device-Token", deviceToken);

    String payload = "{\"device_uid\":\"" + String(deviceUid) + "\"}";
    Serial.print("📦 [PAYLOAD]: ");
    Serial.println(payload);

    int httpCode = https.POST(payload);

    if (httpCode > 0) {
      Serial.printf("✅ [ALARM TERKIRIM KE VERCEL!] Status Code: %d\n", httpCode);
      String response = https.getString();
      Serial.print("📥 [SERVER RESPONSE]: ");
      Serial.println(response);
      requestSuccess = (httpCode >= 200 && httpCode < 300);
    } else {
      Serial.printf("❌ [HTTPS ERROR] Gagal mengirim POST! Error: %s (Kode: %d)\n",
                    https.errorToString(httpCode).c_str(), httpCode);
    }
    https.end();
  } else {
    Serial.println("❌ [HTTPS ERROR] Inisialisasi https.begin() gagal!");
  }

  return requestSuccess;
}

// Pengiriman detak jantung (Heartbeat) berkala ke Vercel via HTTPS
void sendHeartbeatHTTPS() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;
  https.setTimeout(5000);

  if (https.begin(client, heartbeatUrl)) {
    https.addHeader("Content-Type", "application/json");
    https.addHeader("X-Device-Token", deviceToken);

    int rssi = WiFi.RSSI();
    String payload = "{\"device_uid\":\"" + String(deviceUid) + "\",\"rssi\":" + String(rssi) + ",\"battery_level\":100}";

    int httpCode = https.POST(payload);
    if (httpCode > 0) {
      Serial.printf("💓 [HEARTBEAT HTTPS] Sukses (Code: %d, RSSI: %d dBm) -> Web: STANDBY (Hijau)\n", httpCode, rssi);
      if (!isPanicTriggered) {
        digitalWrite(led1Pin, HIGH);
        delay(50);
        digitalWrite(led1Pin, LOW);
      }
    } else {
      Serial.printf("⚠️ [HEARTBEAT HTTPS] Gagal: %s (%d)\n", https.errorToString(httpCode).c_str(), httpCode);
    }
    https.end();
  }
}

void triggerAlarmAction() {
  panicCooldownTime = millis() + PANIC_COOLDOWN_MS;

  // 1. Kirim sinyal USB Serial untuk Dashboard Web (Web Serial COM8)
  Serial.println("PANIC:ESPC32-B");

  // 2. Set flag status darurat
  isPanicTriggered = true;
  setBuzzerOutput(false);
  isBuzzerBeeping = false;

  // 3. Nyalakan LED darurat
  digitalWrite(led1Pin, HIGH);
  digitalWrite(led2Pin, HIGH);

  // 4. Transmisi sinyal darurat ke Cloud HTTPS Vercel
  sendEmergencyTriggerHTTPS();
}

void resetAlarmState() {
  isPanicTriggered = false;
  statusLed1 = 0;
  statusLed2 = 0;
  statusBuzzer = 0;
  digitalWrite(led1Pin, LOW);
  digitalWrite(led2Pin, LOW);
  setBuzzerOutput(false);
  Serial.println("RESET:ESPC32-B");
}

void sendStatusJSON() {
  String json = "{\"led1\":" + String(statusLed1) +
                ",\"led2\":" + String(statusLed2) +
                ",\"buzzer\":" + String(statusBuzzer) +
                ",\"panic\":" + (isPanicTriggered ? "true" : "false") + "}";
  server.send(200, "application/json", json);
}

// =========================================================================
// HELPER KONEKSI WI-FI INTERNET: HANYA KE HOTSPOT RENO123 (SANDI: 12345678)
// =========================================================================
bool connectToInternetWiFi() {
  Serial.println("\n==========================================");
  Serial.println("🌐 [WI-FI INTERNET] Menghubungkan ke Hotspot");
  Serial.printf("📶 Nama Wi-Fi (SSID) : %s\n", sta_ssid);
  Serial.printf("🔑 Kata Sandi        : %s\n", sta_password);
  Serial.printf("📡 ESP32 MAC         : %s\n", WiFi.macAddress().c_str());
  Serial.println("==========================================");

  // 1. Reset driver Wi-Fi bersih
  WiFi.persistent(false);
  WiFi.disconnect(true, true);
  delay(300);

  // 2. Mode Station murni
  WiFi.mode(WIFI_STA);
  delay(100);
  esp_wifi_set_max_tx_power(78); // 19.5 dBm daya transmisi maksimal

  // 3. Konfigurasi PMF untuk kompatibilitas Hotspot Android/OPPO
  wifi_config_t conf;
  esp_wifi_get_config(WIFI_IF_STA, &conf);
  conf.sta.pmf_cfg.capable = true;
  conf.sta.pmf_cfg.required = false;
  esp_wifi_set_config(WIFI_IF_STA, &conf);

  // 4. Langsung sambungkan ke RENO123 dengan sandi 12345678
  Serial.printf("⏳ Menyambung ke '%s'...\n", sta_ssid);
  WiFi.begin(sta_ssid, sta_password);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(400);
    Serial.print(".");
  }

  // 5. Evaluasi Hasil
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n\n🎉 ==========================================");
    Serial.println("✅ [BERHASIL TERHUBUNG KE HOTSPOT RENO123!]");
    Serial.printf("   SSID Aktif     : %s\n", WiFi.SSID().c_str());
    Serial.printf("   IP Lokal ESP32 : %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("   Gateway Router : %s\n", WiFi.gatewayIP().toString().c_str());
    Serial.printf("   Kekuatan Sinyal: %d dBm\n", WiFi.RSSI());
    Serial.printf("   Wi-Fi Channel  : %d\n", WiFi.channel());
    Serial.println("==========================================");

    digitalWrite(led1Pin, HIGH); digitalWrite(led2Pin, HIGH);
    delay(200);
    digitalWrite(led1Pin, LOW); digitalWrite(led2Pin, LOW);

    Serial.println("📡 Mengirim detak jantung STANDBY ke Vercel...");
    sendHeartbeatHTTPS();
    return true;
  } else {
    Serial.printf("\n❌ Belum berhasil menyambung ke '%s' (Status Code: %d)\n", sta_ssid, (int)WiFi.status());
    Serial.println("👉 Pastikan Hotspot HP 'RENO123' aktif di frekuensi 2.4 GHz dan jenis keamanan WPA2-Personal.");
    return false;
  }
}

// =========================================================================
// SETUP
// =========================================================================
void setup() {
  Serial.begin(115200);
  delay(1000); // Beri waktu USB CDC siap

  // Setup Pin Hardware
  pinMode(buttonPin, INPUT_PULLUP);      // GPIO 1 (Tombol Eksternal)
  pinMode(bootButtonPin, INPUT_PULLUP);  // GPIO 9 (Tombol On-Board BOOT ESP32-C3)
  pinMode(led1Pin, OUTPUT);
  pinMode(led2Pin, OUTPUT);
  setBuzzerOutput(false);

  digitalWrite(led1Pin, LOW);
  digitalWrite(led2Pin, LOW);

  // Sambungkan ke Hotspot RENO123
  connectToInternetWiFi();

  // Konfigurasi SoftAP Cadangan (Gunakan channel yang sama dengan STA agar tidak bentrok)
  WiFi.mode(WIFI_AP_STA);
  IPAddress local_ip(192, 168, 4, 1);
  IPAddress gateway(192, 168, 4, 1);
  IPAddress subnet(255, 255, 255, 0);
  WiFi.softAPConfig(local_ip, gateway, subnet);
  int apChan = (WiFi.status() == WL_CONNECTED) ? WiFi.channel() : 1;
  bool apSuccess = WiFi.softAP(ssid, password, apChan);

  dnsServer.setErrorReplyCode(DNSReplyCode::NoError);
  dnsServer.start(DNS_PORT, "*", local_ip);
  MDNS.begin("bems");

  Serial.println("\n==========================================");
  Serial.println("  BEMS ESP32-C3 SMART MONITORING          ");
  Serial.println("  POLRESTA BANDAR LAMPUNG                 ");
  Serial.println("  Unit / Lokasi: Bank Mandiri KCP Kartini ");
  Serial.println("==========================================");
  Serial.print("🟢 Status Wi-Fi AP:    "); Serial.println(apSuccess ? "AKTIF (192.168.4.1)" : "GAGAL");
  Serial.print("📶 SSID AP Lokal:      "); Serial.println(ssid);
  Serial.print("🌐 Alamat IP Web AP:   http://"); Serial.println(WiFi.softAPIP());
  Serial.print("🚀 Target HTTPS Cloud: "); Serial.println(triggerUrl);
  Serial.print("🆔 Device UID:         "); Serial.println(deviceUid);
  Serial.print("🔑 Secret Auth Token:  "); Serial.println(deviceToken);
  Serial.println("⚡ Serial Protocol:     ESPC32-B");
  Serial.println("==========================================");

  // Routing HTTP Server
  server.on("/", HTTP_GET, []() {
    server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    server.send_P(200, "text/html", HTML_PAGE);
  });

  server.on("/logo.jpg", HTTP_GET, []() {
    server.sendHeader("Cache-Control", "public, max-age=604800");
    server.send_P(200, "image/jpeg", (const char*)LOGO_JPG, sizeof(LOGO_JPG));
  });

  server.on("/status", HTTP_GET, []() {
    server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    sendStatusJSON();
  });

  server.on("/panic", HTTP_GET, []() {
    server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    triggerAlarmAction();
    sendStatusJSON();
  });

  server.on("/reset_panic", HTTP_GET, []() {
    server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    resetAlarmState();
    sendStatusJSON();
  });

  server.onNotFound([]() {
    server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    server.send_P(200, "text/html", HTML_PAGE);
  });

  server.begin();
  Serial.println("🟢 [SISTEM] Server Web Siap di http://192.168.4.1 atau http://bems.local");

  digitalWrite(led1Pin, HIGH);
  delay(100);
  digitalWrite(led1Pin, LOW);

  delay(200);
  buttonState = digitalRead(buttonPin);
  lastReading = buttonState;
  lastDebounceTime = millis();
  panicCooldownTime = millis() + 1500;
}

// =========================================================================
// MAIN LOOP
// =========================================================================
void loop() {
  dnsServer.processNextRequest();
  server.handleClient();
  unsigned long now = millis();

  // --- 0. BACA PERINTAH DARI USB SERIAL (DARI DASHBOARD NEXT.JS) ---
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.startsWith("RESET")) {
      resetAlarmState();
    }
  }

  // --- 1. DETEKSI DUAL TOMBOL FISIK (GPIO 1 Eksternal ATAU GPIO 9 On-Board BOOT) ---
  if (now >= panicCooldownTime) {
    int readExt = digitalRead(buttonPin);
    int readBoot = digitalRead(bootButtonPin);

    int reading = (readExt == LOW || readBoot == LOW) ? LOW : HIGH;

    if (reading != lastReading) {
      lastDebounceTime = now;
    }

    if ((now - lastDebounceTime) > DEBOUNCE_DELAY) {
      if (reading != buttonState) {
        buttonState = reading;

        if (buttonState == LOW) {
          Serial.println("\n🔥 [TOMBOL FISIK DITEKAN!] Tombol terdeteksi aktif.");
          if (readExt == LOW) Serial.println("   -> Pemicu: GPIO 1 (Tombol Eksternal)");
          if (readBoot == LOW) Serial.println("   -> Pemicu: GPIO 9 (Tombol On-Board BOOT)");

          digitalWrite(led1Pin, HIGH);
          digitalWrite(led2Pin, HIGH);

          triggerAlarmAction();
        } else {
          if (!statusLed1) digitalWrite(led1Pin, LOW);
          if (!statusLed2) digitalWrite(led2Pin, LOW);
        }
      }
    }
    lastReading = reading;
  }

  // --- 2. TIMER NON-BLOCKING MATIKAN BUZZER ---
  if (isBuzzerBeeping && now >= buzzerOffTime) {
    isBuzzerBeeping = false;
    if (!statusBuzzer) {
      setBuzzerOutput(false);
    }
  }

  // --- 3. HEARTBEAT TIAP 5 DETIK KE SERIAL USB (KABEL COM8) ---
  if (now - lastHeartbeat >= 5000) {
    lastHeartbeat = now;
    Serial.println("HEARTBEAT:ESPC32-B");
  }

  // --- 4. AUTO-RECONNECT WI-FI INTERNET JIKA TERPUTUS (TIAP 20 DETIK) ---
  static unsigned long lastWifiCheck = 0;
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWifiCheck >= 20000) {
      lastWifiCheck = now;
      Serial.println("🔄 [Wi-Fi] Belum terhubung. Mencoba menyambung kembali (WiFi.reconnect)...");
      WiFi.reconnect();
    }
  }

  // --- 5. HEARTBEAT PERIODIK KE VERCEL HTTPS (TIAP 5 DETIK JIKA WI-FI TERKONEKSI) ---
  static unsigned long lastHttpsHeartbeat = 0;
  if (WiFi.status() == WL_CONNECTED) {
    if (now - lastHttpsHeartbeat >= 5000) {
      lastHttpsHeartbeat = now;
      sendHeartbeatHTTPS();
    }
  }
}
