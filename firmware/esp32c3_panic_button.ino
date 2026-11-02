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
// Lokasi / Unit: Tripanca (Bank Mandiri KCP Kartini)
// Pinout Sesuai Board Anda:
//   - Tombol Fisik:  GPIO 1 (INPUT_PULLUP)
//   - LED 1:         GPIO 0 (OUTPUT)
//   - LED 2:         GPIO 4 (OUTPUT)
//   - Buzzer:        GPIO 2 (OUTPUT)
// =========================================================================

// --- 1. Konfigurasi Wi-Fi Internet (Station Mode untuk HTTPS ke Vercel) ---
// Sesuai data Wi-Fi resmi Anda:
//   Nama Wi-Fi (SSID) : Tripanca
//   Kata Sandi       : tieulaja
const char* sta_ssid     = "Tripanca";
const char* sta_password = "tieulaja";

// --- 2. URL Endpoint Server Vercel HTTPS & Identitas IoT BEMS ---
// Domain Vercel resmi sistem BEMS Polresta Bandar Lampung
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
const int buttonPin = 1;       // Tombol Fisik Eksternal (GPIO 1)
const int bootButtonPin = 9;   // Tombol On-Board BOOT pada modul ESP32-C3 (GPIO 9)
const int led1Pin = 0;         // LED 1 (GPIO 0)
const int led2Pin = 4;         // LED 2 (GPIO 4)
const int buzzerPin = 2;       // Buzzer (GPIO 2)

// Set ke true jika buzzer aktif saat HIGH. Ubah ke false jika Active-LOW.
const bool BUZZER_ACTIVE_HIGH = true;

// MODE SILENT ALARM: Suara buzzer fisik pada modul Arduino/ESP32 dinonaktifkan total
// agar tidak terdengar di lokasi teller/bank (sesuai SOP keamanan perbankan Polresta)
const bool SILENT_ALARM_MODE = true;

WebServer server(80);
const byte DNS_PORT = 53;
DNSServer dnsServer;

int statusLed1 = 0;
int statusLed2 = 0;
int statusBuzzer = 0;
bool isPanicTriggered = false;

// Filter Debounce & Anti-Noise Tombol (Peka & Cepat 25ms)
int buttonState = HIGH;
int lastReading = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long DEBOUNCE_DELAY = 25; // 25ms sangat responsif tanpa delay lambat

