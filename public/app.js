// ==================== CONFIGURATION ====================
const API_BASE_URL = window.location.origin;
const UPDATE_INTERVAL = 2000;

// ==================== STATE ====================
let map2d = null;
let marker2d = null;
let globe = {
    scene: null, camera: null, renderer: null, earth: null, marker: null, controls: null
};
let vitalsChart = null;
let environmentChart = null;
let dataHistory = [];
let lastStatus = 'SAFE';
let lastLat = 0;
let lastLng = 0;
let is3DMode = true; // Default to 3D
let currentHeartRate = 75; // Default for ECG

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initialize2DMap();
    initialize3DGlobe();
    initializeCharts();
    startECGAnimation(); // Start the heartbeat line

    // Toggle Logic
    const toggle = document.getElementById('mapToggle');
    toggle.addEventListener('change', (e) => {
        is3DMode = e.target.checked;
        document.getElementById('map3d').style.display = is3DMode ? 'block' : 'none';
        document.getElementById('map2d').style.display = is3DMode ? 'none' : 'block';
        if (!is3DMode) map2d.invalidateSize(); // Fix Leaflet rendering hidden
    });

    // Track Button Logic
    document.getElementById('trackBtn').addEventListener('click', () => {
        // 1. Ensure we are in 3D mode first to show the animation
        if (!is3DMode) {
            toggle.checked = true;
            toggle.dispatchEvent(new Event('change'));
        }

        // 2. Disable controls to prevent user interference
        if (globe.controls) globe.controls.enabled = false;

        // 3. Animate Zoom
        const duration = 1500; // ms
        const startZ = globe.camera.position.z;
        const targetZ = 1.2; // Close zoom
        const startTime = performance.now();

        function animateZoom(time) {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease In-Out Cubic
            const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            globe.camera.position.z = startZ + (targetZ - startZ) * ease;

            // Keep looking at earth (or specifically the marker if we wanted to be fancy, but center is safer)
            globe.camera.lookAt(0, 0, 0);

            if (progress < 1) {
                requestAnimationFrame(animateZoom);
            } else {
                // 4. Animation Complete -> Switch to 2D
                setTimeout(() => {
                    toggle.checked = false;
                    toggle.dispatchEvent(new Event('change'));

                    // Re-enable controls if they go back
                    if (globe.controls) {
                        globe.controls.enabled = true;
                        // Reset camera for next time? Maybe not immediately.
                        // globe.camera.position.z = 2.5; 
                    }
                }, 300); // Brief pause at max zoom
            }
        }

        requestAnimationFrame(animateZoom);
    });

    // Live Clock
    function updateClock() {
        const now = new Date();
        const str = now.toISOString().replace('T', ' ').split('.')[0];
        document.getElementById('liveClock').innerText = str;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Request Notification Permission
    if ("Notification" in window) {
        Notification.requestPermission();
    }

    startDataFetching();
});

// ==================== 2D MAP (SATELLITE) ====================
function initialize2DMap() {
    map2d = L.map('map2d').setView([20.5937, 78.9629], 5);

    // Esri World Imagery (Satellite)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
        maxZoom: 19
    }).addTo(map2d);

    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="width: 20px; height: 20px; border: 2px solid #0f0; background: rgba(0,255,0,0.3); border-radius: 50%;"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    marker2d = L.marker([0, 0], { icon: customIcon }).addTo(map2d);
}

