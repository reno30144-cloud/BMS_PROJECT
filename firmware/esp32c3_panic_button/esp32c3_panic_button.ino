#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include "esp_wifi.h"

// =========================================================================
// BEMS POLRESTA BANDAR LAMPUNG - DUAL CHANNEL (CLOUD HTTPS + USB SERIAL)
// Perangkat : ESP32-C3 SuperMini / DevKit Module
// Unit/Lokasi: BANK MANDIRI KCP Tanjungkarang Kartini
// Device UID : ESPC32-B
//
// KONFIGURASI PIN HARDWARE:
//   - Tombol Fisik Eksternal : GPIO 1 (INPUT_PULLUP - Terhubung ke GND saat ditekan)
//   - Tombol On-Board BOOT   : GPIO 9 (INPUT_PULLUP - Tombol kecil di board ESP32-C3)
//   - Indikator LED 1        : GPIO 0 (OUTPUT)
//   - Indikator LED 2        : GPIO 4 (OUTPUT)
//   - Buzzer Alarm           : GPIO 2 (OUTPUT)
// =========================================================================

// --- 1. Konfigurasi Hotspot Tunggal (HANYA RENO123) ---
const char* sta_ssid     = "RENO123";
const char* sta_password = "12345678";

// --- 2. URL Endpoint Cloud Vercel & Identitas IoT BEMS ---
const char* triggerUrl   = "https://bms-project-ochre.vercel.app/api/v1/emergency/trigger";
const char* heartbeatUrl = "https://bms-project-ochre.vercel.app/api/v1/emergency/heartbeat";
const char* deviceToken  = "b3m5-p0lr35t4-53cr3t-t0k3n"; // Header X-Device-Token
const char* deviceUid    = "ESPC32-B";                    // UID Bank Mandiri KCP Kartini

// --- 3. Penataan Pin Hardware ---
const int buttonPin     = 1;  // GPIO 1 (Tombol Fisik Utama)
const int bootButtonPin = 9;  // GPIO 9 (Tombol BOOT Onboard untuk cadangan pengujian)
const int led1Pin       = 0;  // GPIO 0 (LED 1)
const int led2Pin       = 4;  // GPIO 4 (LED 2)
const int buzzerPin     = 2;  // GPIO 2 (Buzzer)

// Pengaturan Perilaku
const bool BUZZER_ACTIVE_HIGH = true; // HIGH = Bunyi, LOW = Mati
const bool SILENT_ALARM_MODE  = true; // Silent Alarm untuk keamanan perbankan

// State Sistem
int statusLed1 = 0;
int statusLed2 = 0;
int statusBuzzer = 0;
bool isPanicTriggered = false;
int savedTargetChannel = 0; // Kanal radio Hotspot jika terdeteksi saat pemindaian

// Filter Debounce Tombol
int buttonState = HIGH;
int lastReading = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long DEBOUNCE_DELAY = 30; // 30ms anti-bouncing

// Cooldown Tombol (Mencegah double-click pemicu berulang dalam 3.5 detik)
unsigned long panicCooldownUntil = 0;
const unsigned long PANIC_COOLDOWN_MS = 3500;

// Timer Heartbeat & Wi-Fi
unsigned long lastSerialHeartbeat = 0;
unsigned long lastHttpsHeartbeat  = 0;
unsigned long lastWifiAttempt     = 0;

// Buzzer Timer
unsigned long buzzerOffTime = 0;
bool isBuzzerBeeping = false;

// =========================================================================
// FUNGSI KONTROL PERANGKAT KERAS (LED & BUZZER)
// =========================================================================
void setBuzzerOutput(bool active) {
  if (BUZZER_ACTIVE_HIGH) {
    digitalWrite(buzzerPin, active ? HIGH : LOW);
  } else {
    digitalWrite(buzzerPin, active ? LOW : HIGH);
  }
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

// =========================================================================
// PENGIRIMAN DATA VIA HTTPS CLOUD (VERCEL)
// =========================================================================
bool sendEmergencyTriggerHTTPS() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  Serial.println("\n🚨 [HTTPS CLOUD] Mengirim sinyal darurat ke server Vercel...");

  WiFiClientSecure client;
  client.setInsecure(); // Bypass SSL verification untuk kecepatan respon

  HTTPClient https;
  https.setTimeout(6000);

  bool success = false;
  if (https.begin(client, triggerUrl)) {
    https.addHeader("Content-Type", "application/json");
    https.addHeader("X-Device-Token", deviceToken);

    String payload = "{\"device_uid\":\"" + String(deviceUid) + "\"}";
    int httpCode = https.POST(payload);

    if (httpCode > 0) {
      Serial.printf("✅ [CLOUD VERCEL] Berhasil terkirim! (Kode HTTP: %d)\n", httpCode);
      String res = https.getString();
      Serial.println("   Respon: " + res);
      success = (httpCode >= 200 && httpCode < 300);
    } else {
      Serial.printf("⚠️ [CLOUD VERCEL] Gagal POST! Error: %s (%d)\n",
                    https.errorToString(httpCode).c_str(), httpCode);
    }
    https.end();
  }
  return success;
}

