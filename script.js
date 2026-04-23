// ─────────────────────────────────────────────────────────────
// W3: Enhanced Bubble Renderer — full 3D shading + animation
// ─────────────────────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const gameOverEl = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');

const COLS = 10;
const ROWS = 14;
const BUBBLE_RADIUS = 16;
const BUBBLE_SIZE = BUBBLE_RADIUS * 2;
const COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

window.gameState = {
    currentLevel: 1,
    gridRowsInitial: 4,
    shotsPerDrop: 6,
    shotsRemaining: 6,
    shotsCount: 0,
    comboCount: 0,
    comboMatchCount: 0,
    bubbleSpeed: 10,
    activeColors: COLORS.slice()
};

let grid = [];
let currentBubble = null;
let nextColor = '';
let score = 0;
let isGameOver = false;
let mouseX = canvas.width / 2;
let mouseY = 0;

let bubbleTw = { scale: 1, brightness: 0, shimmer: 0 };

let screenShake = { x: 0, y: 0, intensity: 0 };

function triggerScreenShake(intensity) {
    screenShake.intensity = intensity || 5;
}

function drawBubble(x, y, color, state) {
    state = state || {};
    const tw = {
        scale:       state.scale       !== undefined ? state.scale       : 1,
        brightness:  state.brightness  !== undefined ? state.brightness  : 0,
        shimmer:     state.shimmer      !== undefined ? state.shimmer      : 0,
        squish:      state.squish       !== undefined ? state.squish       : 0,
        squishY:     state.squishY      !== undefined ? state.squishY      : 1,
    };

    ctx.save();

    // Squish / stretch transform (e.g. before popping)
    if (tw.squish !== 0 || tw.squishY !== 1) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1 + tw.squish, tw.squishY);
        ctx.translate(-x, -y);
    }

    // Global scale (e.g. spawn pop-in)
    if (tw.scale !== 1) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(tw.scale, tw.scale);
        ctx.translate(-x, -y);
    }

    const R = BUBBLE_RADIUS;
    const cx = x, cy = y;

    // ── Drop Shadow ──────────────────────────────────────────
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;

    // ── Main sphere body with offset radial gradient ─────────
    ctx.beginPath();
    ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);

    // Offset radial gradient: fake light from upper-left
    const g1 = ctx.createRadialGradient(
        cx - R * 0.38, cy - R * 0.38, R * 0.06,  // highlight center (upper-left)
        cx, cy, R                                   // sphere edge
    );
    const lightened  = lightenColor(color, 70 + tw.brightness);
    const baseColor  = tw.brightness
        ? lightenColor(color, tw.brightness)
        : color;
    const darkened   = darkenColor(color, 55);

    g1.addColorStop(0.00, lightened);                   // specular highlight
    g1.addColorStop(0.18, lightenColor(baseColor, 30)); // bright zone
    g1.addColorStop(0.48, baseColor);                  // midtone
    g1.addColorStop(1.00, darkened);                   // shadow

    ctx.fillStyle = g1;
    ctx.fill();
    ctx.closePath();

    // ── Rim light (right-bottom edge) ───────────────────────
    ctx.beginPath();
    ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
    const rim = ctx.createRadialGradient(
        cx + R * 0.3, cy + R * 0.3, R * 0.5,
        cx + R * 0.3, cy + R * 0.3, R * 1.2
    );
    rim.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    rim.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rim;
    ctx.fill();
    ctx.closePath();

    // ── Primary gloss ellipse (upper-left) ───────────────────
    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.beginPath();
    ctx.ellipse(
        cx - R * 0.32, cy - R * 0.32,
        R * 0.42, R * 0.22,
        Math.PI / 5, 0, Math.PI * 2
    );
    const gloss1 = ctx.createLinearGradient(
        cx - R * 0.6, cy - R * 0.55,
        cx - R * 0.1, cy - R * 0.1
    );
    gloss1.addColorStop(0,   'rgba(255, 255, 255, 0.88)');
    gloss1.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)');
    gloss1.addColorStop(1,   'rgba(255, 255, 255, 0.00)');
    ctx.fillStyle = gloss1;
    ctx.fill();
    ctx.closePath();

    // ── Secondary small highlight (specular dot) ──────────────
    ctx.beginPath();
    ctx.arc(cx - R * 0.42, cy - R * 0.42, R * 0.11, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fill();
    ctx.closePath();

    // ── Shimmer animation (active bubble) ────────────────────
    if (tw.shimmer > 0) {
        const shAngle = tw.shimmer * Math.PI * 2;
        const shX = cx + Math.cos(shAngle) * R * 0.55;
        const shY = cy + Math.sin(shAngle) * R * 0.55;
        ctx.beginPath();
        ctx.arc(shX, shY, R * 0.18, 0, Math.PI * 2);
        const shGrad = ctx.createRadialGradient(shX, shY, 0, shX, shY, R * 0.18);
        shGrad.addColorStop(0, `rgba(255, 255, 255, ${0.5 * (1 - tw.shimmer)})`);
        shGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shGrad;
        ctx.fill();
        ctx.closePath();
    }

    ctx.restore();

    // ── Inner glow pulse ring (optional active state) ────────
    if (state.pulse !== undefined && state.pulse > 0) {
        ctx.save();
        ctx.globalAlpha = state.pulse * 0.6;
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(cx, cy, R + 4 + state.pulse * 6, 0, Math.PI * 2);
        ctx.strokeStyle = lightenColor(color, 60);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    }

    // Restore squish transform if applied
    if (tw.squish !== 0 || tw.squishY !== 1) ctx.restore();
    if (tw.scale !== 1) ctx.restore();
}


