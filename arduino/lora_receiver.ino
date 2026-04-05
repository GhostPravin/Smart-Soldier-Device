/*
 * ============================================================
 *  SMART SOLDIER – LoRa Receiver / Gateway
 *  Hardware: ESP32 + Ra-02 SX1278
 *
 *  Receives LoRa packets from the Soldier Unit,
 *  parses the data, and HTTP POSTs JSON to the
 *  Node.js dashboard server.
 *
 *  Required Libraries:
 *    • LoRa by Sandeep Mistry
 *    • ArduinoJson by Benoit Blanchon
 * ============================================================
 */

#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ─────────── LoRa Pins (same as transmitter) ───────────
#define LORA_SS   5
#define LORA_RST  14
#define LORA_DIO0 26

// ─────────── WiFi & Server Config ───────────
const char* WIFI_SSID     = "EngiiGenious";       // ← Change this
const char* WIFI_PASSWORD = "Engii@123";   // ← Change this
const char* SERVER_URL    = "http://172.18.17.60:3000/api/data";
// Example: "http://192.168.1.15:3000/api/data"
// Find your PC IP by running: ipconfig  (in PowerShell)

// ─────────── Setup ───────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n🎖️  SMART SOLDIER – LoRa Gateway Booting...");

  // WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("📡 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected! IP: " + WiFi.localIP().toString());

  // LoRa
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(433E6)) {
    Serial.println("❌ LoRa init failed! Check wiring.");
    while (1);
  }

  Serial.println("📡 LoRa Receiver Ready");
  Serial.println("⏳ Waiting for packets from Soldier Unit...\n");
}

// ─────────── Main Loop ───────────
void loop() {
  int packetSize = LoRa.parsePacket();

  if (packetSize) {
    String received = "";
    while (LoRa.available()) {
      received += (char)LoRa.read();
    }

    int rssi = LoRa.packetRssi();

    Serial.println("📩 Received: " + received);
    Serial.println("   RSSI: " + String(rssi) + " dBm");

    // Parse and forward to dashboard
    postToDashboard(received, rssi);

    Serial.println("---------------------------");
  }
}

// ─────────── Parse LoRa String → POST JSON ───────────
/*
  Expected packet format from transmitter:
  "ID:S1,T:28.50,H:65.20,G:1450,HR:75,SPO2:98,LAT:28.613900,LON:77.209000,STAT:SAFE"
*/
void postToDashboard(String packet, int rssi) {

  // ── Parse key:value pairs ──
  float temperature = 0, humidity = 0, lat = 0, lon = 0;
  int   gas = 0, heartRate = 0, spo2 = 0;

  // Split by comma
  int start = 0;
  while (start < packet.length()) {
    int comma = packet.indexOf(',', start);
    if (comma == -1) comma = packet.length();

    String pair = packet.substring(start, comma);
    int colon   = pair.indexOf(':');

    if (colon != -1) {
      String key = pair.substring(0, colon);
      String val = pair.substring(colon + 1);

      if      (key == "T")    temperature = val.toFloat();
      else if (key == "H")    humidity    = val.toFloat();
      else if (key == "G")    gas         = val.toInt();
      else if (key == "HR")   heartRate   = val.toInt();
      else if (key == "SPO2") spo2        = val.toInt();
      else if (key == "LAT")  lat         = val.toFloat();
      else if (key == "LON")  lon         = val.toFloat();
      // ID and STAT are ignored — server recalculates status
    }

    start = comma + 1;
  }

  // ── Build JSON ──
  StaticJsonDocument<256> doc;
  doc["temperature"] = temperature;
  doc["humidity"]    = humidity;
  doc["gas"]         = gas;
  doc["heartRate"]   = heartRate;
  doc["spo2"]        = spo2;
  doc["lat"]         = lat;
  doc["lng"]         = lon;

  String payload;
  serializeJson(doc, payload);

  // ── HTTP POST ──
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi lost! Reconnecting...");
    WiFi.reconnect();
    delay(2000);
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    Serial.println("✅ Dashboard updated! [HTTP 200]");
  } else {
    Serial.println("❌ POST failed: HTTP " + String(httpCode));
    Serial.println("   Check SERVER_URL and firewall.");
  }

  http.end();
}