void sendHeartbeatHTTPS() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;
  https.setTimeout(4000);

  if (https.begin(client, heartbeatUrl)) {
    https.addHeader("Content-Type", "application/json");
    https.addHeader("X-Device-Token", deviceToken);

    int rssi = WiFi.RSSI();
    String payload = "{\"device_uid\":\"" + String(deviceUid) + "\",\"rssi\":" + String(rssi) + ",\"battery_level\":100}";

    int httpCode = https.POST(payload);
    if (httpCode > 0) {
      Serial.printf("💓 [HEARTBEAT HTTPS] Sukses (HTTP %d, Sinyal: %d dBm) -> Web: STANDBY (Hijau)\n", httpCode, rssi);
      if (!isPanicTriggered) {
        digitalWrite(led1Pin, HIGH);
        delay(40);
        digitalWrite(led1Pin, LOW);
      }
    }
    https.end();
  }
}

// =========================================================================
// PEMICU ALARM DARURAT (DUAL TRANSMISI: USB SERIAL + CLOUD HTTPS)
// =========================================================================
void triggerAlarmAction() {
  panicCooldownUntil = millis() + PANIC_COOLDOWN_MS;

  // 1. TRANSMISI INSTAN LEWAT USB SERIAL (0 MILIDETIK KE DASHBOARD LAPTOP/PC)
  Serial.println("PANIC:ESPC32-B");

  // 2. Tandai status darurat lokal
  isPanicTriggered = true;

  // 3. Nyalakan LED Darurat
  digitalWrite(led1Pin, HIGH);
  digitalWrite(led2Pin, HIGH);

  // 4. Pengaturan Buzzer jika bukan Silent Mode
  if (!SILENT_ALARM_MODE) {
    setBuzzerOutput(true);
    isBuzzerBeeping = true;
    buzzerOffTime = millis() + 3000;
  }

  // 5. Transmisi ke Cloud HTTPS Vercel (Hanya jika Wi-Fi terkoneksi, tidak menghalangi USB jika offline)
  if (WiFi.status() == WL_CONNECTED) {
    sendEmergencyTriggerHTTPS();
  } else {
    Serial.println("ℹ️ [INFO] Wi-Fi offline, sinyal darurat langsung diteruskan via USB Serial COM.");
  }
}

// =========================================================================
// EVENT LISTENER WI-FI (DIAGNOSTIK OTOMATIS)
// =========================================================================
void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_GOT_IP: {
      Serial.println("\n🎉 [WI-FI EVENT] ESP32 BERHASIL MENDAPATKAN ALAMAT IP!");
      Serial.printf("   IP Address : %s\n", WiFi.localIP().toString().c_str());
      Serial.printf("   Gateway    : %s\n", WiFi.gatewayIP().toString().c_str());
      Serial.printf("   Sinyal     : %d dBm\n", WiFi.RSSI());
      break;
    }

    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED: {
      uint8_t reason = info.wifi_sta_disconnected.reason;
      Serial.printf("\n⚠️ [WI-FI EVENT] Terputus dari Hotspot (Kode Alasan: %d)\n", reason);
      if (reason == 2) {
        Serial.println("   👉 Alasan 2 (AUTH_EXPIRE): HP menolak otentikasi.");
        Serial.println("      Solusi HP: Buka Pengaturan Hotspot > Ubah Keamanan ke 'WPA2-Personal' atau 'Tanpa Sandi'.");
      } else if (reason == 15 || reason == 202) {
        Serial.println("   👉 Alasan 15/202 (WRONG_PASSWORD/HANDSHAKE): Sandi salah atau enkripsi tidak cocok.");
        Serial.println("      Solusi: Pastikan sandi di HP adalah 12345678 persis.");
      } else if (reason == 201) {
        Serial.println("   👉 Alasan 201 (NO_AP_FOUND): Nama Hotspot 'RENO123' tidak terlihat oleh modul.");
        Serial.println("      Solusi HP: Pastikan Hotspot HP AKTIF di frekuensi 2.4 GHz dan tidak disembunyikan.");
      }
      break;
    }
    default:
      break;
  }
}

