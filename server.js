const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

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

    if (data.gas > GAS_DANGER && data.spo2 < SPO2_EMERGENCY) {
        return 'EMERGENCY';
    }

    if (data.gas > GAS_DANGER ||
        (data.spo2 >= SPO2_EMERGENCY && data.spo2 < SPO2_WARNING) ||
        data.temperature > TEMP_WARNING) {
        return 'WARNING';
    }

    return 'SAFE';
}

// API Routes
app.post('/api/data', (req, res) => {
    const data = req.body;
    data.timestamp = new Date().toISOString();
    data.status = calculateStatus(data);
    latestData = data;
    
    dataHistory.push(data);
    if (dataHistory.length > MAX_HISTORY) {
        dataHistory.shift();
    }

    console.log('📥 Received data:', data);

    res.json({
        success: true,
        message: 'Data received',
        status: data.status
    });
});

app.get('/api/data/latest', (req, res) => {
    res.json(latestData);
});

app.get('/api/data/history', (req, res) => {
    res.json(dataHistory);
});

app.get('/api/status', (req, res) => {
    res.json({
        status: latestData.status,
        timestamp: latestData.timestamp
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export for Vercel
module.exports = app;
