// DOM Elements
const screens = {
    setup: document.getElementById('setup-screen'),
    control: document.getElementById('control-screen')
};
const wsUrlInput = document.getElementById('ws-url');
const authTokenInput = document.getElementById('auth-token');
const connectBtn = document.getElementById('connect-btn');
const setupStatus = document.getElementById('setup-status');
const statusIndicator = document.getElementById('status-indicator');
const centerBtn = document.getElementById('center-btn');
const sensSlider = document.getElementById('sensitivity');
const sensVal = document.getElementById('sens-val');
const deadSlider = document.getElementById('deadzone');
const deadVal = document.getElementById('dead-val');
const scrollArea = document.getElementById('scroll-area');
const mouseBtns = document.querySelectorAll('.mouse-btn');

// State
let ws = null;
let isConnected = false;
let centerAngle = { alpha: 0, beta: 0 };
let currentFiltered = { alpha: 0, beta: 0 };
const filterAlpha = 0.3; // Low-pass filter coefficient (0.0 to 1.0)
let loopId = null;

// Scrolling state
let lastScrollY = 0;

// UI Updates
function setStatus(status) {
    setupStatus.textContent = `Status: ${status}`;
    statusIndicator.textContent = status;
    
    setupStatus.className = `status-${status}`;
    statusIndicator.className = `status-${status}`;
    isConnected = status === 'connected';
}

function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// WebSocket Connection
connectBtn.addEventListener('click', async () => {
    // iOS 13+ permission for DeviceOrientation
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission !== 'granted') {
                alert('Permission denied for device orientation.');
                return;
            }
        } catch (e) {
            console.error(e);
        }
    }

    const url = wsUrlInput.value.trim();
    const token = authTokenInput.value.trim();

    if (!url || !token) {
        alert('Please enter URL and Token');
        return;
    }

    setStatus('connecting');
    ws = new WebSocket(url);

    ws.onopen = () => {
        // Send Auth immediately
        ws.send(JSON.stringify({ type: 'auth', token: token }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'auth_result') {
            if (data.status === 'ok') {
                setStatus('connected');
                switchScreen('control');
                startSendingData();
            } else {
                alert('Authentication Failed');
                ws.close();
            }
        }
    };

    ws.onclose = () => {
        setStatus('disconnected');
        stopSendingData();
        switchScreen('setup');
    };

    ws.onerror = (err) => {
        console.error('WS Error:', err);
        setStatus('disconnected');
    };
});

// Settings Update
sensSlider.addEventListener('input', (e) => sensVal.textContent = e.target.value);
deadSlider.addEventListener('input', (e) => deadVal.textContent = e.target.value);

// Orientation Handling
window.addEventListener('deviceorientation', (e) => {
    if (!e.alpha || !e.beta) return; // Ignore if sensor not available

    // Apply Low-pass filter
    currentFiltered.alpha = filterAlpha * e.alpha + (1 - filterAlpha) * currentFiltered.alpha;
    currentFiltered.beta = filterAlpha * e.beta + (1 - filterAlpha) * currentFiltered.beta;
});

centerBtn.addEventListener('click', () => {
    centerAngle.alpha = currentFiltered.alpha;
    centerAngle.beta = currentFiltered.beta;
});

function normalizeAngle(angle) {
    if (angle > 180) return angle - 360;
    if (angle < -180) return angle + 360;
    return angle;
}

function startSendingData() {
    if (loopId) clearInterval(loopId);
    
    // Send 50 times per second (20ms interval)
    loopId = setInterval(() => {
        if (!isConnected || ws.readyState !== WebSocket.OPEN) return;

        let dAlpha = normalizeAngle(currentFiltered.alpha - centerAngle.alpha);
        let dBeta = normalizeAngle(currentFiltered.beta - centerAngle.beta);

        const deadzone = parseFloat(deadSlider.value);
        const sensitivity = parseFloat(sensSlider.value);

        // Apply deadzone
        if (Math.abs(dAlpha) < deadzone) dAlpha = 0;
        if (Math.abs(dBeta) < deadzone) dBeta = 0;

        // Convert angles to pixels (mapping Alpha to X, Beta to Y)
        // Alpha increases when turning left, so invert it for natural mouse X movement
        const dx = -dAlpha * sensitivity;
        const dy = dBeta * sensitivity;

        if (dx !== 0 || dy !== 0) {
            ws.send(JSON.stringify({
                type: 'move',
                dx: Math.round(dx),
                dy: Math.round(dy)
            }));
        }
    }, 20);
}

function stopSendingData() {
    if (loopId) clearInterval(loopId);
    loopId = null;
}

// Mouse Buttons
mouseBtns.forEach(btn => {
    const handlePress = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'button', button: btn.dataset.btn, state: 'down' }));
        }
    };
    const handleRelease = (e) => {
        e.preventDefault();
        btn.classList.remove('active');
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'button', button: btn.dataset.btn, state: 'up' }));
        }
    };

    btn.addEventListener('touchstart', handlePress);
    btn.addEventListener('touchend', handleRelease);
    btn.addEventListener('touchcancel', handleRelease);
});

// Scroll Handling
scrollArea.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
        lastScrollY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
});

scrollArea.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 2 && ws && ws.readyState === WebSocket.OPEN) {
        const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const delta = currentY - lastScrollY;
        
        if (Math.abs(delta) > 2) { // minimal threshold
            ws.send(JSON.stringify({
                type: 'scroll',
                delta: Math.round(delta)
            }));
            lastScrollY = currentY;
        }
    }
});