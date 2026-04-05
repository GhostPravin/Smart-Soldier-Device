#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>
#include <TinyGPSPlus.h>
#include <DHT.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"

// ---------------- LoRa ----------------
#define LORA_SS   5
#define LORA_RST  14
#define LORA_DIO0 26

// ---------------- MQ135 ----------------
#define MQ135_PIN 34

// ---------------- Buzzer ----------------
#define BUZZER_PIN 27

// ---------------- DHT ----------------
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// ---------------- GPS ----------------
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);
#define GPS_RX 16
#define GPS_TX 17

// ---------------- MAX30102 ----------------
MAX30105 particleSensor;

#define BUFFER_SIZE 100
uint32_t irBuffer[BUFFER_SIZE];
uint32_t redBuffer[BUFFER_SIZE];

int32_t spo2;
int8_t validSpO2;
int32_t heartRate;
int8_t validHeartRate;

// ---------------- Thresholds ----------------
#define GAS_TH    3200
#define SPO2_WARN 93
#define SPO2_EMG  90
#define TEMP_WARN 35

// ---------------- Utility ----------------
int readMQ135() {
  int sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(MQ135_PIN);
    delay(10);
  }
  return sum / 10;
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  dht.begin();
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  // MAX30102
  Wire.begin();
  particleSensor.begin(Wire, I2C_SPEED_STANDARD);
  particleSensor.setup();

  // LoRa
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(433E6)) {
    Serial.println("LoRa Failed");
    while (1);
  }

  Serial.println("LoRa Transmitter Ready");
}

// ---------------- LOOP ----------------
void loop() {

  // ---------- MQ135 ----------
  int gas = readMQ135();

  // ---------- DHT ----------
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  // ---------- MAX30102 ----------
  for (int i = 0; i < BUFFER_SIZE; i++) {
    while (!particleSensor.available())
      particleSensor.check();

    redBuffer[i] = particleSensor.getRed();
    irBuffer[i]  = particleSensor.getIR();
    particleSensor.nextSample();
  }

  maxim_heart_rate_and_oxygen_saturation(
    irBuffer, BUFFER_SIZE,
    redBuffer,
    &spo2, &validSpO2,
    &heartRate, &validHeartRate
  );

  // ---------- GPS ----------
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  float lat = gps.location.isValid() ? gps.location.lat() : 0.0;
  float lon = gps.location.isValid() ? gps.location.lng() : 0.0;

  // ---------- SENSOR FUSION ----------
  String status = "SAFE";

  if (gas > GAS_TH && spo2 < SPO2_EMG) {
    status = "EMERGENCY";
    digitalWrite(BUZZER_PIN, HIGH);
  }
  else if (gas > GAS_TH || spo2 < SPO2_WARN || temp > TEMP_WARN) {
    status = "WARNING";
    digitalWrite(BUZZER_PIN, HIGH);
    delay(200);
    digitalWrite(BUZZER_PIN, LOW);
  }
  else {
    digitalWrite(BUZZER_PIN, LOW);
  }

  // ---------- CREATE PACKET ----------
  String data = "";
  data += "ID:S1";
  data += ",T:"    + String(temp);
  data += ",H:"    + String(hum);
  data += ",G:"    + String(gas);
  data += ",HR:"   + String(heartRate);
  data += ",SPO2:" + String(spo2);
  data += ",LAT:"  + String(lat, 6);
  data += ",LON:"  + String(lon, 6);
  data += ",STAT:" + status;

  // ---------- SEND LORA ----------
  LoRa.beginPacket();
  LoRa.print(data);
  LoRa.endPacket();

  Serial.println("Sent:");
  Serial.println(data);
  Serial.println("----------------------");

  delay(3000);
}