// ==================== 3D GLOBE (THREE.JS) ====================
function initialize3DGlobe() {
    const container = document.getElementById('map3d');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 2.5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.autoRotate = true; // Auto rotate for cool effect
    controls.autoRotateSpeed = 0.5;

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // --- Earth Mesh ---
    const geometry = new THREE.SphereGeometry(1, 64, 64); // Smooth Sphere

    // Load Earth Texture
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');

    const material = new THREE.MeshPhongMaterial({
        map: earthTexture,
        color: 0x44ff44, // Green tint for HUD look
        emissive: 0x002200, // Slight self-glow
        specular: 0x111111,
        shininess: 10,
        bumpScale: 0.05
    });

    const earth = new THREE.Mesh(geometry, material);
    scene.add(earth);

    // Atmosphere Glow (slightly larger sphere)
    const atmoGeo = new THREE.SphereGeometry(1.02, 64, 64);
    const atmoMat = new THREE.MeshBasicMaterial({
        color: 0x00ff33,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
    scene.add(atmosphere);

    // Marker (Red Dot)
    const markerGeo = new THREE.SphereGeometry(0.02, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red for clear visibility
    const marker = new THREE.Mesh(markerGeo, markerMat);
    earth.add(marker); // Add to earth so it rotates with it

    // Store
    globe = { scene, camera, renderer, earth, marker, controls };

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Handle Resize
    window.addEventListener('resize', () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    });
}

// Convert Lat/Lon to 3D Vector
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    return new THREE.Vector3(x, y, z);
}

// ==================== ECG ANIMATION ====================
function startECGAnimation() {
    const canvas = document.getElementById('ecgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Fix resolution
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0; // Performance & clean look

    // Configuration
    const speed = 0.6; // Movement speed
    const tailLength = canvas.width / speed; // Draw full width history
    const history = []; // Ring buffer for points {x, y}

    let globalX = 0; // Infinite X

    function draw() {
        // 1. Clear Screen for True Transparency
        ctx.clearRect(0, 0, rect.width, rect.height);

        // 2. Generate New Point
        const currentBPM = currentHeartRate || 75;
        const signal = getECGSignal(globalX, currentBPM);
        const y = (rect.height / 2) - (signal * 20);

        // Add to history
        history.push({ x: globalX, y: y });
        if (history.length > tailLength) {
            history.shift();
        }

        // 3. Draw History Line
        ctx.beginPath();

        for (let i = 0; i < history.length - 1; i++) {
            const p1 = history[i];
            const p2 = history[i + 1];

            // Calculate relative screen X (scrolling effect)
            // The newest point is always at 'x_offset', older points shift left
            // Or easier: We simulate a scan line by mapping history based on modulo width
            // But user wants "Long Wave", usually scrolling is better.

            // Let's implement "Scan Bar" style with transparency:
            // Map globalX to screenX
            const sx1 = p1.x % rect.width;
            const sx2 = p2.x % rect.width;

            // Don't draw wrap-around lines
            if (Math.abs(sx1 - sx2) > speed * 4) continue;

            // Fading Trail Logic:
            // Calculate distance from "head"
            const dist = (globalX - p1.x);
            let alpha = 1.0 - (dist / (rect.width * 0.8)); // Fade out over 80% of screen
            if (alpha < 0) alpha = 0;

            // Eraser bar gap (don't draw just ahead of the head)
            if (dist < 0) continue; // Should not happen with this logic

            ctx.strokeStyle = `rgba(0, 255, 51, ${alpha})`;

            // Draw segment
            ctx.beginPath();
            ctx.moveTo(sx1, p1.y);
            ctx.lineTo(sx2, p2.y);
            ctx.stroke();
        }

        // Advance
        globalX += speed;
        requestAnimationFrame(draw);
    }

    // Synthetic ECG Generator
    function getECGSignal(x, bpm) {
        // Long Wave: High zoom factor
        const effectiveSpeed = speed * 80.0;
        const pixelsPerSec = 60 * effectiveSpeed;
        const pixelsPerBeat = pixelsPerSec / (bpm / 60);

        // Where are we in the beat cycle? (0 to 1)
        let phase = (x % pixelsPerBeat) / pixelsPerBeat;

        // P wave (earlier, wide bump)
        if (phase > 0.30 && phase < 0.45) return 0.25 * Math.sin((phase - 0.3) * 6.6 * Math.PI);

        // QRS complex (The main spike)
        if (phase > 0.48 && phase < 0.52) return -0.5; // Q
        if (phase > 0.50 && phase < 0.55) return 2.8; // R (Huge Spike)
        if (phase > 0.55 && phase < 0.58) return -0.8; // S

        // T wave (later, wide bump)
        if (phase > 0.65 && phase < 0.85) return 0.35 * Math.sin((phase - 0.65) * 5 * Math.PI);

        return (Math.random() - 0.5) * 0.15; // Baseline noise
    }

    requestAnimationFrame(draw);
}

// ==================== CHARTS INITIALIZATION ====================
function initializeCharts() {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: {
                labels: {
                    color: '#005511',
                    font: { family: 'Share Tech Mono', size: 12 }
                }
            }
        },
        scales: {
            x: {
                ticks: { color: '#005511' },
                grid: { color: 'rgba(0, 85, 17, 0.2)' }
            },
            y: {
                ticks: { color: '#005511' },
                grid: { color: 'rgba(0, 85, 17, 0.2)' }
            }
        },
        elements: {
            line: {
                borderWidth: 1,
                tension: 0
            },
            point: {
                radius: 0
            }
        }
    };

    const vitalsCtx = document.getElementById('vitalsChart').getContext('2d');
    vitalsChart = new Chart(vitalsCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'HR [BPM]',
                    data: [],
                    borderColor: '#ff3333',
                    borderWidth: 2,
                    fill: false
                },
                {
                    label: 'SpO2 [%]',
                    data: [],
                    borderColor: '#00ccff',
                    borderWidth: 2,
                    fill: false
                }
            ]
        },
        options: commonOptions
    });

    const envCtx = document.getElementById('environmentChart').getContext('2d');
    environmentChart = new Chart(envCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'TEMP',
                    data: [],
                    borderColor: '#ffcc00',
                    borderWidth: 1
                },
                {
                    label: 'GAS',
                    data: [],
                    borderColor: '#00ff33',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y1: {
                    type: 'linear',
                    position: 'right',
                    grid: { display: false },
                    ticks: { color: '#005511' }
                }
            }
        }
    });
}

