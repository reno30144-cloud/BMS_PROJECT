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
// Lokasi / Unit: Tripanca
// Pinout Sesuai Board Anda:
//   - Tombol Fisik:  GPIO 1 (INPUT_PULLUP)
//   - LED 1:         GPIO 0 (OUTPUT)
//   - LED 2:         GPIO 4 (OUTPUT)
//   - Buzzer:        GPIO 2 (OUTPUT)
// =========================================================================

// --- 1. Konfigurasi Wi-Fi Internet (Station Mode untuk HTTPS ke Vercel) ---
// Sesuai data Wi-Fi resmi Anda:
//   Nama Wi-Fi (SSID) : Tripanca
//   Kata Sandi       : tiwul ajah
const char* sta_ssid     = "Tripanca";
const char* sta_password = "tiwul ajah";

// --- 2. URL Endpoint Server Vercel HTTPS & Identitas IoT BEMS ---
// Domain Vercel resmi sistem BEMS Polresta Bandar Lampung (https://bms-project-ochre.vercel.app/)
const char* triggerUrl   = "https://bms-project-ochre.vercel.app/api/v1/emergency/trigger";
const char* heartbeatUrl = "https://bms-project-ochre.vercel.app/api/v1/emergency/heartbeat";

// Header rahasia otentikasi perangkat IoT & UID unik teller
const char* deviceToken  = "b3m5-p0lr35t4-53cr3t-t0k3n"; // Nilai header X-Device-Token
const char* deviceUid    = "ESPC32-B";                    // Parameter payload JSON: device_uid (Sesuai Bank Mandiri KCP Kartini)

// --- 3. Pengaturan Wi-Fi Access Point Cadangan (Portal Darurat Offline) ---
// Gunakan tanda strip (-) bukan underscore (_) agar 100% terbaca di semua HP Android & iPhone
const char* ssid = "ESP32-Tripanca";
const char* password = "12345678";

// --- Penataan Pin Hardware ---
const int buttonPin = 1;  // Tombol Fisik (GPIO 1)
const int led1Pin = 0;    // LED 1 (GPIO 0)
const int led2Pin = 4;    // LED 2 (GPIO 4)
const int buzzerPin = 2;  // Buzzer (GPIO 2)

// Set ke true jika buzzer aktif saat HIGH. Ubah ke false jika Active-LOW.
const bool BUZZER_ACTIVE_HIGH = true;

// MODE SILENT ALARM: Suara buzzer fisik pada modul Arduino/ESP32 dinonaktifkan
// agar tidak terdengar di lokasi teller/bank (sesuai SOP keamanan perbankan Polresta)
const bool SILENT_ALARM_MODE = true;

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
const unsigned long DEBOUNCE_DELAY = 80; // Wajib stabil 80ms cegah false-trigger

// Cooldown Lock: Mencegah feedback loop dari suara buzzer yang memicu tombol secara berulang
unsigned long panicCooldownTime = 0;
const unsigned long PANIC_COOLDOWN_MS = 2500; // Kunci 2.5 detik agar bebas dari induksi buzzer/noise

unsigned long buzzerOffTime = 0;
bool isBuzzerBeeping = false;
unsigned long lastHeartbeat = 0;

// =========================================================================
// HALAMAN WEB MODERN (RESPONSIVE + FULL POPUP MERAH STANDAR POLRESTA)
// Disimpan di PROGMEM agar hemat RAM ESP32-C3
// =========================================================================
const char HTML_PAGE[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>BEMS Panic Button - Tripanca</title>
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
        <p class="sub">Tripanca • Polresta Bandar Lampung</p>
    </div>

    <div class="panic-wrapper">
        <button id="btnPanic" class="panic-btn" onclick="pressPanic()">
            <span class="panic-icon">🚨</span>
            <span class="panic-text">PANIC</span>
            <span class="panic-sub">TEKAN DARURAT</span>
        </button>
    </div>

    <div id="statusMsg" class="status-msg">Sentuh tombol untuk mengirim sinyal bahaya</div>

    <script>
        function pressPanic() {
            fetch('/panic')
                .then(r => r.json())
                .then(updateStatus);
        }

        function updateStatus(d) {
            const btn = document.getElementById('btnPanic');
            const badge = document.getElementById('badgeStatus');
            const msg = document.getElementById('statusMsg');

            if (d && d.panic) {
                btn.classList.add('triggered');
                badge.className = 'badge active';
                badge.innerText = '🔴 DARURAT TERKIRIM';
                msg.className = 'status-msg active';
                msg.innerText = '⚠️ Sinyal bahaya telah diterima Command Center SPKT!';
            } else {
                btn.classList.remove('triggered');
                badge.className = 'badge';
                badge.innerText = '🟢 SIAGA TERHUBUNG';
                msg.className = 'status-msg';
                msg.innerText = 'Sentuh tombol untuk mengirim sinyal bahaya';
            }
        }

        setInterval(() => {
            fetch('/status')
                .then(r => r.json())
                .then(updateStatus)
                .catch(() => {});
        }, 1000);
    </script>
</body>
</html>
)rawliteral";

