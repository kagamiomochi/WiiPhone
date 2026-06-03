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
const pauseBtn = document.getElementById('pause-btn');
const invertXCheck = document.getElementById('invert-x');
const invertYCheck = document.getElementById('invert-y');
const sensSlider = document.getElementById('sensitivity');
const sensVal = document.getElementById('sens-val');
const deadSlider = document.getElementById('deadzone');
const deadVal = document.getElementById('dead-val');
const trackpadArea = document.getElementById('trackpad-area');
const mouseBtns = document.querySelectorAll('.mouse-btn');

// State
let ws = null;
let isConnected = false;
let isPaused = false; // 一時停止フラグ
let centerAngle = { alpha: 0, beta: 0 };
let currentFiltered = { alpha: 0, beta: 0 };
const filterAlpha = 0.3; 
let loopId = null;

// Trackpad state
let lastTouchX = 0;
let lastTouchY = 0;
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

// Pause Logic
pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    if (isPaused) {
        pauseBtn.textContent = 'Resume';
        pauseBtn.className = 'paused-state';
    } else {
        pauseBtn.textContent = 'Pause';
        pauseBtn.className = 'active-state';
        // 再開時にジャイロの中心がズレて暴走しないよう、自動でセンタリングする
        centerAngle.alpha = currentFiltered.alpha;
        centerAngle.beta = currentFiltered.beta;
    }
});

// Settings Update
sensSlider.addEventListener('input', (e) => sensVal.textContent = e.target.value);
deadSlider.addEventListener('input', (e) => deadVal.textContent = e.target.value);

// WebSocket Connection
connectBtn.addEventListener('click', async () => {
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
});

// Gyroscope Handling
window.addEventListener('deviceorientation', (e) => {
    if (!e.alpha || !e.beta) return;
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

// Gyroscope Loop
function startSendingData() {
    if (loopId) clearInterval(loopId);
    
    loopId = setInterval(() => {
        // 未接続、または一時停止中は処理しない
        if (isPaused || !isConnected || ws.readyState !== WebSocket.OPEN) return;

        let dAlpha = normalizeAngle(currentFiltered.alpha - centerAngle.alpha);
        let dBeta = normalizeAngle(currentFiltered.beta - centerAngle.beta);

        const deadzone = parseFloat(deadSlider.value);
        const sensitivity = parseFloat(sensSlider.value);

        if (Math.abs(dAlpha) < deadzone) dAlpha = 0;
        if (Math.abs(dBeta) < deadzone) dBeta = 0;

        let dx = -dAlpha * sensitivity;
        let dy = dBeta * sensitivity;

        // 反転処理
        if (invertXCheck.checked) dx = -dx;
        if (invertYCheck.checked) dy = -dy;

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

// Trackpad Handling (Move & Scroll)
trackpadArea.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        lastScrollY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
});

trackpadArea.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isPaused || !isConnected || ws.readyState !== WebSocket.OPEN) return;
    
    const sensitivity = parseFloat(sensSlider.value);

    // 1本指: マウス移動
    if (e.touches.length === 1) {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        
        let dx = (currentX - lastTouchX) * sensitivity;
        let dy = (currentY - lastTouchY) * sensitivity;

        // 反転処理
        if (invertXCheck.checked) dx = -dx;
        if (invertYCheck.checked) dy = -dy;

        ws.send(JSON.stringify({
            type: 'move',
            dx: Math.round(dx),
            dy: Math.round(dy)
        }));

        lastTouchX = currentX;
        lastTouchY = currentY;
    } 
    // 2本指: スクロール
    else if (e.touches.length === 2) {
        const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        let delta = currentY - lastScrollY;
        
        if (Math.abs(delta) > 2) {
            // スクロールにも上下反転を適用するかはお好みですが、直感的に揃えます
            if (invertYCheck.checked) delta = -delta;
            
            ws.send(JSON.stringify({
                type: 'scroll',
                delta: Math.round(delta)
            }));
            lastScrollY = currentY;
        }
    }
});

// Mouse Buttons
mouseBtns.forEach(btn => {
    const handlePress = (e) => {
        e.preventDefault();
        if (isPaused) return; // 一時停止中はボタンも無効
        btn.classList.add('active');
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'button', button: btn.dataset.btn, state: 'down' }));
        }
    };
    const handleRelease = (e) => {
        e.preventDefault();
        if (isPaused) return;
        btn.classList.remove('active');
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'button', button: btn.dataset.btn, state: 'up' }));
        }
    };

    btn.addEventListener('touchstart', handlePress);
    btn.addEventListener('touchend', handleRelease);
    btn.addEventListener('touchcancel', handleRelease);
});
