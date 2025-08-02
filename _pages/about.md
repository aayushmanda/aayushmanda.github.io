---
permalink: /
title: "Hi!"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---



I'm Aayushman, a Master's student in Data Science and Artificial Intelligence. My work focuses on understanding AI through research in LLMs, Attention Mechanism and Diffusion models. I am interested in building innovative solutions and contributing to the future of intelligent systems.

## Conway's Game of Life - Pulsar

<canvas id="gameCanvas" width="340" height="340" style="border:1px solid #ccc;"></canvas>

{% raw %}
<script>
document.addEventListener("DOMContentLoaded", function() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const gridSize = 17, cellSize = 20;
  let grid = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,1,0,0,0,0,1,0,1,0,0,0,0,1,0,0],
    [0,0,1,0,0,0,0,1,0,1,0,0,0,0,1,0,0],
    [0,0,1,0,0,0,0,1,0,1,0,0,0,0,1,0,0],
    [0,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,0],
    [0,0,1,0,0,0,0,1,0,1,0,0,0,0,1,0,0],
    [0,0,1,0,0,0,0,1,0,1,0,0,0,0,1,0,0],
    [0,0,1,0,0,0,0,1,0,1,0,0,0,0,1,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ];

  function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        ctx.fillStyle = grid[y][x] ? '#333' : '#fafafa';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }

  function countNeighbors(y, x) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dy === 0 && dx === 0) continue;
        let ny = y + dy, nx = x + dx;
        if (ny >= 0 && ny < gridSize && nx >= 0 && nx < gridSize)
          count += grid[ny][nx];
      }
    }
    return count;
  }

  function getNextGeneration() {
    const newGrid = Array.from({length: gridSize}, () => Array(gridSize).fill(0));
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const alive = grid[y][x];
        const n = countNeighbors(y, x);
        if (alive && (n === 2 || n === 3)) newGrid[y][x] = 1;
        else if (!alive && n === 3) newGrid[y][x] = 1;
      }
    }
    return newGrid;
  }

  function loop() {
    grid = getNextGeneration();
    drawGrid();
  }

  drawGrid();
  setInterval(loop, 300);
});
</script>