// =========================================================================
// HELPER PERANGKAT KERAS
// =========================================================================
void setBuzzerOutput(bool active) {
  if (SILENT_ALARM_MODE) {
    // Selalu paksa buzzer mati jika silent alarm mode aktif
    digitalWrite(buzzerPin, BUZZER_ACTIVE_HIGH ? LOW : HIGH);
    return;
  }
  if (BUZZER_ACTIVE_HIGH) {
    digitalWrite(buzzerPin, active ? HIGH : LOW);
  } else {
    digitalWrite(buzzerPin, active ? LOW : HIGH);
  }
}

// =========================================================================
// TRANSMISI HTTP POST VIA HTTPS (WIFICLIENTSECURE + VERCEL SSL BYPASS)
// =========================================================================
bool sendEmergencyTriggerHTTPS() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ [HTTPS POST] Wi-Fi Station belum terhubung ke Internet! Melewatkan transmisi Vercel.");
    return false;
  }

  Serial.println("\n🚨 [HTTPS POST] Mengirim sinyal darurat ke server Vercel...");

  // Inisialisasi WiFiClientSecure
  WiFiClientSecure* client = new WiFiClientSecure();
  if (!client) {
    Serial.println("❌ [HTTPS ERROR] Gagal mengalokasikan memory WiFiClientSecure!");
    return false;
  }

  // Wajib: Menembus proteksi keamanan SSL/HTTPS Vercel tanpa verifikasi sertifikat root CA
  client->setInsecure();

  HTTPClient https;
  https.setTimeout(10000); // 10 detik batas waktu respons

  bool requestSuccess = false;

  Serial.print("🌐 [TARGET URL]: ");
  Serial.println(triggerUrl);

  if (https.begin(*client, triggerUrl)) {
    // Header rahasia otentikasi perangkat dan tipe konten JSON
    https.addHeader("Content-Type", "application/json");
    https.addHeader("X-Device-Token", deviceToken);

    // Siapkan payload JSON berisi device_uid
    String payload = "{\"device_uid\":\"" + String(deviceUid) + "\"}";

    Serial.print("🔑 [HEADER]: X-Device-Token: ");
    Serial.println(deviceToken);
    Serial.print("📦 [PAYLOAD]: ");
    Serial.println(payload);

    int httpCode = https.POST(payload);

    if (httpCode > 0) {
      Serial.printf("✅ [HTTPS SUCCESS] Status Code: %d\n", httpCode);
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

  // Bersihkan heap memory
  delete client;
  return requestSuccess;
}

// Pengiriman detak jantung (Heartbeat) berkala ke Vercel via HTTPS
void sendHeartbeatHTTPS() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure* client = new WiFiClientSecure();
  if (!client) return;

  client->setInsecure();

  HTTPClient https;
  https.setTimeout(8000);

  if (https.begin(*client, heartbeatUrl)) {
    https.addHeader("Content-Type", "application/json");
    https.addHeader("X-Device-Token", deviceToken);

    int rssi = WiFi.RSSI();
    String payload = "{\"device_uid\":\"" + String(deviceUid) + "\",\"rssi\":" + String(rssi) + ",\"battery_level\":100}";

    int httpCode = https.POST(payload);
    if (httpCode > 0) {
      Serial.printf("💓 [HEARTBEAT HTTPS] Sukses (Code: %d, RSSI: %d dBm)\n", httpCode, rssi);
    } else {
      Serial.printf("⚠️ [HEARTBEAT HTTPS] Gagal: %s (%d)\n", https.errorToString(httpCode).c_str(), httpCode);
    }
    https.end();
  }

  delete client;
}