// ─────────────────────────────────────────────────────────────
// W3: Enhanced Cannon Renderer — 3D barrel, aim arc, tween
// ─────────────────────────────────────────────────────────────

let cannonTw = {
    recoil:    0,   // 0→1 barrel kick-back
    barrelSpin: 0, // rotation smoothing toward target
    muzzleFlash: 0, // 0→1 muzzle flash on fire
    age:       0,   // general age for ambient animation
};

let lastAimAngle = 0;
let aimVelocity  = 0;

function drawCannon() {
    const cx = canvas.width  / 2;
    const cy = canvas.height;

    // Smooth barrel angle (lerp toward target)
    const targetAngle = Math.atan2(mouseY - cy, mouseX - cx);
    const delta = targetAngle - lastAimAngle;
    // Wrap to [-π, π]
    let wrapped = ((delta + Math.PI) % (Math.PI * 2)) - Math.PI;
    aimVelocity = aimVelocity * 0.75 + wrapped * 0.25;
    lastAimAngle += aimVelocity;
    const angle = lastAimAngle;

    ctx.save();

    // ── Floor Shadow under cannon ────────────────────────────
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, 32, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Cannon Base — hemisphere with metallic radial ─────────
    ctx.save();
    ctx.translate(cx, cy);
    const baseGrad = ctx.createRadialGradient(-6, -6, 2, 0, 0, 22);
    baseGrad.addColorStop(0,   '#888');
    baseGrad.addColorStop(0.35,'#555');
    baseGrad.addColorStop(0.7, '#2a2a2a');
    baseGrad.addColorStop(1,   '#111');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 22, Math.PI, Math.PI * 2);  // bottom hemisphere
    ctx.fill();

    // Base ring detail
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 18, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.closePath();
    ctx.restore();

    // ── Barrel group (rotated from base pivot) ───────────────
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const recoilOffset = cannonTw.recoil * -8; // kick back during recoil

    // Barrel outer body (3D cylinder)
    const barrelLen = 44 + recoilOffset;
    const barrelGrad = ctx.createLinearGradient(0, -11, 0, 11);
    barrelGrad.addColorStop(0.00, '#ccc');   // top highlight
    barrelGrad.addColorStop(0.22, '#eee');  // bright band
    barrelGrad.addColorStop(0.50, '#666');  // mid grey
    barrelGrad.addColorStop(0.80, '#333');  // dark band
    barrelGrad.addColorStop(1.00, '#1a1a1a'); // bottom shadow

    ctx.fillStyle = barrelGrad;
    ctx.beginPath();
    // Rounded rect via manual path (ES5-compatible)
    const rx1 = recoilOffset, ry1 = -11, rw = barrelLen, rh = 22, r = 4;
    ctx.moveTo(rx1 + r, ry1);
    ctx.lineTo(rx1 + rw - r, ry1);
    ctx.arcTo(rx1 + rw, ry1, rx1 + rw, ry1 + r, r);
    ctx.lineTo(rx1 + rw, ry1 + rh - r);
    ctx.arcTo(rx1 + rw, ry1 + rh, rx1 + rw - r, ry1 + rh, r);
    ctx.lineTo(rx1 + r, ry1 + rh);
    ctx.arcTo(rx1, ry1 + rh, rx1, ry1 + rh - r, r);
    ctx.lineTo(rx1, ry1 + r);
    ctx.arcTo(rx1, ry1, rx1 + r, ry1, r);
    ctx.closePath();
    ctx.fill();

    // Barrel ribbing (mechanical lines)
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
        const bx = recoilOffset + i * 9;
        ctx.beginPath();
        ctx.moveTo(bx, -11);
        ctx.lineTo(bx, 11);
        ctx.stroke();
    }

    // Muzzle collar (front ring)
    const collarGrad = ctx.createLinearGradient(0, -13, 0, 13);
    collarGrad.addColorStop(0, '#aaa');
    collarGrad.addColorStop(0.4, '#ddd');
    collarGrad.addColorStop(1, '#444');
    ctx.fillStyle = collarGrad;
    ctx.beginPath();
    const cx2 = barrelLen - 6 + recoilOffset, cy2 = -13, cw = 8, ch = 26, cr = 2;
    ctx.moveTo(cx2 + cr, cy2);
    ctx.lineTo(cx2 + cw - cr, cy2);
    ctx.arcTo(cx2 + cw, cy2, cx2 + cw, cy2 + cr, cr);
    ctx.lineTo(cx2 + cw, cy2 + ch - cr);
    ctx.arcTo(cx2 + cw, cy2 + ch, cx2 + cw - cr, cy2 + ch, cr);
    ctx.lineTo(cx2 + cr, cy2 + ch);
    ctx.arcTo(cx2, cy2 + ch, cx2, cy2 + ch - cr, cr);
    ctx.lineTo(cx2, cy2 + cr);
    ctx.arcTo(cx2, cy2, cx2 + cr, cy2, cr);
    ctx.closePath();
    ctx.fill();

    // Muzzle bore (dark circle at end)
    ctx.beginPath();
    ctx.arc(barrelLen + recoilOffset, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(barrelLen + recoilOffset, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();

    // ── Muzzle flash ─────────────────────────────────────────
    if (cannonTw.muzzleFlash > 0) {
        const mf = cannonTw.muzzleFlash;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Core flash
        const flashGrad = ctx.createRadialGradient(
            barrelLen + 4 + recoilOffset, 0, 0,
            barrelLen + 4 + recoilOffset, 0, 20 * mf
        );
        flashGrad.addColorStop(0,   `rgba(255, 240, 100, ${mf * 0.9})`);
        flashGrad.addColorStop(0.3, `rgba(255, 180, 50,  ${mf * 0.6})`);
        flashGrad.addColorStop(1,   'rgba(255, 100, 0,   0)');
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(barrelLen + 4 + recoilOffset, 0, 20 * mf, 0, Math.PI * 2);
        ctx.fill();

        // Flash spokes
        ctx.strokeStyle = `rgba(255, 230, 100, ${mf * 0.7})`;
        ctx.lineWidth = 2;
        for (let a = 0; a < 6; a++) {
            const aRad = (a / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(barrelLen + recoilOffset, 0);
            ctx.lineTo(
                barrelLen + recoilOffset + Math.cos(aRad) * 28 * mf,
                Math.sin(aRad) * 28 * mf
            );
            ctx.stroke();
        }
        ctx.restore();
    }

    ctx.restore(); // end barrel group

    // ── Aiming Trajectory Arc (with gravity preview) ─────────
    if (!currentBubble?.moving && !isGameOver) {
        const speed = 10;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const g  = 0.2; // must match particle gravity

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        let px = cx, py = cy;
        let pvx = vx, pvy = vy;
        ctx.moveTo(px, py);
        for (let t = 0; t < 55; t++) {
            pvx = pvx;                              // no air resistance
            pvy += g;                               // gravity
            px  += pvx;
            py  += pvy;
            if (px < 0 || px > canvas.width || py > canvas.height) break;
            ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Aim reticle at predicted end
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    // ── Draw dragons (Bub right, Bob left) ───────────────────
    drawDragon(cx + 38, cy - 22, '#00CC00', false);
    drawDragon(cx - 62, cy - 22, '#0066FF', true);

    // ── Next bubble (with pop-in tween) ───────────────────────
    const nbScale = 0.85 + 0.15 * Math.sin(cannonTw.age * 0.06);
    drawBubble(cx - 42, cy - 18, nextColor, { scale: nbScale });

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font      = 'bold 11px "Nunito"';
    ctx.fillText('Next', cx - 68, cy - 38);

    ctx.restore();
}


// ─────────────────────────────────────────────────────────────
// Tween update — call once per frame in gameLoop update()
// ─────────────────────────────────────────────────────────────

function updateCannonTweens(dt) {
    // Recoil decay
    if (cannonTw.recoil > 0) {
        cannonTw.recoil = Math.max(0, cannonTw.recoil - dt * 0.04);
    }
    // Muzzle flash decay
    if (cannonTw.muzzleFlash > 0) {
        cannonTw.muzzleFlash = Math.max(0, cannonTw.muzzleFlash - dt * 0.06);
    }
    // General age counter (for ambient animation)
    cannonTw.age = (cannonTw.age || 0) + (dt || 16);
}

function fireCannon() {
    // Trigger recoil + muzzle flash
    cannonTw.recoil     = 1;
    cannonTw.muzzleFlash = 1;
}


// ═══════════════════════════════════════════════════════════════
// ORIGINAL GAME LOGIC — patched with W3 cannon integration
// ═══════════════════════════════════════════════════════════════

// ── initGame ───────────────────────────────────────────────────
function initGame() {
    grid = Array(ROWS).fill().map(() => Array(COLS).fill(null));
    score = 0;
    isGameOver = false;
    scoreEl.innerText = score;
    gameOverEl.style.display = 'none';
    restartBtn.style.display = 'none';
    particleSystem.particles = [];
    cannonTw.recoil = 0;
    cannonTw.muzzleFlash = 0;
    cannonTw.age = 0;
    lastAimAngle = 0;
    aimVelocity = 0;

    window.gameState.currentLevel = 1;
    window.gameState.gridRowsInitial = 4;
    window.gameState.shotsPerDrop = 6;
    window.gameState.shotsRemaining = 6;
    window.gameState.shotsCount = 0;
    window.gameState.comboCount = 0;
    window.gameState.bubbleSpeed = 10;
    window.gameState.activeColors = COLORS.slice();

    for (let r = 0; r < window.gameState.gridRowsInitial; r++) {
        for (let c = 0; c < COLS; c++) {
            if (r % 2 !== 0 && c === COLS - 1) continue;
            grid[r][c] = window.gameState.activeColors[Math.floor(Math.random() * window.gameState.activeColors.length)];
        }
    }

    nextColor = window.gameState.activeColors[Math.floor(Math.random() * window.gameState.activeColors.length)];
    spawnBubble();
    lastTime = 0;
    requestAnimationFrame(gameLoop);
}

// ── spawnBubble ────────────────────────────────────────────────
function spawnBubble() {
    currentBubble = {
        x: canvas.width / 2,
        y: canvas.height - BUBBLE_RADIUS,
        color: nextColor,
        dx: 0,
        dy: 0,
        moving: false
    };
    nextColor = window.gameState.activeColors[Math.floor(Math.random() * window.gameState.activeColors.length)];
}

// ── getGridPos ──────────────────────────────────────────────────
function getGridPos(r, c) {
    const x = (c * BUBBLE_SIZE) + BUBBLE_RADIUS + (r % 2 !== 0 ? BUBBLE_RADIUS : 0);
    const y = (r * BUBBLE_SIZE * 0.85) + BUBBLE_RADIUS;
    return { x, y };
}

// ── drawGrid ────────────────────────────────────────────────────
function drawGrid() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c]) {
                const pos = getGridPos(r, c);
                drawBubble(pos.x, pos.y, grid[r][c]);
            }
        }
    }
}

