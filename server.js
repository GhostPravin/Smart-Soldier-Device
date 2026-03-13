const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
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
    try {
        const data = req.body;

        // Validate data
        if (!data || typeof data !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Invalid data format'
            });
        }

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
    } catch (error) {
        console.error('❌ Error processing data:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing data',
            error: error.message
        });
    }
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

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Smart Soldier IoT Dashboard Server is running',
        timestamp: new Date().toISOString()
    });
});

// Serve the dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export for Vercel
module.exports = app;