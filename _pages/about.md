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

<canvas id="gameCanvas" width="340" height="340"></canvas>

<script>
  // JavaScript for Conway's Game of Life Pulsar
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const gridSize = 17;
  const cellSize = 20;
  let grid = initializePulsar();

  function initializePulsar() {
    // Initialize a 17x17 grid with the pulsar pattern
    let grid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
    const pulsar = [
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
    return pulsar;
  }

  function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        ctx.fillStyle = grid[i][j] ? 'black' : 'white';
        ctx.fillRect(j * cellSize, i * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }

  function getNextGeneration() {
    let newGrid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        let neighbors = countNeighbors(i, j);
        if (grid[i][j] === 1 && (neighbors < 2 || neighbors > 3)) {
          newGrid[i][j] = 0; // Cell dies
        } else if (grid[i][j] === 0 && neighbors === 3) {
          newGrid[i][j] = 1; // Cell becomes alive
        } else {
          newGrid[i][j] = grid[i][j]; // Cell stays the same
        }
      }
    }
    return newGrid;
  }

  function countNeighbors(i, j) {
    let count = 0;
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        if (di === 0 && dj === 0) continue;
        let ni = i + di;
        let nj = j + dj;
        if (ni >= 0 && ni < gridSize && nj >= 0 && nj < gridSize) {
          count += grid[ni][nj];
        }
      }
    }
    return count;
  }

  function update() {
    grid = getNextGeneration();
    drawGrid();
  }

  // Draw initial grid
  drawGrid();

  // Animate the pulsar
  setInterval(update, 500); // Update every 500ms
</script>