// ── hexToRgb ────────────────────────────────────────────────────
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// ── lightenColor ────────────────────────────────────────────────
function lightenColor(hex, percent) {
    let rgb = hexToRgb(hex);
    if (!rgb) return hex;
    let r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * (percent / 100)));
    let g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * (percent / 100)));
    let b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * (percent / 100)));
    return `rgb(${r}, ${g}, ${b})`;
}

// ── darkenColor ──────────────────────────────────────────────────
function darkenColor(hex, percent) {
    let rgb = hexToRgb(hex);
    if (!rgb) return hex;
    let r = Math.max(0, Math.floor(rgb.r * (1 - percent / 100)));
    let g = Math.max(0, Math.floor(rgb.g * (1 - percent / 100)));
    let b = Math.max(0, Math.floor(rgb.b * (1 - percent / 100)));
    return `rgb(${r}, ${g}, ${b})`;
}

// ── drawDragon ──────────────────────────────────────────────────
function drawDragon(x, y, color, facingRight) {
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.ellipse(x, y + 22, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(x, y);
    if (!facingRight) ctx.scale(-1, 1);

    const darkColor  = darkenColor(color, 40);
    const lightColor = lightenColor(color, 40);

    const bodyGrad = ctx.createRadialGradient(-3, 5, 2, 0, 10, 15);
    bodyGrad.addColorStop(0, lightColor);
    bodyGrad.addColorStop(0.5, color);
    bodyGrad.addColorStop(1, darkColor);

    const headGrad = ctx.createRadialGradient(2, -8, 2, 5, -5, 12);
    headGrad.addColorStop(0, lightColor);
    headGrad.addColorStop(0.6, color);
    headGrad.addColorStop(1, darkColor);

    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.moveTo(-10, 10); ctx.lineTo(-25, 15); ctx.lineTo(-10, 20);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, 10, 15, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    const bellyGrad = ctx.createRadialGradient(3, 10, 2, 5, 12, 10);
    bellyGrad.addColorStop(0, '#FFF5CC');
    bellyGrad.addColorStop(1, '#FFCC00');
    ctx.fillStyle = bellyGrad;
    ctx.beginPath();
    ctx.ellipse(5, 12, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(5, -5, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(12, -2, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(15, -4, 3, 1.5, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(8, -8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(10, -8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(10.5, -9, 1, 0, Math.PI * 2);
    ctx.fill();

    const spikeGrad = ctx.createLinearGradient(-20, -20, 0, 10);
    spikeGrad.addColorStop(0, '#FF6666');
    spikeGrad.addColorStop(1, '#990000');
    ctx.fillStyle = spikeGrad;
    ctx.beginPath();
    ctx.moveTo(-5, -12); ctx.lineTo(-10, -20); ctx.lineTo(-12, -10);
    ctx.moveTo(-10, -5); ctx.lineTo(-18, -10); ctx.lineTo(-15, 0);
    ctx.moveTo(-12, 5);  ctx.lineTo(-22, 5);   ctx.lineTo(-14, 12);
    ctx.fill();

    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.ellipse(8, 8, 6, 3, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.ellipse(0, 20, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// ── update ──────────────────────────────────────────────────────
function update() {
    if (!currentBubble?.moving || isGameOver) return;

    currentBubble.x += currentBubble.dx;
    currentBubble.y += currentBubble.dy;

    if (currentBubble.x <= BUBBLE_RADIUS || currentBubble.x >= canvas.width - BUBBLE_RADIUS) {
        currentBubble.dx *= -1;
        currentBubble.x = Math.max(BUBBLE_RADIUS, Math.min(canvas.width - BUBBLE_RADIUS, currentBubble.x));
    }

    let collided = false;
    if (currentBubble.y <= BUBBLE_RADIUS) collided = true;

    if (!collided) {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c]) {
                    const pos = getGridPos(r, c);
                    const dist = Math.hypot(currentBubble.x - pos.x, currentBubble.y - pos.y);
                    if (dist < BUBBLE_SIZE - 2) { collided = true; break; }
                }
            }
            if (collided) break;
        }
    }

    if (collided) {
        currentBubble.moving = false;
        snapToGrid();
    }
}

// ── snapToGrid ──────────────────────────────────────────────────
function snapToGrid() {
    let bestR = 0, bestC = 0, minDist = Infinity;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (r % 2 !== 0 && c === COLS - 1) continue;
            if (!grid[r][c]) {
                const pos = getGridPos(r, c);
                const dist = Math.hypot(currentBubble.x - pos.x, currentBubble.y - pos.y);
                if (dist < minDist) { minDist = dist; bestR = r; bestC = c; }
            }
        }
    }

    grid[bestR][bestC] = currentBubble.color;
    if (bestR >= ROWS - 2) { gameOver(); return; }
    const madeMatch = checkMatches(bestR, bestC);
    dropFloating();

    if (!madeMatch) {
        window.gameState.shotsCount++;
        window.gameState.shotsRemaining = Math.max(0, window.gameState.shotsPerDrop - window.gameState.shotsCount);
        window.gameState.comboCount = 0;

        if (window.gameState.shotsCount >= window.gameState.shotsPerDrop) {
            dropCeiling();
            window.gameState.shotsCount = 0;
            window.gameState.shotsRemaining = window.gameState.shotsPerDrop;
        }
    } else {
        window.gameState.comboCount++;
    }

    // Level complete check
    if (grid.every(row => row.every(cell => cell === null))) {
        advanceLevel();
        return;
    }

    spawnBubble();
}

// ── getNeighbors ────────────────────────────────────────────────
function getNeighbors(r, c) {
    const neighbors = [];
    const dirs = r % 2 === 0
        ? [[-1,-1],[-1,0],[0,-1],[0,1],[1,-1],[1,0]]
        : [[-1,0],[-1,1],[0,-1],[0,1],[1,0],[1,1]];
    for (let [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            if (nr % 2 !== 0 && nc === COLS - 1) continue;
            neighbors.push({ r: nr, c: nc });
        }
    }
    return neighbors;
}

// ── checkMatches ────────────────────────────────────────────────
function checkMatches(r, c) {
    const color = grid[r][c];
    const match = [], visited = new Set();
    const queue = [{ r, c }];

    while (queue.length > 0) {
        const curr = queue.shift();
        const key  = `${curr.r},${curr.c}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (grid[curr.r]?.[curr.c] === color) {
            match.push(curr);
            for (let n of getNeighbors(curr.r, curr.c)) queue.push(n);
        }
    }

    if (match.length >= 3) {
        soundManager.playPop();
        match.forEach(p => {
            const pos = getGridPos(p.r, p.c);
            particleSystem.createExplosion(pos.x, pos.y, grid[p.r][p.c]);
            grid[p.r][p.c] = null;
        });
        score += match.length * 10;
        scoreEl.innerText = score;
        return true;
    }
    return false;
}

// ── dropFloating ────────────────────────────────────────────────
function dropFloating() {
    const visited = new Set(), queue = [];
    for (let c = 0; c < COLS; c++) { if (grid[0][c]) queue.push({ r: 0, c }); }

    while (queue.length > 0) {
        const curr = queue.shift();
        const key  = `${curr.r},${curr.c}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (grid[curr.r]?.[curr.c]) {
            for (let n of getNeighbors(curr.r, curr.c)) queue.push(n);
        }
    }

    let dropped = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] && !visited.has(`${r},${c}`)) {
                const pos = getGridPos(r, c);
                particleSystem.createExplosion(pos.x, pos.y, grid[r][c]);
                grid[r][c] = null;
                dropped++;
            }
        }
    }

    if (dropped > 0) {
        soundManager.playPop();
        score += dropped * 20;
        scoreEl.innerText = score;
    }
}

