const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');
let cellSize = 10; // pixel size (will scale)
let cols = 0;
let rows = 0;
let grid = [];
let playing = false;
let animationId;
let delay = 100; // ms between generations (default)

function getThemeColor(varName, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName) || fallback;
}

function resizeCanvasAndGrid() {
    // Responsive rectangular canvas (width x height) using an aspect ratio
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Desired aspect ratio (width / height). 1.5 => 3:2 rectangle. Adjust if you prefer taller/shorter.
    const aspectRatio = 1.5;

    // Determine CSS pixel width (constrain to container width and a max to avoid huge canvases)
    const maxWidth = Math.min(rect.width, 900);
    const cssWidth = Math.max(200, maxWidth);
    // Compute height from aspect ratio, and ensure it fits within the viewport reasonably
    const maxHeight = Math.max(240, Math.min(Math.round(cssWidth / aspectRatio), window.innerHeight - 160));
    const cssHeight = maxHeight;

    // Set actual canvas pixel dimensions (account for DPR)
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Compute cellSize proportional to width so grid density adapts across devices
    cellSize = Math.max(6, Math.floor(cssWidth / 64));
    cols = Math.floor(cssWidth / cellSize);
    rows = Math.floor(cssHeight / cellSize);

    // Create/resize grid, preserving existing cell states where possible
    const newGrid = Array.from({ length: rows }, (_, y) =>
        Array.from({ length: cols }, (_, x) => (grid[y] && grid[y][x]) ? grid[y][x] : 0)
    );
    grid = newGrid;
}

window.addEventListener('resize', () => {
    resizeCanvasAndGrid();
    drawGrid();
});

// initialize sizes
resizeCanvasAndGrid();

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cellColor = getThemeColor('--global-link-color', '#00ff00').trim() || '#00ff00';
    const gridColor = getThemeColor('--global-border-color', '#333').trim() || '#333';

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x] === 1) {
                ctx.fillStyle = cellColor;
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            } else {
                // clear cell area
                ctx.clearRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }
}

function countNeighbors(y, x) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dy === 0 && dx === 0) continue;
            const ny = (y + dy + rows) % rows;
            const nx = (x + dx + cols) % cols;
            count += grid[ny][nx];
        }
    }
    return count;
}

function nextGeneration() {
    const newGrid = grid.map(row => [...row]);
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const neighbors = countNeighbors(y, x);
            if (grid[y][x] === 1) {
                if (neighbors < 2 || neighbors > 3) newGrid[y][x] = 0;
            } else {
                if (neighbors === 3) newGrid[y][x] = 1;
            }
        }
    }
    grid = newGrid;
}

function animate() {
    if (playing) {
        nextGeneration();
        drawGrid();
        animationId = setTimeout(animate, delay);
    }
}

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    if (y >= 0 && y < rows && x >= 0 && x < cols) {
        grid[y][x] = 1 - grid[y][x];
        drawGrid();
    }
});

// function loadPulsar() {
//     clearGrid();
//     const centerY = Math.floor(rows / 2);
//     const centerX = Math.floor(cols / 2);
//     const pulsarOffsets = [
//         [4,5],[4,6],[4,7], [5,9], [6,9], [7,9], [9,7],[9,6],[9,5],
//         [10,4],[11,4],[12,4], [11,5], [11,6], [11,7], [10,9], [9,9]
//     ];
//     pulsarOffsets.forEach(([dy, dx]) => {
//         const py = (centerY + dy - 7) % rows;
//         const px = (centerX + dx - 7) % cols;
//         grid[py][px] = 1;
//     });
//     drawGrid();
// }

function loadPulsar() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            grid[y][x] = Math.random() < 0.28 ? 1 : 0; // ~28% chance cell is alive
        }
    }
    drawGrid();
}

function togglePlay() {
    playing = !playing;
    if (playing) animate();
    else clearTimeout(animationId);
}

function setSpeed(ms) {
    const v = Number(ms) || 100;
    delay = Math.max(10, Math.min(2000, v));
    const el = document.getElementById('speedValue');
    if (el) el.textContent = delay + ' ms';
}

function step() {
    nextGeneration();
    drawGrid();
}

function clearGrid() {
    grid = Array(rows).fill().map(() => Array(cols).fill(0));
    drawGrid();
}

function randomPattern() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            grid[y][x] = Math.random() < 0.28 ? 1 : 0;
        }
    }
    drawGrid();
}

// Init
randomPattern();

// initialize UI speed display if present
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setSpeed(delay));
} else {
    setSpeed(delay);
}
