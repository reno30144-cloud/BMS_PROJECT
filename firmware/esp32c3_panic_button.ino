/**
 * BEMS (Bank Emergency Monitoring System) - Firmware ESP32-C3
 * Polresta Bandar Lampung
 * 
 * Hardware: ESP32-C3 SuperMini / DevKit
 * Pinout:
 *   - PANIC_BUTTON_PIN: GPIO 9 (Pull-up internal, aktif LOW)
 *   - LED_STATUS_PIN:   GPIO 8 (Indikator status)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// 1. Konfigurasi Jaringan Wi-Fi Bank
const char* WIFI_SSID     = "BANK_OFFICE_WIFI";
const char* WIFI_PASSWORD = "PasswordRahasiaBank123";

// 2. Konfigurasi Server BEMS Polresta Bandar Lampung
// Untuk lokal / staging: gunakan IP server Next.js (misal: "http://192.168.1.100:3000")
const char* SERVER_BASE_URL = "http://192.168.1.100:3000";
const char* DEVICE_UID      = "ESP32C3-BDL-001";
const char* DEVICE_TOKEN    = "b3m5-p0lr35t4-53cr3t-t0k3n";

// 3. Pin Perangkat Keras
const int BUTTON_PIN = 9;  // Tombol panik fisik
const int LED_PIN    = 8;  // LED status onboard

// 4. Manajemen Waktu & Heartbeat
unsigned long lastHeartbeatTime = 0;
const unsigned long HEARTBEAT_INTERVAL_MS = 300000; // 5 Menit (300.000 ms)

// 5. Anti-Spam / Debounce Filter
unsigned long lastButtonPressTime = 0;
const unsigned long DEBOUNCE_DELAY_MS = 3000; // 3 Detik batas debounce

void connectToWiFi() {
  Serial.println("\n[Wi-Fi] Menghubungkan ke jaringan bank...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Kedip cepat saat mencoba konek
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Berhasil terhubung!");
    Serial.print("[Wi-Fi] Alamat IP ESP32: ");
    Serial.println(WiFi.localIP());
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.println("\n[Wi-Fi] Gagal terhubung. Periksa konfigurasi SSID/Password.");
  }
}

// Fungsi Mengirim Sinyal Pemicu Bahaya (Panic Trigger)
void sendEmergencyTrigger() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] Wi-Fi terputus, mencoba menghubungkan kembali...");
    connectToWiFi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/v1/emergency/trigger";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);

  // Buat Payload JSON
  StaticJsonDocument<200> doc;
  doc["device_uid"] = DEVICE_UID;
  doc["timestamp"] = millis();

  String requestBody;
  serializeJson(doc, requestBody);

  Serial.println("\n🚨 [DARURAT] Mengirim sinyal pemicu bahaya ke Command Center...");
  unsigned long t0 = millis();
  int httpResponseCode = http.POST(requestBody);
  unsigned long elapsed = millis() - t0;

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] Respons: %d | Waktu Transmisi: %lu ms\n", httpResponseCode, elapsed);
    Serial.println(response);

    // Indikasi LED kedip darurat cepat 5x
    for (int i = 0; i < 5; i++) {
      digitalWrite(LED_PIN, LOW);
      delay(100);
      digitalWrite(LED_PIN, HIGH);
      delay(100);
    }
  } else {
    Serial.printf("[ERROR] Gagal mengirim trigger: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

// Fungsi Mengirim Ping Detak Jantung (Heartbeat 5 Menit)
void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/v1/emergency/heartbeat";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);

  StaticJsonDocument<200> doc;
  doc["device_uid"] = DEVICE_UID;
  doc["rssi"] = WiFi.RSSI();
  doc["uptime_seconds"] = millis() / 1000;

  String requestBody;
  serializeJson(doc, requestBody);

  Serial.println("[HEARTBEAT] Mengirim ping status alat ke server...");
  int httpResponseCode = http.POST(requestBody);

  if (httpResponseCode > 0) {
    Serial.printf("[HEARTBEAT] Sukses (Kode: %d)\n", httpResponseCode);
  } else {
    Serial.printf("[HEARTBEAT] Gagal: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("==========================================");
  Serial.println("  BEMS ESP32-C3 PANIC BUTTON SYSTEM       ");
  Serial.println("  POLRESTA BANDAR LAMPUNG                 ");
  Serial.println("==========================================");

  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  connectToWiFi();

  // Kirim heartbeat pertama saat alat baru dinyalakan
  sendHeartbeat();
  lastHeartbeatTime = millis();
}

void loop() {
  // 1. Deteksi Penekanan Tombol Fisik (Aktif LOW)
  if (digitalRead(BUTTON_PIN) == LOW) {
    unsigned long currentMillis = millis();
    // Hardware Debounce & Anti-Spam Filter
    if (currentMillis - lastButtonPressTime > DEBOUNCE_DELAY_MS) {
      lastButtonPressTime = currentMillis;
      sendEmergencyTrigger();
    }
  }

  // 2. Pemeriksaan Waktu Heartbeat (Tiap 5 Menit)
  if (millis() - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatTime = millis();
    sendHeartbeat();
  }

  // 3. Auto-reconnect jika Wi-Fi sempat terputus
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Wi-Fi] Terputus. Menghubungkan ulang...");
    connectToWiFi();
    delay(2000);
  }

  delay(20);
}