// ── dropCeiling ───────────────────────────────────────────────
function dropCeiling() {
    triggerScreenShake(4);
    soundManager.playCeilingDrop();
    window.gameState.comboCount = 0;

    for (let r = ROWS - 1; r > 0; r--) {
        for (let c = 0; c < COLS; c++) {
            grid[r][c] = grid[r - 1][c];
        }
    }

    for (let c = 0; c < COLS; c++) {
        if (0 % 2 !== 0 && c === COLS - 1) continue;
        grid[0][c] = window.gameState.activeColors[Math.floor(Math.random() * window.gameState.activeColors.length)];
    }

    for (let c = 0; c < COLS; c++) {
        if (grid[ROWS - 1][c]) { gameOver(); return; }
    }
}

// ── Level config ────────────────────────────────────────────────
const LEVEL_CONFIG = [
    { rows: 4, colors: 6, shotsPerDrop: 6, speed: 10 }, // 1
    { rows: 4, colors: 6, shotsPerDrop: 5, speed: 10 }, // 2
    { rows: 5, colors: 5, shotsPerDrop: 5, speed: 11 }, // 3
    { rows: 5, colors: 5, shotsPerDrop: 4, speed: 11 }, // 4
    { rows: 6, colors: 5, shotsPerDrop: 4, speed: 12 }, // 5
    { rows: 6, colors: 4, shotsPerDrop: 3, speed: 12 }, // 6
    { rows: 7, colors: 4, shotsPerDrop: 3, speed: 12 }, // 7
    { rows: 7, colors: 4, shotsPerDrop: 3, speed: 13 }, // 8
    { rows: 8, colors: 3, shotsPerDrop: 2, speed: 13 }, // 9
    { rows: 8, colors: 3, shotsPerDrop: 2, speed: 14 }  // 10
];