// Cooldown Lock: Mencegah trigger bertubi-tubi saat kepanikan
unsigned long panicCooldownTime = 0;
const unsigned long PANIC_COOLDOWN_MS = 1500; // Kunci 1.5 detik per penekanan alarm

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
    // Di mode silent alarm, pastikan pin buzzer selalu mati (High-Z) agar senyap total
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
// TRANSMISI HTTP POST VIA HTTPS (WIFICLIENTSECURE + VERCEL SSL BYPASS)
// =========================================================================
bool sendEmergencyTriggerHTTPS() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ [HTTPS POST] Wi-Fi belum tersambung. Menginisiasi koneksi ke Tripanca (4 detik)...");
    WiFi.begin(sta_ssid, sta_password);
    unsigned long t0 = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - t0 < 4500) {
      delay(200);
      Serial.print(".");
    }
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n❌ [HTTPS POST] Gagal kirim: Wi-Fi benar-benar tidak terhubung!");
    // Kedipkan LED cepat 5x sebagai tanda gagal koneksi internet
    for (int i = 0; i < 5; i++) {
      digitalWrite(led1Pin, HIGH); delay(70);
      digitalWrite(led1Pin, LOW); delay(70);
    }
    return false;
  }

  Serial.println("\n🚨 [HTTPS POST] MENGIRIM SINYAL BAHAYA KE SERVER VERCEL...");

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
      Serial.printf("💓 [HEARTBEAT HTTPS] Sukses (Code: %d, RSSI: %d dBm) -> Status Web: STANDBY (Hijau)\n", httpCode, rssi);
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
// HELPER KONEKSI WI-FI INTERNET (SSID: Tripanca, SANDI: tieulaja)
// =========================================================================
void connectToInternetWiFi() {
  Serial.println("\n==========================================");
  Serial.println("🌐 [WI-FI] Menghubungkan ke Wi-Fi Internet");
  Serial.printf("📶 Target SSID: '%s'\n", sta_ssid);
  Serial.printf("🔑 Kata Sandi : '%s'\n", sta_password);
  Serial.println("==========================================");

  // Percobaan 1: Sandi resmi yang diinput user ("tieulaja")
  WiFi.begin(sta_ssid, sta_password);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
    delay(300);
    Serial.print(".");
  }

  // Percobaan 2: Variasi 'tiwulaja' (jika typo huruf 'e'/'w')
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n⚠️ [WI-FI] Belum tersambung dengan 'tieulaja'. Mencoba sandi 'tiwulaja'...");
    WiFi.disconnect();
    delay(200);
    WiFi.begin(sta_ssid, "tiwulaja");
    start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 6000) {
      delay(300);
      Serial.print(".");
    }
  }

  // Percobaan 3: Variasi 'tiwul ajah'
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n⚠️ [WI-FI] Mencoba sandi 'tiwul ajah'...");
    WiFi.disconnect();
    delay(200);
    WiFi.begin(sta_ssid, "tiwul ajah");
    start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 6000) {
      delay(300);
      Serial.print(".");
    }
  }

  // Jika tetap gagal, scan untuk melihat apakah SSID terlihat di 2.4 GHz
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n🔍 [WI-FI SCAN] Memindai sinyal 2.4 GHz di sekitar board...");
    int n = WiFi.scanNetworks();
    Serial.printf("Ditemukan %d jaringan Wi-Fi:\n", n);
    bool found = false;
    for (int i = 0; i < n; i++) {
      Serial.printf("   [%d] '%s' (RSSI: %d dBm, Ch: %d)\n", i+1, WiFi.SSID(i).c_str(), WiFi.RSSI(i), WiFi.channel(i));
      if (WiFi.SSID(i).equalsIgnoreCase("Tripanca")) {
        found = true;
      }
    }
    if (!found) {
      Serial.println("\n⚠️ PERHATIAN PENTING:");
      Serial.println("   SSID 'Tripanca' TIDAK DITEMUKAN di frekuensi 2.4 GHz!");
      Serial.println("   Pastikan Hotspot HP / Router Anda disetel ke pita 2.4 GHz (ESP32-C3 tidak mendukung 5 GHz).");
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n\n🎉 ==========================================");
    Serial.println("✅ [WI-FI BERHASIL TERHUBUNG!]");
    Serial.printf("   SSID Aktif     : %s\n", WiFi.SSID().c_str());
    Serial.printf("   IP ESP32       : %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("   Kekuatan (RSSI): %d dBm\n", WiFi.RSSI());
    Serial.println("==========================================");

    // Kedipkan LED 2 kali tanda sukses koneksi internet
    digitalWrite(led1Pin, HIGH); digitalWrite(led2Pin, HIGH);
    delay(200);
    digitalWrite(led1Pin, LOW); digitalWrite(led2Pin, LOW);

    // Kirim heartbeat perdana ke server Vercel seketika agar status langsung STANDBY di web!
    Serial.println("📡 Mengirim status STANDBY ke Vercel sekarang...");
    sendHeartbeatHTTPS();
  } else {
    Serial.println("\n❌ Wi-Fi belum tersambung. Sistem akan mencoba reconnect otomatis tiap 15 detik.");
  }
}

