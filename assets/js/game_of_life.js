const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');
const cellSize = 10;
const cols = canvas.width / cellSize;
const rows = canvas.height / cellSize;
let grid = Array(rows).fill().map(() => Array(cols).fill(0));
let playing = false;
let animationId;

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x] === 1) {
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
            ctx.strokeStyle = '#333';
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
        animationId = setTimeout(animate, 100);
    }
}

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    grid[y][x] = 1 - grid[y][x];
    drawGrid();
});

function loadPulsar() {
    clearGrid();
    const centerY = Math.floor(rows / 2);
    const centerX = Math.floor(cols / 2);
    const pulsarOffsets = [
        [4,5],[4,6],[4,7], [5,9], [6,9], [7,9], [9,7],[9,6],[9,5],
        [10,4],[11,4],[12,4], [11,5], [11,6], [11,7], [10,9], [9,9]
    ];
    pulsarOffsets.forEach(([dy, dx]) => {
        const py = (centerY + dy - 7) % rows;
        const px = (centerX + dx - 7) % cols;
        grid[py][px] = 1;
    });
    drawGrid();
}

function togglePlay() {
    playing = !playing;
    if (playing) animate();
    else clearTimeout(animationId);
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
            grid[y][x] = Math.random() < 0.3 ? 1 : 0; // 30% chance cell is alive
        }
    }
    drawGrid();
}

// Init
randomPattern();