function advanceLevel() {
    window.gameState.currentLevel++;
    const cfg = LEVEL_CONFIG[Math.min(window.gameState.currentLevel - 1, 9)];
    window.gameState.gridRowsInitial = cfg.rows;
    window.gameState.shotsPerDrop = cfg.shotsPerDrop;
    window.gameState.bubbleSpeed = cfg.speed;
    window.gameState.activeColors = COLORS.slice(0, cfg.colors);

    grid = Array(ROWS).fill().map(() => Array(COLS).fill(null));
    for (let r = 0; r < window.gameState.gridRowsInitial; r++) {
        for (let c = 0; c < COLS; c++) {
            if (r % 2 !== 0 && c === COLS - 1) continue;
            grid[r][c] = window.gameState.activeColors[Math.floor(Math.random() * window.gameState.activeColors.length)];
        }
    }

    nextColor = window.gameState.activeColors[Math.floor(Math.random() * window.gameState.activeColors.length)];
    spawnBubble();
    soundManager.playLevelUp();
}

// ── gameOver ────────────────────────────────────────────────────
function gameOver() {
    if (!isGameOver) {
        triggerScreenShake(8);
        soundManager.playGameOver();
    }
    isGameOver = true;
    gameOverEl.style.display = 'block';
    restartBtn.style.display = 'block';
}

