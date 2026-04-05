# 🎖️ SMART SOLDIER – IoT Dashboard

A real-time IoT monitoring dashboard for Smart Soldier health and environmental tracking, using **LoRa wireless communication** between the soldier unit and base station.

![Status](https://img.shields.io/badge/Status-Active-00ff41?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-2.0.0-00ff41?style=for-the-badge)

---

## 📡 System Architecture

```
[SOLDIER UNIT]                      [BASE STATION]
ESP32 + Sensors                     ESP32 + WiFi
  + Ra-02 LoRa  ──── 433 MHz ────→   + Ra-02 LoRa  ──→  Node.js Server  ──→  Dashboard
(No WiFi needed)                    (Connected to PC)
```

**Why LoRa?**
- Range up to **5 km** in open field (no WiFi needed on soldier)
- Very low power consumption
- Ideal for military/field deployments

---

## 🔧 Hardware

### Soldier Unit (Transmitter)
| Component | Purpose |
|---|---|
| ESP32 | Microcontroller |
| DHT11 | Temperature & Humidity |
| MAX30102 | Heart Rate & SpO2 |
| MQ-135 | Air Quality / Gas (PPM) |
| GPS NEO-6M | Live location |
| Ra-02 SX1278 | LoRa 433 MHz transmitter |
| Buzzer | Local alert |

### Base Station (Receiver)
| Component | Purpose |
|---|---|
| ESP32 | Microcontroller |
| Ra-02 SX1278 | LoRa 433 MHz receiver |
| WiFi | Forward data to server |

---

## 📌 Ra-02 SX1278 Wiring (Both ESP32s)

| Ra-02 Pin | ESP32 Pin |
|---|---|
| VCC | 3.3V ⚠️ (never 5V!) |
| GND | GND |
| NSS (CS) | GPIO 5 |
| RESET | GPIO 14 |
| DIO0 | GPIO 26 |
| MOSI | GPIO 23 |
| MISO | GPIO 19 |
| SCK | GPIO 18 |

---

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Receiver
Open `arduino/lora_receiver.ino` and set:
```cpp
const char* WIFI_SSID     = "YourWiFiName";
const char* WIFI_PASSWORD = "YourPassword";
const char* SERVER_URL    = "http://YOUR_PC_IP:3000/api/data";
```
Find your PC IP: run `ipconfig` in PowerShell.

### 3. Upload Arduino Code
- Upload `arduino/lora_transmitter.ino` → Soldier unit ESP32
- Upload `arduino/lora_receiver.ino` → Base station ESP32

### 4. Start the Server
```bash
npm start
```

### 5. Open Dashboard
```
http://localhost:3000
```

---

## 📁 Project Structure

```
Smart Soldier Device/
├── arduino/
│   ├── lora_transmitter.ino   # Soldier unit (sensors + LoRa TX)
│   └── lora_receiver.ino      # Base station (LoRa RX + WiFi POST)
├── public/
│   ├── index.html             # Dashboard UI
│   ├── style.css              # Styling & animations
│   └── app.js                 # Frontend logic
├── server.js                  # Express backend
├── demo.js                    # Simulate data (no hardware needed)
└── package.json
```

---

## 📡 LoRa Packet Format

Data sent from transmitter every 3 seconds:
```
ID:S1,T:28.50,H:65.20,G:1450,HR:75,SPO2:98,LAT:28.613900,LON:77.209000,STAT:SAFE
```

## 📊 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/data` | Receive sensor data |
| GET | `/api/data/latest` | Latest reading |
| GET | `/api/data/history` | Last 50 readings |
| GET | `/api/status` | Current status |

## ⚠️ Alert Thresholds

| Parameter | Warning | Emergency |
|---|---|---|
| Gas | > 3200 PPM | > 3200 + SpO2 < 90% |
| SpO2 | < 93% | < 90% |
| Temperature | > 35°C | — |

## 🧪 Testing Without Hardware

```bash
node demo.js
```
Sends simulated sensor data to the server every 3 seconds.

---

## 🔧 Required Arduino Libraries

| Library | Author |
|---|---|
| LoRa | Sandeep Mistry |
| DHT sensor library | Adafruit |
| MAX30105 | SparkFun |
| spo2_algorithm | SparkFun |
| TinyGPS++ | Mikal Hart |
| ArduinoJson | Benoit Blanchon |

---

**Built with ❤️ for Smart Soldier Safety**
