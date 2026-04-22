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

let grid = [];
let currentBubble = null;
let nextColor = '';
let score = 0;
let isGameOver = false;
let mouseX = canvas.width / 2;
let mouseY = 0;

function initGame() {
    grid = Array(ROWS).fill().map(() => Array(COLS).fill(null));
    score = 0;
    isGameOver = false;
    scoreEl.innerText = score;
    gameOverEl.style.display = 'none';
    restartBtn.style.display = 'none';
    particleSystem.particles = [];

    // Fill top 4 rows
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < COLS; c++) {
            if (r % 2 !== 0 && c === COLS - 1) continue;
            grid[r][c] = COLORS[Math.floor(Math.random() * COLORS.length)];
        }
    }
    
    nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    spawnBubble();
    requestAnimationFrame(gameLoop);
}

function spawnBubble() {
    currentBubble = {
        x: canvas.width / 2,
        y: canvas.height - BUBBLE_RADIUS,
        color: nextColor,
        dx: 0,
        dy: 0,
        moving: false
    };
    nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
}

function getGridPos(r, c) {
    const x = (c * BUBBLE_SIZE) + BUBBLE_RADIUS + (r % 2 !== 0 ? BUBBLE_RADIUS : 0);
    const y = (r * BUBBLE_SIZE * 0.85) + BUBBLE_RADIUS;
    return { x, y };
}

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

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function lightenColor(hex, percent) {
    let rgb = hexToRgb(hex);
    if(!rgb) return hex;
    let r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * (percent / 100)));
    let g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * (percent / 100)));
    let b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * (percent / 100)));
    return `rgb(${r}, ${g}, ${b})`;
}

function darkenColor(hex, percent) {
    let rgb = hexToRgb(hex);
    if(!rgb) return hex;
    let r = Math.max(0, Math.floor(rgb.r * (1 - percent / 100)));
    let g = Math.max(0, Math.floor(rgb.g * (1 - percent / 100)));
    let b = Math.max(0, Math.floor(rgb.b * (1 - percent / 100)));
    return `rgb(${r}, ${g}, ${b})`;
}