// ── draw3DBackground ────────────────────────────────────────────
function draw3DBackground() {
    // Parallax offset based on cannon aim angle
    const angle = Math.atan2(mouseY - canvas.height, mouseX - canvas.width / 2);
    const parallaxX = Math.cos(angle) * 5;
    const parallaxY = Math.sin(angle) * 3;

    // Sky gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.65);
    bgGradient.addColorStop(0, '#0a0a1a');
    bgGradient.addColorStop(0.4, '#1a1a2e');
    bgGradient.addColorStop(0.7, '#16213e');
    bgGradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.65);

    // Stars
    ctx.save();
    for (let i = 0; i < 80; i++) {
        const sx = (i * 137.5) % canvas.width;
        const sy = (i * 73.3) % (canvas.height * 0.6);
        const sr = (i % 3 === 0) ? 1.5 : 0.8;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + (i % 5) * 0.1})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // Horizon glow
    const horizonGlow = ctx.createRadialGradient(
        canvas.width / 2, canvas.height * 0.75, 0,
        canvas.width / 2, canvas.height * 0.75, canvas.width * 0.8
    );
    horizonGlow.addColorStop(0, 'rgba(0, 242, 254, 0.08)');
    horizonGlow.addColorStop(0.5, 'rgba(79, 172, 254, 0.04)');
    horizonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3D Perspective Grid Floor with PARALLAX
    ctx.save();
    ctx.translate(canvas.width / 2 + parallaxX, canvas.height * 0.72 + parallaxY);
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
    ctx.lineWidth = 1;

    // Vanishing point radial lines
    for (let i = -12; i <= 12; i++) {
        const xStart = i * 25;
        const xEnd = i * 180;
        ctx.beginPath();
        ctx.moveTo(xStart, 0);
        ctx.lineTo(xEnd, canvas.height * 0.35);
        ctx.stroke();
    }

    // Horizontal perspective lines with depth-based alpha
    for (let i = 0; i <= 18; i++) {
        const t = i / 18;
        const y = Math.pow(t, 1.6) * canvas.height * 0.35;
        const alpha = 0.05 + t * 0.2;
        ctx.strokeStyle = `rgba(0, 242, 254, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(-canvas.width, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Floor fog band
    const floorGlow = ctx.createLinearGradient(0, canvas.height * 0.28, 0, canvas.height * 0.35);
    floorGlow.addColorStop(0, 'rgba(15, 52, 96, 0)');
    floorGlow.addColorStop(0.5, 'rgba(15, 52, 96, 0.6)');
    floorGlow.addColorStop(1, 'rgba(15, 52, 96, 0)');
    ctx.fillStyle = floorGlow;
    ctx.fillRect(-canvas.width, canvas.height * 0.28, canvas.width * 2, canvas.height * 0.07);

    ctx.restore();

    // Ambient side vignette
    const vignetteGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    vignetteGrad.addColorStop(0.15, 'rgba(0, 0, 0, 0)');
    vignetteGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0)');
    vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ── gameLoop (W3: timestamp + cannon tween + shimmer) ─────────
let lastTime = 0;

function gameLoop(timestamp) {
    const dt = timestamp - lastTime || 16;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Screen shake
    if (screenShake.intensity > 0) {
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity * 2;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity * 2;
        screenShake.intensity *= 0.85;
        if (screenShake.intensity < 0.1) screenShake.intensity = 0;
        ctx.save();
        ctx.translate(screenShake.x, screenShake.y);
    }

    draw3DBackground();
    updateCannonTweens(dt);
    update();
    drawGrid();
    drawCannon();

    particleSystem.update();
    particleSystem.draw(ctx);

    if (currentBubble) {
        const shim = currentBubble.moving
            ? 0.5 + 0.5 * Math.sin(timestamp * 0.012)
            : 0;
        drawBubble(currentBubble.x, currentBubble.y, currentBubble.color, { shimmer: shim });
    }

    if (screenShake.intensity > 0) ctx.restore();

    updateUI();

    if (!isGameOver) requestAnimationFrame(gameLoop);
}

// ── Mouse handlers ──────────────────────────────────────────────
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', () => {
    if (!currentBubble?.moving && !isGameOver) {
        soundManager.playShoot();
        fireCannon();
        const angle = Math.atan2(mouseY - canvas.height, mouseX - canvas.width / 2);
        const speed = window.gameState.bubbleSpeed;
        currentBubble.dx = Math.cos(angle) * speed;
        currentBubble.dy = Math.sin(angle) * speed;
        currentBubble.moving = true;
    }
});

// ── Bootstrap ───────────────────────────────────────────────────
initGame();

// ── UI State ───────────────────────────────────────────────────
window.gameState = window.gameState || {
    currentLevel: 1,
    shotsPerDrop: 6,
    shotsRemaining: 6,
    comboCount: 0,
    nextColor: nextColor,
    score: score,
    isGameOver: isGameOver
};

function updateUI() {
    // Sync known globals into gameState
    window.gameState.score = score;
    window.gameState.isGameOver = isGameOver;
    window.gameState.nextColor = nextColor;

    const gs = window.gameState;
    const levelEl = document.getElementById('level');
    const shotsEl = document.getElementById('shots');
    const comboEl = document.getElementById('combo');
    const comboRow = document.getElementById('combo-row');
    const nextColorEl = document.getElementById('next-color');

    if (levelEl) levelEl.textContent = gs.currentLevel;
    if (shotsEl) shotsEl.textContent = gs.shotsRemaining;
    if (comboEl) comboEl.textContent = gs.comboCount;
    if (comboRow) comboRow.style.display = gs.comboCount > 0 ? '' : 'none';
    if (nextColorEl) nextColorEl.style.backgroundColor = gs.nextColor || '#888888';
}