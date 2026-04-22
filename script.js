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

function drawBubble(x, y, color) {
    ctx.beginPath();
    ctx.arc(x, y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
    
    // Highlight
    ctx.beginPath();
    ctx.arc(x - 5, y - 5, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    ctx.closePath();
}

function drawCannon() {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height);
    const angle = Math.atan2(mouseY - canvas.height, mouseX - canvas.width / 2);
    ctx.rotate(angle);
    ctx.fillStyle = '#666';
    ctx.fillRect(0, -10, 40, 20);
    ctx.restore();

    // Draw next bubble
    drawBubble(canvas.width / 2 - 40, canvas.height - 20, nextColor);
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.fillText('Next', canvas.width / 2 - 50, canvas.height - 40);
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
        match.forEach(p => grid[p.r][p.c] = null);
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
                grid[r][c] = null;
                dropped++;
            }
        }
    }
    
    if (dropped > 0) {
        score += dropped * 20;
        scoreEl.innerText = score;
    }
}

function gameOver() {
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
        const angle = Math.atan2(mouseY - canvas.height, mouseX - canvas.width / 2);
        const speed = 10;
        currentBubble.dx = Math.cos(angle) * speed;
        currentBubble.dy = Math.sin(angle) * speed;
        currentBubble.moving = true;
    }
});

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    update();
    drawGrid();
    drawCannon();
    if (currentBubble) {
        drawBubble(currentBubble.x, currentBubble.y, currentBubble.color);
    }
    if (!isGameOver) requestAnimationFrame(gameLoop);
}

initGame();
