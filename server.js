const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Store latest sensor data
let latestData = {
    temperature: null,
    humidity: null,
    gas: null,
    heartRate: null,
    spo2: null,
    lat: null,
    lng: null,
    timestamp: null,
    status: 'SAFE'
};

// Store historical data (last 50 readings)
let dataHistory = [];
const MAX_HISTORY = 50;

// Calculate status based on sensor values
function calculateStatus(data) {
    const GAS_DANGER = 2500;
    const SPO2_EMERGENCY = 90;
    const SPO2_WARNING = 93;
    const TEMP_WARNING = 35;

    // EMERGENCY
    if (data.gas > GAS_DANGER && data.spo2 < SPO2_EMERGENCY) {
        return 'EMERGENCY';
    }

    // WARNING
    if (data.gas > GAS_DANGER ||
        (data.spo2 >= SPO2_EMERGENCY && data.spo2 < SPO2_WARNING) ||
        data.temperature > TEMP_WARNING) {
        return 'WARNING';
    }

    // SAFE
    return 'SAFE';
}

// API Routes

// Receive data from Arduino
app.post('/api/data', (req, res) => {
    const data = req.body;

    // Add timestamp
    data.timestamp = new Date().toISOString();

    // Calculate status
    data.status = calculateStatus(data);

    // Update latest data
    latestData = data;

    // Add to history
    dataHistory.push(data);
    if (dataHistory.length > MAX_HISTORY) {
        dataHistory.shift(); // Remove oldest
    }

    console.log('📥 Received data:', data);

    res.json({
        success: true,
        message: 'Data received',
        status: data.status
    });
});

// Get latest data
app.get('/api/data/latest', (req, res) => {
    res.json(latestData);
});

// Get historical data
app.get('/api/data/history', (req, res) => {
    res.json(dataHistory);
});

// Get status
app.get('/api/status', (req, res) => {
    res.json({
        status: latestData.status,
        timestamp: latestData.timestamp
    });
});

// Serve the dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Smart Soldier IoT Dashboard Server');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🌐 Network access: http://172.16.247.241:${PORT}`);
    console.log('⏳ Waiting for Arduino data...\n');
});
