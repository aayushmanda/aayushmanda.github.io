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

<script>
// Wait for the page to load before running the script
document.addEventListener("DOMContentLoaded", function() {

  const canvas = document.getElementById('gameCanvas');
  // Add a safety check in case the canvas isn't found
  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }
  
  const ctx = canvas.getContext('2d');
  const gridSize = 17;
  const cellSize = 20; // 340 / 17 = 20
  
  // The pulsar pattern
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
        // Use a more visible color for live cells
        ctx.fillStyle = grid[y][x] ? '#333' : '#f0f0f0';
        // The -1 creates a nice visual grid line effect
        ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }

  function countNeighbors(y, x) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dy === 0 && dx === 0) continue;
        // Use modulo for seamless wrapping at edges (toroidal array)
        const ny = (y + dy + gridSize) % gridSize;
        const nx = (x + dx + gridSize) % gridSize;
        count += grid[ny][nx];
      }
    }
    return count;
  }

  function getNextGeneration() {
    const newGrid = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const neighbors = countNeighbors(y, x);
        const isAlive = grid[y][x];

        if (isAlive && (neighbors === 2 || neighbors === 3)) {
          newGrid[y][x] = 1; // Survive
        } else if (!isAlive && neighbors === 3) {
          newGrid[y][x] = 1; // Birth
        }
        // All other cells are implicitly 0 (dead)
      }
    }
    return newGrid;
  }

  function update() {
    grid = getNextGeneration();
    drawGrid();
  }

  // Draw the initial state once
  drawGrid();
  // Start the animation loop
  setInterval(update, 200); // 200ms feels a bit smoother

});
</script>
