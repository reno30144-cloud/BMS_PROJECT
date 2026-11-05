#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

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
// INISIALISASI WI-FI KE HOTSPOT RENO123
// =========================================================================
void startWiFiConnection() {
  Serial.println("\n==========================================");
  Serial.println("🌐 [WI-FI] Menghubungkan ke Hotspot");
  Serial.printf("📶 SSID Target  : %s\n", sta_ssid);
  Serial.printf("🔑 Kata Sandi   : %s\n", sta_password);
  Serial.printf("📡 ESP32 MAC    : %s\n", WiFi.macAddress().c_str());
  Serial.println("==========================================");

  // 1. Bersihkan data NVS lama dan reset radio Wi-Fi
  WiFi.persistent(false);
  WiFi.disconnect(true);
  delay(150);

  // 2. Set mode Station murni
  WiFi.mode(WIFI_STA);

  // 3. Matikan mode hemat daya radio (agar modul selalu siaga dan daya tangkap maksimal)
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);

  // 4. Mulai koneksi ke Hotspot
  Serial.printf("⏳ Menyambung ke '%s'...", sta_ssid);
  WiFi.begin(sta_ssid, sta_password);

  // Tunggu maksimal 6 detik saat booting agar USB Serial tidak tertunda
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start < 6000)) {
    delay(250);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ [BERHASIL TERHUBUNG KE HOTSPOT RENO123!]");
    Serial.printf("   SSID Aktif     : %s\n", WiFi.SSID().c_str());
    Serial.printf("   IP Lokal ESP32 : %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("   Kekuatan Sinyal: %d dBm\n", WiFi.RSSI());
    Serial.printf("   Wi-Fi Channel  : %d\n", WiFi.channel());
    Serial.println("==========================================");

    // Kirim detak jantung perdana ke server
    sendHeartbeatHTTPS();
  } else {
    Serial.printf("\n⚠️ [BELUM TERKONEKSI] Status Code: %d\n", (int)WiFi.status());
    Serial.println("💡 Tips Hotspot HP Android:");
    Serial.println("   1. Pastikan pita frekuensi Hotspot diatur ke '2.4 GHz'.");
    Serial.println("   2. Pada jenis keamanan Hotspot, pilih 'WPA2-Personal'.");
    Serial.println("   3. ESP32 akan otomatis menyambung di latar belakang saat Hotspot siap.");
    Serial.println("   4. Komunikasi kabel USB COM8 tetap AKTIF 100% untuk pengujian.");
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
      Serial.printf("[Wi-Fi] Melakukan Force Reconnect ke '%s'...\n", sta_ssid);
      WiFi.disconnect();
      delay(100);
      WiFi.begin(sta_ssid, sta_password);
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
