# 🎖️ SMART SOLDIER - IoT Dashboard

A real-time IoT monitoring dashboard for Smart Soldier health and environmental tracking system built with ESP32/Arduino.

![Dashboard Preview](https://img.shields.io/badge/Status-Active-00ff41?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-1.0.0-00ff41?style=for-the-badge)

## 📊 Features

### Real-time Monitoring
- **Health Vitals**: Heart Rate & SpO2 (Blood Oxygen) monitoring via MAX30102 sensor
- **Environmental Data**: Temperature & Humidity tracking via DHT11 sensor
- **Air Quality**: Gas level detection using MQ-135 sensor
- **GPS Tracking**: Live location monitoring with interactive map
- **Alert System**: Automatic status detection (SAFE/WARNING/EMERGENCY)

### Dashboard Features
- 🎨 Military-grade dark theme with neon green accents
- 📈 Real-time charts for trend analysis
- 🗺️ Interactive GPS map with live marker
- 🔔 Visual status indicators with color-coded alerts
- 📱 Fully responsive design
- ⚡ Smooth animations and glassmorphism effects

## 🛠️ Technology Stack

### Hardware
- **ESP32** microcontroller
- **DHT11** - Temperature & Humidity sensor
- **MAX30102** - Heart Rate & SpO2 sensor
- **MQ-135** - Air Quality/Gas sensor
- **GPS Module** - Location tracking
- **Buzzer** - Alert system

### Software
- **Backend**: Node.js + Express
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Maps**: Leaflet.js
- **Charts**: Chart.js
- **Data Format**: JSON

## 🚀 Installation

### Prerequisites
- Node.js (v14 or higher)
- Arduino IDE (for ESP32 programming)
- ESP32 board with sensors connected

### Setup Instructions

1. **Clone or navigate to the project directory**
   ```bash
   cd "c:/Users/ASUS/Desktop/EngiiGenious/IoT Dashboards/Smart Soldier Device"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Arduino**
   - Update WiFi credentials in Arduino code:
     ```cpp
     const char* ssid = "YourWiFiName";
     const char* password = "YourPassword";
     ```
   - Update server URL with your computer's IP:
     ```cpp
     const char* serverURL = "http://YOUR_IP:3000/api/data";
     ```

4. **Upload Arduino code to ESP32**
   - Open the `.ino` file in Arduino IDE
   - Select ESP32 board
   - Upload the code

5. **Start the server**
   ```bash
   npm start
   ```

6. **Access the dashboard**
   - Open browser: `http://localhost:3000`
   - Or from network: `http://YOUR_IP:3000`

## 📡 API Endpoints

### POST `/api/data`
Receive sensor data from Arduino
```json
{
  "temperature": 28.5,
  "humidity": 65.2,
  "gas": 1850,
  "heartRate": 75,
  "spo2": 98,
  "lat": 28.6139,
  "lng": 77.2090
}
```

### GET `/api/data/latest`
Get the most recent sensor reading

### GET `/api/data/history`
Get historical data (last 50 readings)

### GET `/api/status`
Get current system status (SAFE/WARNING/EMERGENCY)

## 🎯 Alert Thresholds

| Parameter | Warning | Emergency |
|-----------|---------|-----------|
| Gas Level | > 2500 | > 2500 + Low SpO2 |
| SpO2 | < 93% | < 90% |
| Temperature | > 35°C | - |

## 📁 Project Structure

```
Smart Soldier Device/
├── public/
│   ├── index.html      # Dashboard UI
│   ├── style.css       # Styling & animations
│   └── app.js          # Frontend logic
├── server.js           # Express backend
├── package.json        # Dependencies
└── README.md          # Documentation
```

## 🎨 Design Features

- **Military-grade aesthetic** with dark theme
- **Neon green accents** (#00ff41) for high visibility
- **Glassmorphism effects** for modern UI
- **Animated grid background** for depth
- **Scanline effect** for authentic military display
- **Smooth transitions** and micro-animations
- **Responsive design** for all screen sizes

## 🔧 Customization

### Changing Update Interval
Edit `public/app.js`:
```javascript
const UPDATE_INTERVAL = 2000; // milliseconds
```

### Modifying Alert Thresholds
Edit `server.js`:
```javascript
const GAS_DANGER = 2500;
const SPO2_EMERGENCY = 90;
const SPO2_WARNING = 93;
const TEMP_WARNING = 35;
```

### Changing Color Scheme
Edit `public/style.css` CSS variables:
```css
:root {
  --primary-green: #00ff41;
  --secondary-green: #00cc33;
  /* ... */
}
```

## 📊 Data Flow

```
Arduino ESP32 → WiFi → Express Server → REST API → Dashboard
     ↓                                                  ↓
  Sensors                                         Real-time UI
```

## 🐛 Troubleshooting

### Arduino not connecting to WiFi
- Check WiFi credentials
- Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- Verify network allows device connections

### Dashboard shows no data
- Verify server is running on port 3000
- Check Arduino serial monitor for HTTP response codes
- Ensure firewall allows connections on port 3000
- Verify server URL in Arduino code matches your IP

### Sensors showing incorrect values
- Check sensor connections
- Verify I2C addresses for MAX30102
- Ensure proper power supply to sensors

## 📝 License

MIT License - Feel free to use and modify

## 👨‍💻 Support

For issues or questions, check:
- Serial monitor output from Arduino
- Browser console for JavaScript errors
- Server terminal for backend logs

---

**Built with ❤️ for Smart Soldier Safety**