// =========================================================================
// INISIALISASI & PEMINDAIAN WI-FI KE HOTSPOT RENO123
// =========================================================================
void startWiFiConnection() {
  Serial.println("\n==========================================");
  Serial.println("🌐 [WI-FI] Menghubungkan ke Hotspot");
  Serial.printf("📶 SSID Target  : %s\n", sta_ssid);
  Serial.printf("🔑 Kata Sandi   : %s\n", sta_password);
  Serial.printf("📡 ESP32 MAC    : %s\n", WiFi.macAddress().c_str());
  Serial.println("==========================================");

  // 1. Bersihkan data NVS lama
  WiFi.persistent(false);
  WiFi.disconnect(true);
  delay(100);

  // 2. Set mode Station murni & matikan sleep
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);

  // Aktifkan Protected Management Frames (PMF) untuk kompatibilitas Android (Mengatasi Reason 36 & 2 AUTH_EXPIRE)
  wifi_config_t conf;
  esp_wifi_get_config(WIFI_IF_STA, &conf);
  conf.sta.pmf_cfg.capable = true;
  conf.sta.pmf_cfg.required = false;
  esp_wifi_set_config(WIFI_IF_STA, &conf);

  // Register event callback untuk log diagnostik
  WiFi.onEvent(onWiFiEvent);

  // 3. Pemindaian cepat di sekitar untuk mendeteksi kanal & kekuatan sinyal RENO123
  Serial.println("🔍 Memindai jaringan Wi-Fi 2.4 GHz di sekitar...");
  int n = WiFi.scanNetworks(false, true); // Termasuk hidden SSID
  bool found = false;
  savedTargetChannel = 0;

  if (n > 0) {
    for (int i = 0; i < n; ++i) {
      if (WiFi.SSID(i) == sta_ssid) {
        found = true;
        savedTargetChannel = WiFi.channel(i);
        Serial.printf("🎯 [HOTSPOT DITEMUKAN!] SSID: %s | Kanal: %d | Sinyal: %d dBm\n",
                      WiFi.SSID(i).c_str(), savedTargetChannel, WiFi.RSSI(i));
        break;
      }
    }
  }

  if (!found) {
    Serial.printf("⚠️ [PERHATIAN] SSID '%s' belum terlihat dalam pemindaian.\n", sta_ssid);
    if (n > 0) {
      Serial.println("   Daftar Wi-Fi yang berhasil dideteksi:");
      int maxShow = (n < 4) ? n : 4;
      for (int i = 0; i < maxShow; ++i) {
        Serial.printf("   - %s (Kanal %d, %d dBm)\n", WiFi.SSID(i).c_str(), WiFi.channel(i), WiFi.RSSI(i));
      }
    } else {
      Serial.println("   (Tidak ada jaringan Wi-Fi 2.4 GHz yang terdeteksi)");
    }
    Serial.println("👉 Tips: Pastikan Hotspot HP aktif di 2.4 GHz dan tidak disembunyikan.");
  }

  // 4. Mulai koneksi (Jika kanal diketahui, gunakan kanal langsung agar jabat tangan instan)
  Serial.printf("⏳ Menyambung ke '%s'...", sta_ssid);
  if (savedTargetChannel > 0) {
    WiFi.begin(sta_ssid, sta_password, savedTargetChannel);
  } else {
    WiFi.begin(sta_ssid, sta_password);
  }

  // Tunggu maksimal 5 detik saat booting agar USB Serial tidak tertunda
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start < 5000)) {
    delay(200);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ [BERHASIL TERHUBUNG KE HOTSPOT RENO123!]");
    sendHeartbeatHTTPS();
  } else {
    Serial.printf("\nℹ️ [STATUS BOOT]: Wi-Fi belum tersambung (Status: %d).\n", (int)WiFi.status());
    Serial.println("   ESP32 akan terus mencoba tersambung di latar belakang secara otomatis.");
    Serial.println("   USB Serial COM8 SIAP DIGUNAKAN untuk dashboard web!");
  }
}