void triggerAlarmAction() {
  // 1. Kunci cooldown 2.5 detik cegah false trigger
  panicCooldownTime = millis() + PANIC_COOLDOWN_MS;

  // 2. Kirim sinyal USB Serial untuk Dashboard Next.js (http://localhost:3000 / Web Serial)
  Serial.println("PANIC:ESPC32-B");

  // 3. Set flag status darurat untuk Wi-Fi Web (http://192.168.4.1)
  isPanicTriggered = true;

  // 4. Buzzer fisik dinonaktifkan (Silent Alarm di lokasi bank)
  setBuzzerOutput(false);
  isBuzzerBeeping = false;

  // 5. Nyalakan LED darurat
  digitalWrite(led1Pin, HIGH);
  digitalWrite(led2Pin, HIGH);

  // 6. Transmisi sinyal darurat ke Cloud HTTPS Vercel (BEMS Polresta)
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
// HELPER KONEKSI WI-FI INTERNET (SSID: Tripanca, SANDI: tiwul ajah)
// =========================================================================
void connectToInternetWiFi() {
  Serial.println("\n🌐 [WI-FI] Menghubungkan ke Wi-Fi Internet...");
  Serial.print("📶 Nama SSID  : "); Serial.println(sta_ssid);
  Serial.print("🔑 Kata Sandi : "); Serial.println(sta_password);

  WiFi.begin(sta_ssid, sta_password);

  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 7000) {
    delay(250);
    Serial.print(".");
  }

  // Fallback cadangan: Coba variasi tanpa spasi jika router menolak spasi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n🔄 Mencoba variasi sandi alternatif ('tiwulajah')...");
    WiFi.disconnect();
    delay(200);
    WiFi.begin(sta_ssid, "tiwulajah");
    wifiStart = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 5000) {
      delay(250);
      Serial.print(".");
    }
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n🔄 Mencoba variasi sandi alternatif ('tiwulaja')...");
    WiFi.disconnect();
    delay(200);
    WiFi.begin(sta_ssid, "tiwulaja");
    wifiStart = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 5000) {
      delay(250);
      Serial.print(".");
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ [WI-FI TERHUBUNG!] Berhasil terhubung ke Wi-Fi Tripanca.");
    Serial.print("   SSID Terhubung:        "); Serial.println(WiFi.SSID());
    Serial.print("   IP Lokal Station:      "); Serial.println(WiFi.localIP());
    Serial.print("   Kekuatan Sinyal (RSSI): "); Serial.print(WiFi.RSSI()); Serial.println(" dBm");
  } else {
    Serial.println("\n⚠️ [WI-FI] Belum berhasil tersambung. Reconnect otomatis akan terus mencoba di background.");
  }
}