function drawBubble(x, y, color) {
    ctx.save();
    
    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    
    ctx.beginPath();
    ctx.arc(x, y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
    
    // 3D Radial Gradient
    const gradient = ctx.createRadialGradient(x - BUBBLE_RADIUS/3, y - BUBBLE_RADIUS/3, BUBBLE_RADIUS/10, x, y, BUBBLE_RADIUS);
    gradient.addColorStop(0, lightenColor(color, 60));
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(1, darkenColor(color, 50));
    
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.closePath();
    ctx.restore();
    
    // Glossy curved reflection
    ctx.beginPath();
    ctx.ellipse(x - BUBBLE_RADIUS/3, y - BUBBLE_RADIUS/3, BUBBLE_RADIUS/2.5, BUBBLE_RADIUS/5, Math.PI / 4, 0, Math.PI * 2);
    const gloss = ctx.createLinearGradient(x - BUBBLE_RADIUS/2, y - BUBBLE_RADIUS/2, x, y);
    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gloss;
    ctx.fill();
    ctx.closePath();
}

function drawDragon(x, y, color, facingRight) {
    ctx.save();
    
    // Drop Shadow on Floor
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.ellipse(x, y + 22, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.translate(x, y);
    if (!facingRight) {
        ctx.scale(-1, 1);
    }
    
    // Gradients
    const darkColor = darkenColor(color, 40);
    const lightColor = lightenColor(color, 40);
    
    const bodyGrad = ctx.createRadialGradient(-3, 5, 2, 0, 10, 15);
    bodyGrad.addColorStop(0, lightColor);
    bodyGrad.addColorStop(0.5, color);
    bodyGrad.addColorStop(1, darkColor);
    
    const headGrad = ctx.createRadialGradient(2, -8, 2, 5, -5, 12);
    headGrad.addColorStop(0, lightColor);
    headGrad.addColorStop(0.6, color);
    headGrad.addColorStop(1, darkColor);

    // Tail
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.moveTo(-10, 10);
    ctx.lineTo(-25, 15);
    ctx.lineTo(-10, 20);
    ctx.fill();
    
    // Body
    ctx.beginPath();
    ctx.ellipse(0, 10, 15, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    
    // Belly
    const bellyGrad = ctx.createRadialGradient(3, 10, 2, 5, 12, 10);
    bellyGrad.addColorStop(0, '#FFF5CC');
    bellyGrad.addColorStop(1, '#FFCC00');
    ctx.fillStyle = bellyGrad;
    ctx.beginPath();
    ctx.ellipse(5, 12, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Head
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(5, -5, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Snout
    ctx.beginPath();
    ctx.ellipse(12, -2, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Snout highlight
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(15, -4, 3, 1.5, Math.PI/6, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(8, -8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(10, -8, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye highlight
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(10.5, -9, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Spikes
    const spikeGrad = ctx.createLinearGradient(-20, -20, 0, 10);
    spikeGrad.addColorStop(0, '#FF6666');
    spikeGrad.addColorStop(1, '#990000');
    ctx.fillStyle = spikeGrad;
    ctx.beginPath();
    ctx.moveTo(-5, -12); ctx.lineTo(-10, -20); ctx.lineTo(-12, -10);
    ctx.moveTo(-10, -5); ctx.lineTo(-18, -10); ctx.lineTo(-15, 0);
    ctx.moveTo(-12, 5);  ctx.lineTo(-22, 5);   ctx.lineTo(-14, 12);
    ctx.fill();
    
    // Arm
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.ellipse(8, 8, 6, 3, Math.PI/4, 0, Math.PI * 2);
    ctx.fill();
    
    // Leg
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.ellipse(0, 20, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawCannon() {
    // Draw dragons
    // Bub (Green) on the right of the cannon
    drawDragon(canvas.width / 2 + 35, canvas.height - 25, '#00CC00', false);
    // Bob (Blue) on the left holding the next bubble
    drawDragon(canvas.width / 2 - 60, canvas.height - 25, '#0066FF', true);

    // Draw cannon
    ctx.save();
    
    // Cannon Base Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, canvas.height - 5, 25, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(canvas.width / 2, canvas.height);
    const angle = Math.atan2(mouseY - canvas.height, mouseX - canvas.width / 2);
    
    // Trajectory line
    if (!currentBubble.moving && !isGameOver) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * canvas.height * 1.5, Math.sin(angle) * canvas.height * 1.5);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    ctx.rotate(angle);
    
    // Cannon barrel (Cylinder 3D)
    const barrelGrad = ctx.createLinearGradient(0, -10, 0, 10);
    barrelGrad.addColorStop(0, '#888');
    barrelGrad.addColorStop(0.2, '#ccc');
    barrelGrad.addColorStop(0.5, '#555');
    barrelGrad.addColorStop(1, '#222');
    
    ctx.fillStyle = barrelGrad;
    ctx.fillRect(0, -10, 40, 20);
    
    // Muzzle highlight
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(38, -10, 2, 20);
    
    ctx.restore();
    
    // Cannon Base (Hemisphere 3D)
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height);
    const baseGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 20);
    baseGrad.addColorStop(0, '#666');
    baseGrad.addColorStop(1, '#111');
    
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 20, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw next bubble
    drawBubble(canvas.width / 2 - 40, canvas.height - 20, nextColor);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px "Nunito"';
    ctx.fillText('Next', canvas.width / 2 - 65, canvas.height - 40);
}

function update() {
    if (!currentBubble.moving || isGameOver) return;

    currentBubble.x += currentBubble.dx;
    currentBubble.y += currentBubble.dy;

    // Wall bounce
    if (currentBubble.x <= BUBBLE_RADIUS || currentBubble.x >= canvas.width - BUBBLE_RADIUS) {
        currentBubble.dx *= -1;
        currentBubble.x = Math.max(BUBBLE_RADIUS, Math.min(canvas.width - BUBBLE_RADIUS, currentBubble.x));
    }

    // Collision check
    let collided = false;
    if (currentBubble.y <= BUBBLE_RADIUS) collided = true; // Ceiling
    
    if (!collided) {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c]) {
                    const pos = getGridPos(r, c);
                    const dist = Math.hypot(currentBubble.x - pos.x, currentBubble.y - pos.y);
                    if (dist < BUBBLE_SIZE - 2) {
                        collided = true;
                        break;
                    }
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

function snapToGrid() {
    let bestR = 0, bestC = 0;
    let minDist = Infinity;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (r % 2 !== 0 && c === COLS - 1) continue;
            if (!grid[r][c]) {
                const pos = getGridPos(r, c);
                const dist = Math.hypot(currentBubble.x - pos.x, currentBubble.y - pos.y);
                if (dist < minDist) {
                    minDist = dist;
                    bestR = r;
                    bestC = c;
                }
            }
        }
    }

    grid[bestR][bestC] = currentBubble.color;
    
    if (bestR >= ROWS - 2) {
        gameOver();
        return;
    }

    checkMatches(bestR, bestC);
    dropFloating();
    spawnBubble();
}

function getNeighbors(r, c) {
    const neighbors = [];
    const dirs = r % 2 === 0 ? 
        [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]] :
        [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];
    
    for (let [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            if (nr % 2 !== 0 && nc === COLS - 1) continue;
            neighbors.push({ r: nr, c: nc });
        }
    }
    return neighbors;
}

function checkMatches(r, c) {
    const color = grid[r][c];
    const match = [];
    const visited = new Set();
    const queue = [{ r, c }];

    while (queue.length > 0) {
        const curr = queue.shift();
        const key = `${curr.r},${curr.c}`;
        if (visited.has(key)) continue;
        visited.add(key);

        if (grid[curr.r][curr.c] === color) {
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
    }
}

function dropFloating() {
    const visited = new Set();
    const queue = [];

    // Start from top row
    for (let c = 0; c < COLS; c++) {
        if (grid[0][c]) queue.push({ r: 0, c });
    }

    while (queue.length > 0) {
        const curr = queue.shift();
        const key = `${curr.r},${curr.c}`;
        if (visited.has(key)) continue;
        visited.add(key);

        if (grid[curr.r][curr.c]) {
            for (let n of getNeighbors(curr.r, curr.c)) queue.push(n);
        }
    }

    // Remove unvisited
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

function gameOver() {
    if (!isGameOver) soundManager.playGameOver();
    isGameOver = true;
    gameOverEl.style.display = 'block';
    restartBtn.style.display = 'block';
}

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', () => {
    if (!currentBubble.moving && !isGameOver) {
        soundManager.playShoot();
        const angle = Math.atan2(mouseY - canvas.height, mouseX - canvas.width / 2);
        const speed = 10;
        currentBubble.dx = Math.cos(angle) * speed;
        currentBubble.dy = Math.sin(angle) * speed;
        currentBubble.moving = true;
    }
});

function draw3DBackground() {
    // Cielo / Sfondo lontano
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#0a0a1a');
    bgGradient.addColorStop(0.5, '#1a1a2e');
    bgGradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pavimento 3D (Grid)
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + 50);
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.2)';
    ctx.lineWidth = 1;
    
    // Punto di fuga (Vanishing point)
    for (let i = -10; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 30, 0);
        ctx.lineTo(i * 150, canvas.height);
        ctx.stroke();
    }
    
    // Linee orizzontali in prospettiva
    for (let i = 1; i <= 15; i++) {
        ctx.beginPath();
        let y = Math.pow(i, 1.8);
        ctx.moveTo(-canvas.width, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Nebbia/Glow sul fondo
    const floorGlow = ctx.createLinearGradient(0, 0, 0, 50);
    floorGlow.addColorStop(0, 'rgba(15, 52, 96, 1)');
    floorGlow.addColorStop(1, 'rgba(15, 52, 96, 0)');
    ctx.fillStyle = floorGlow;
    ctx.fillRect(-canvas.width, 0, canvas.width*2, 50);
    
    ctx.restore();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw3DBackground();
    update();
    drawGrid();
    drawCannon();
    
    particleSystem.update();
    particleSystem.draw(ctx);
    
    if (currentBubble) {
        drawBubble(currentBubble.x, currentBubble.y, currentBubble.color);
    }
    if (!isGameOver) requestAnimationFrame(gameLoop);
}

initGame();