// =========================================================================
// SETUP UTAMA
// =========================================================================
void setup() {
  // Inisialisasi USB Serial CDC
  Serial.begin(115200);
  delay(1000);

  // Inisialisasi Pinout Hardware
  pinMode(buttonPin, INPUT_PULLUP);     // GPIO 1 (Tombol Fisik Utama)
  pinMode(bootButtonPin, INPUT_PULLUP); // GPIO 9 (Tombol BOOT On-Board)
  pinMode(led1Pin, OUTPUT);
  pinMode(led2Pin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);
  setBuzzerOutput(false);

  digitalWrite(led1Pin, LOW);
  digitalWrite(led2Pin, LOW);

  // Tampilkan Identitas Sistem di Serial Monitor
  Serial.println("\n==========================================");
  Serial.println("  BEMS ESP32-C3 SMART MONITORING          ");
  Serial.println("  POLRESTA BANDAR LAMPUNG                 ");
  Serial.println("  Unit / Lokasi : Bank Mandiri KCP Kartini");
  Serial.println("  Device UID    : ESPC32-B                ");
  Serial.println("==========================================");
  Serial.println("⚡ USB Serial Protocol: AKTIF (COM8)");
  Serial.println("🔘 Tombol Fisik       : GPIO 1 & GPIO 9 (BOOT)");
  Serial.println("==========================================");

  // Hubungkan ke Hotspot RENO123
  startWiFiConnection();

  // Stabilisasi tombol
  delay(100);
  buttonState = digitalRead(buttonPin);
  lastReading = buttonState;
  lastDebounceTime = millis();
  panicCooldownUntil = millis() + 1000;
}

// =========================================================================
// LOOP UTAMA (NON-BLOCKING)
// =========================================================================
void loop() {
  unsigned long now = millis();

  // --- 1. BACA PERINTAH DARI USB SERIAL (DARI DASHBOARD WEB NEXT.JS) ---
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.startsWith("RESET")) {
      resetAlarmState();
    } else if (cmd.startsWith("PANIC")) {
      triggerAlarmAction();
    }
  }

  // --- 2. DETEKSI DUAL TOMBOL FISIK (GPIO 1 Eksternal ATAU GPIO 9 BOOT On-Board) ---
  if (now >= panicCooldownUntil) {
    int readExt  = digitalRead(buttonPin);
    int readBoot = digitalRead(bootButtonPin);

    // Aktif LOW jika salah satu tombol ditekan
    int reading = (readExt == LOW || readBoot == LOW) ? LOW : HIGH;

    if (reading != lastReading) {
      lastDebounceTime = now;
    }

    if ((now - lastDebounceTime) > DEBOUNCE_DELAY) {
      if (reading != buttonState) {
        buttonState = reading;

        if (buttonState == LOW) {
          Serial.println("\n🔥 [TOMBOL FISIK DITEKAN!] Pemicu darurat aktif.");
          if (readExt == LOW)  Serial.println("   -> Sumber: GPIO 1 (Tombol Fisik Utama)");
          if (readBoot == LOW) Serial.println("   -> Sumber: GPIO 9 (Tombol BOOT On-Board)");

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

  // --- 3. TIMER NON-BLOCKING MATIKAN BUZZER ---
  if (isBuzzerBeeping && now >= buzzerOffTime) {
    isBuzzerBeeping = false;
    if (!statusBuzzer) {
      setBuzzerOutput(false);
    }
  }

  // --- 4. TRANSMISI HEARTBEAT TIAP 5 DETIK KE KABEL USB SERIAL (COM8) ---
  if (now - lastSerialHeartbeat >= 5000) {
    lastSerialHeartbeat = now;
    Serial.println("HEARTBEAT:ESPC32-B");
  }

  // --- 5. LATAR BELAKANG REKONEKSI WI-FI (FORCE RECONNECT TIAP 10 DETIK JIKA BELUM TERHUBUNG) ---
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWifiAttempt >= 10000) {
      lastWifiAttempt = now;
      Serial.printf("[Wi-Fi] Melakukan rekoneksi ke '%s'...\n", sta_ssid);
      WiFi.disconnect();
      delay(80);
      if (savedTargetChannel > 0) {
        WiFi.begin(sta_ssid, sta_password, savedTargetChannel);
      } else {
        WiFi.begin(sta_ssid, sta_password);
      }
    }
  }

  // --- 6. HEARTBEAT PERIODIK KE VERCEL CLOUD (TIAP 5 DETIK JIKA WI-FI TERKONEKSI) ---
  if (WiFi.status() == WL_CONNECTED) {
    if (now - lastHttpsHeartbeat >= 5000) {
      lastHttpsHeartbeat = now;
      sendHeartbeatHTTPS();
    }
  }
}
