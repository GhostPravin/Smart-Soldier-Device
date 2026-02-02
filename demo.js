// Demo Mode - Simulates Arduino sensor data for testing
const API_URL = 'http://localhost:3000/api/data';

// Simulate realistic sensor data
function generateSensorData() {
    const baseHeartRate = 75;
    const baseSpo2 = 97;
    const baseTemp = 28;
    const baseHumidity = 65;
    const baseGas = 1500;

    // Add some realistic variation
    const data = {
        temperature: (baseTemp + (Math.random() * 4 - 2)).toFixed(1),
        humidity: (baseHumidity + (Math.random() * 10 - 5)).toFixed(1),
        gas: Math.floor(baseGas + (Math.random() * 500 - 250)),
        heartRate: Math.floor(baseHeartRate + (Math.random() * 20 - 10)),
        spo2: Math.floor(baseSpo2 + (Math.random() * 3 - 1)),
        lat: 28.6139 + (Math.random() * 0.01 - 0.005), // Delhi area
        lng: 77.2090 + (Math.random() * 0.01 - 0.005)
    };

    return data;
}

// Send data to server
async function sendData() {
    const data = generateSensorData();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        console.log('✅ Sent:', data);
        console.log('📡 Status:', result.status);
        console.log('---');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Start demo mode
console.log('🎖️ SMART SOLDIER - Demo Mode Started');
console.log('📡 Sending simulated sensor data every 3 seconds...\n');

// Send initial data
sendData();

// Send data every 3 seconds
setInterval(sendData, 3000);