// ==================== DATA FETCHING ====================
function startDataFetching() {
    fetchLatestData();
    setInterval(fetchLatestData, UPDATE_INTERVAL);
}

async function fetchLatestData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/data/latest`);
        const data = await response.json();
        if (data.timestamp) {
            updateDashboard(data);
            updateCharts(data);
        }
    } catch (error) {
        console.error('Connection lost:', error);
    }
}

// ==================== DASHBOARD UPDATE ====================
function updateDashboard(data) {
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    const statusIndicator = document.querySelector('.status-indicator');

    if (data.status === 'EMERGENCY') {
        statusText.innerText = 'CRITICAL FAILURE';
        statusText.style.color = '#ff3333';
        statusBadge.style.borderColor = '#ff3333';
        statusIndicator.style.backgroundColor = '#ff3333';

        if (lastStatus !== 'EMERGENCY') {
            const msg = `CRITICAL: VITALS OR ENV DANGER DETECTED! [G:${data.gas} O2:${data.spo2}%]`;
            logAlert(msg, 'emergency');
            showSystemNotification("⚠️ TACTICAL ALERT: EMERGENCY", msg);
        }
    } else if (data.status === 'WARNING') {
        statusText.innerText = 'CAUTION REQUIRED';
        statusText.style.color = '#ffcc00';
        statusBadge.style.borderColor = '#ffcc00';
        statusIndicator.style.backgroundColor = '#ffcc00';

        if (lastStatus !== 'WARNING') {
            const msg = `WARNING: PARAMETERS ELEVATED [Temp:${data.temperature}°C]`;
            logAlert(msg, 'warning');
            showSystemNotification("⚠️ CAUTION: SYSTEM WARNING", msg);
        }
    } else {
        statusText.innerText = 'SYSTEM NORMAL';
        statusText.style.color = '#00ff33';
        statusBadge.style.borderColor = '#00ff33';
        statusIndicator.style.backgroundColor = '#00ff33';

        if (lastStatus !== 'SAFE') {
            logAlert('SYSTEM STABILIZED. RESUMING NORMAL MONITORING.', 'safe');
        }
    }

    lastStatus = data.status;



    document.getElementById('temperature').innerText = data.temperature ? data.temperature : '--';
    document.getElementById('humidity').innerText = data.humidity ? data.humidity : '--';
    document.getElementById('heartRate').innerText = data.heartRate ? data.heartRate : '--';
    document.getElementById('spo2').innerText = data.spo2 ? data.spo2 : '--';
    document.getElementById('gas').innerText = data.gas ? data.gas : '--';

    // Update Global HR for ECG
    if (data.heartRate) currentHeartRate = data.heartRate;

    setBar('tempProgress', data.temperature, 0, 50);
    setBar('humidityProgress', data.humidity, 0, 100);
    // setBar('heartRateProgress', data.heartRate, 40, 180);
    setBar('spo2Progress', data.spo2, 70, 100);
    setBar('gasProgress', data.gas, 0, 4000);

    // Check Thresholds & Apply Danger Styles
    updateDangerVisuals(data);

    if (data.lat && data.lng) {
        document.getElementById('latitude').innerText = data.lat.toFixed(4) + ' N';
        document.getElementById('longitude').innerText = data.lng.toFixed(4) + ' E';

        marker2d.setLatLng([data.lat, data.lng]);
        map2d.setView([data.lat, data.lng], 15);

        if (globe.earth) {
            const pos = latLonToVector3(data.lat, data.lng, 1.0);
            globe.marker.position.copy(pos);
            globe.marker.lookAt(new THREE.Vector3(0, 0, 0));
        }

        if (Math.abs(data.lat - lastLat) > 0.001 || Math.abs(data.lng - lastLng) > 0.001) {
            getAddress(data.lat, data.lng);
            lastLat = data.lat;
            lastLng = data.lng;
        }
    }

    document.getElementById('lastUpdate').innerText = data.timestamp.split('T')[1].split('.')[0] + ' GMT';
}

function setBar(id, val, min, max) {
    if (val === undefined || val === null) return;
    const pct = Math.min(Math.max((val - min) / (max - min) * 100, 0), 100);
    document.getElementById(id).style.width = pct + '%';
}

// ==================== THRESHOLD HELPER ====================
function updateDangerVisuals(data) {
    toggleDanger('temperature', data.temperature > 50); // High Temp
    toggleDanger('heartRate', data.heartRate > 150 || data.heartRate < 40); // Arrhythmia
    toggleDanger('spo2', data.spo2 < 90); // Hypoxia
    toggleDanger('gas', data.gas > 1500); // Toxic Gas
}

function toggleDanger(elementId, isDangerous) {
    const el = document.getElementById(elementId);
    if (el) {
        const card = el.closest('.card');
        if (card) {
            if (isDangerous) card.classList.add('danger-alert');
            else card.classList.remove('danger-alert');
        }
    }
}

// ==================== CHART UPDATE ====================
function updateCharts(data) {
    const timeLabel = data.timestamp.split('T')[1].slice(0, 5); // HH:MM
    const limit = 20;

    addToChart(vitalsChart, timeLabel, [data.heartRate, data.spo2], limit);
    addToChart(environmentChart, timeLabel, [data.temperature, data.gas], limit);
}

function addToChart(chart, label, values, limit) {
    chart.data.labels.push(label);
    if (chart.data.labels.length > limit) chart.data.labels.shift();

    values.forEach((v, i) => {
        chart.data.datasets[i].data.push(v);
        if (chart.data.datasets[i].data.length > limit) chart.data.datasets[i].data.shift();
    });

    chart.update();
}

// ==================== ALERT LOGGING ====================
function logAlert(message, type) {
    const alertBox = document.getElementById('alertBox');
    const time = new Date().toLocaleTimeString();

    const div = document.createElement('div');
    div.className = `alert-line ${type}`;
    div.innerHTML = `<span class="time">[${time}]</span> <span class="msg">${message}</span>`;

    alertBox.appendChild(div);
    alertBox.scrollTop = alertBox.scrollHeight;

    if (alertBox.children.length > 50) {
        alertBox.removeChild(alertBox.firstChild);
    }
}

// ==================== GEOCODING ====================
async function getAddress(lat, lng) {
    try {
        document.getElementById('locationName').innerText = "SCANNING...";
        // Add accept-language=en to force English results
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`);
        const data = await res.json();

        const addr = data.address;

        // Requested Format: Country, State, Area
        const country = addr.country || "";
        const state = addr.state || "";

        // Hierarchy for "Area" (City/Town/Village/Suburb)
        const area = addr.suburb ||
            addr.town ||
            addr.city ||
            addr.village ||
            addr.city_district ||
            addr.county ||
            "REMOTE";

        // Construct the full string
        let parts = [country, state, area].filter(Boolean); // Remove empty values
        let fullLoc = parts.join(", ");

        fullLoc = fullLoc.toUpperCase();

        // Increased limit for longer format
        if (fullLoc.length > 35) fullLoc = fullLoc.substring(0, 32) + "...";

        document.getElementById('locationName').innerText = fullLoc;

    } catch (error) {
        console.error("Geo Error", error);
        document.getElementById('locationName').innerText = "SAT.LINK_ERR";
    }
}

// Helper for Browser Notifications
function showSystemNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: body, icon: 'https://cdn-icons-png.flaticon.com/512/564/564619.png' });
    }
}