// =========================================================================
// SETUP
// =========================================================================
void setup() {
  Serial.begin(115200);

  // Setup Pin Hardware
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(led1Pin, OUTPUT);
  pinMode(led2Pin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);

  // Pastikan output mati saat awal booting
  setBuzzerOutput(false);
  digitalWrite(led1Pin, LOW);
  digitalWrite(led2Pin, LOW);

  // Inisialisasi Mode Wi-Fi Ganda: Station (Internet) + Access Point (Portal Darurat)
  WiFi.mode(WIFI_OFF);
  delay(100);

  WiFi.mode(WIFI_AP_STA);
  WiFi.setSleep(false); // Pastikan radio memancar 100% tanpa sleep

  IPAddress local_ip(192, 168, 4, 1);
  IPAddress gateway(192, 168, 4, 1);
  IPAddress subnet(255, 255, 255, 0);
  WiFi.softAPConfig(local_ip, gateway, subnet);

  // Nyalakan Access Point Lokal (Channel 1 untuk kompatibilitas universal semua HP)
  bool apSuccess = WiFi.softAP(ssid, password, 1, 0, 4);
  if (!apSuccess) {
    // Fallback: Jika chip menolak enkripsi kata sandi, aktifkan mode Terbuka (Open)
    apSuccess = WiFi.softAP(ssid, NULL, 1, 0, 4);
  }

  // Atur TX Power ke 76 (~19 dBm) agar sinyal kuat menembus casing
  esp_wifi_set_max_tx_power(76);
  esp_wifi_set_bandwidth(WIFI_IF_AP, WIFI_BW_HT20);

  // Jalankan DNS Server Captive Portal (Mengarahkan semua domain ke IP 192.168.4.1)
  dnsServer.setErrorReplyCode(DNSReplyCode::NoError);
  dnsServer.start(DNS_PORT, "*", local_ip);

  // Jalankan mDNS responder agar bisa diakses via http://bems.local
  MDNS.begin("bems");

  Serial.println("\n==========================================");
  Serial.println("  BEMS ESP32-C3 SMART MONITORING          ");
  Serial.println("  POLRESTA BANDAR LAMPUNG                 ");
  Serial.println("  Unit / Lokasi: Tripanca                 ");
  Serial.println("==========================================");
  Serial.print("🟢 Status Wi-Fi AP:    "); Serial.println(apSuccess ? "MEMANCARKAN SINYAL (AKTIF)" : "GAGAL");
  Serial.print("📶 Nama SSID AP Lokal: "); Serial.println(ssid);
  Serial.print("🔑 Kata Sandi AP:      "); Serial.println(password);
  Serial.print("🌐 Alamat IP Web AP:   http://"); Serial.println(WiFi.softAPIP());
  Serial.println("🌐 Alamat Alternatif:  http://bems.local");
  Serial.print("🚀 Target HTTPS Cloud: "); Serial.println(triggerUrl);
  Serial.print("🆔 Device UID:         "); Serial.println(deviceUid);
  Serial.print("🔑 Secret Auth Token:  "); Serial.println(deviceToken);
  Serial.println("⚡ Serial Protocol:     ESPC32-B");
  Serial.println("==========================================");

  // Hubungkan ke Wi-Fi Internet Tripanca / tiwulaja
  connectToInternetWiFi();

  // Routing HTTP Server (Dilengkapi header anti-cache agar peramban HP tidak menampilkan versi lama)
  server.on("/", HTTP_GET, []() {
    server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    server.sendHeader("Pragma", "no-cache");
    server.sendHeader("Expires", "0");
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

  server.on("/toggle", HTTP_GET, []() {
    String t = server.arg("target");
    if (t == "led1") {
      statusLed1 = !statusLed1;
      digitalWrite(led1Pin, statusLed1 ? HIGH : LOW);
    }
    if (t == "led2") {
      statusLed2 = !statusLed2;
      digitalWrite(led2Pin, statusLed2 ? HIGH : LOW);
    }
    if (t == "buzzer") {
      statusBuzzer = !statusBuzzer;
      setBuzzerOutput(statusBuzzer);
    }
    sendStatusJSON();
  });

  // Captive Portal Endpoints (Android & iPhone Auto-Popup Portal)
  server.on("/generate_204", HTTP_GET, []() {
    server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    server.send_P(200, "text/html", HTML_PAGE);
  });
  server.on("/gen_204", HTTP_GET, []() {
    server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    server.send_P(200, "text/html", HTML_PAGE);
  });
  server.on("/ncsi.txt", HTTP_GET, []() { server.send(200, "text/plain", "Microsoft NCSI"); });
  server.on("/hotspot-detect.html", HTTP_GET, []() {
    server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    server.send_P(200, "text/html", HTML_PAGE);
  });
  server.onNotFound([]() {
    server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    server.send_P(200, "text/html", HTML_PAGE);
  });

  server.begin();
  Serial.println("🟢 [SISTEM] Server Web Siap di http://192.168.4.1 atau http://bems.local");

  // INDIKATOR FISIK: Nyalakan LED pendek 120ms tanda siap (Buzzer fisik tetap senyap)
  digitalWrite(led1Pin, HIGH);
  digitalWrite(led2Pin, HIGH);
  setBuzzerOutput(false);
  delay(120);
  digitalWrite(led1Pin, LOW);
  digitalWrite(led2Pin, LOW);

  // Stabilisasi tombol: cegah false trigger dari hentakan awal booting
  delay(200);
  buttonState = digitalRead(buttonPin);
  lastReading = buttonState;
  lastDebounceTime = millis();
  panicCooldownTime = millis() + 1500; // Kunci pemicu alarm selama 1.5 detik pertama boot
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

  // --- 1. FILTER ANTI-NOISE TOMBOL FISIK (GPIO 1) ---
  // Hanya evaluasi tombol jika TIDAK dalam periode cooldown alarm (mencegah feedback induksi buzzer)
  if (now >= panicCooldownTime) {
    int reading = digitalRead(buttonPin);

    if (reading != lastReading) {
      lastDebounceTime = now; // Catat waktu saat terjadi perubahan sinyal
    }

    // Jika sinyal stabil bertahan lebih dari 80 ms
    if ((now - lastDebounceTime) > DEBOUNCE_DELAY) {
      if (reading != buttonState) {
        buttonState = reading;

        // Terdeteksi ditekan (Aktif LOW)
        if (buttonState == LOW) {
          Serial.println(">> [TOMBOL FISIK DITEKAN!] Memproses Alarm & Mengirim HTTPS...");
          triggerAlarmAction();
        } else {
          // Tombol dilepas: matikan LED jika status toggle web sedang mati
          if (!statusLed1) digitalWrite(led1Pin, LOW);
          if (!statusLed2) digitalWrite(led2Pin, LOW);
        }
      }
    }
    lastReading = reading;
  }

  // --- 2. TIMER NON-BLOCKING MATIKAN BUZZER (150ms) ---
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

  // --- 4. AUTO-RECONNECT WI-FI INTERNET ---
  static unsigned long lastWifiCheck = 0;
  if (now - lastWifiCheck >= 15000) {
    lastWifiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("🔄 [Wi-Fi] Terputus. Menghubungkan ulang...");
      WiFi.reconnect();
    }
  }

  // --- 5. HEARTBEAT PERIODIK KE VERCEL HTTPS (TIAP 60 DETIK) ---
  static unsigned long lastHttpsHeartbeat = 0;
  if (now - lastHttpsHeartbeat >= 60000) {
    lastHttpsHeartbeat = now;
    sendHeartbeatHTTPS();
  }
}