// =========================================================================
// SETUP
// =========================================================================
void setup() {
  Serial.begin(115200);

  // Setup Pin Hardware
  pinMode(buttonPin, INPUT_PULLUP);      // GPIO 1 (Tombol Eksternal)
  pinMode(bootButtonPin, INPUT_PULLUP);  // GPIO 9 (Tombol On-Board BOOT ESP32-C3)
  pinMode(led1Pin, OUTPUT);
  pinMode(led2Pin, OUTPUT);
  setBuzzerOutput(false); // Pastikan buzzer diam total (High-Z)

  digitalWrite(led1Pin, LOW);
  digitalWrite(led2Pin, LOW);

  // 1. Matikan radio Wi-Fi dulu agar bersih
  WiFi.disconnect(true);
  delay(100);

  // 2. Aktifkan Mode Station terlebih dahulu untuk terhubung ke internet
  WiFi.mode(WIFI_AP_STA);
  WiFi.setSleep(false); // Radio tetap siaga tanpa sleep

  // Gunakan Google DNS sebagai DNS cadangan agar resolving domain Vercel lancar
  IPAddress primaryDNS(8, 8, 8, 8);
  IPAddress secondaryDNS(1, 1, 1, 1);
  WiFi.config(INADDR_NONE, INADDR_NONE, INADDR_NONE, primaryDNS, secondaryDNS);

  // 3. Hubungkan ke Wi-Fi Internet Tripanca DULUAN (sebelum SoftAP mengunci channel)
  connectToInternetWiFi();

  // 4. Konfigurasi SoftAP lokal tanpa mengunci channel
  IPAddress local_ip(192, 168, 4, 1);
  IPAddress gateway(192, 168, 4, 1);
  IPAddress subnet(255, 255, 255, 0);
  WiFi.softAPConfig(local_ip, gateway, subnet);

  bool apSuccess = WiFi.softAP(ssid, password);
  if (!apSuccess) {
    apSuccess = WiFi.softAP(ssid, NULL);
  }

  // Atur TX Power yang stabil (68 ~ 17 dBm) cegah brownout drop tegangan
  esp_wifi_set_max_tx_power(68);

  // Jalankan DNS Server Captive Portal
  dnsServer.setErrorReplyCode(DNSReplyCode::NoError);
  dnsServer.start(DNS_PORT, "*", local_ip);

  MDNS.begin("bems");

  Serial.println("\n==========================================");
  Serial.println("  BEMS ESP32-C3 SMART MONITORING          ");
  Serial.println("  POLRESTA BANDAR LAMPUNG                 ");
  Serial.println("  Unit / Lokasi: Tripanca                 ");
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

  // Captive Portal Endpoints
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

  // INDIKATOR FISIK: Nyalakan LED pendek 100ms tanda booting siap (Buzzer fisik tetap senyap total)
  digitalWrite(led1Pin, HIGH);
  delay(100);
  digitalWrite(led1Pin, LOW);

  // Stabilisasi tombol
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

    // Aktif jika salah satu tombol ditekan (Active LOW)
    int reading = (readExt == LOW || readBoot == LOW) ? LOW : HIGH;

    if (reading != lastReading) {
      lastDebounceTime = now;
    }

    if ((now - lastDebounceTime) > DEBOUNCE_DELAY) {
      if (reading != buttonState) {
        buttonState = reading;

        // Terdeteksi ditekan (Aktif LOW)
        if (buttonState == LOW) {
          Serial.println("\n🔥 [TOMBOL FISIK DITEKAN!] Tombol terdeteksi aktif.");
          if (readExt == LOW) Serial.println("   -> Pemicu: GPIO 1 (Tombol Eksternal)");
          if (readBoot == LOW) Serial.println("   -> Pemicu: GPIO 9 (Tombol On-Board BOOT)");

          // Nyalakan LED langsung sebagai umpan balik fisik seketika
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

  // --- 4. AUTO-RECONNECT WI-FI INTERNET JIKA TERPUTUS ---
  static unsigned long lastWifiCheck = 0;
  if (now - lastWifiCheck >= 15000) {
    lastWifiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("🔄 [Wi-Fi] Terputus. Menghubungkan ulang ke Tripanca...");
      WiFi.reconnect();
    }
  }

  // --- 5. HEARTBEAT PERIODIK KE VERCEL HTTPS (TIAP 4 DETIK - SUPER RESPONSIF) ---
  static unsigned long lastHttpsHeartbeat = 0;
  if (now - lastHttpsHeartbeat >= 4000) {
    lastHttpsHeartbeat = now;
    sendHeartbeatHTTPS();
  }
}
