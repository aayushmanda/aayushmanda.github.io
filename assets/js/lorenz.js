/* lorenz.js - Draws a small Lorenz attractor animation into any
   <canvas class="lorenz-canvas"> on the page.

   Usage: include `_includes/lorenz.html` where you want the widget.
*/
(function () {
  'use strict';

  // Find canvases
  const canvases = Array.from(document.querySelectorAll('.lorenz-canvas'));
  if (!canvases.length) return;

  canvases.forEach(initCanvas);

  function initCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    let dpr = Math.max(1, window.devicePixelRatio || 1);

    function resize() {
      dpr = Math.max(1, window.devicePixelRatio || 1);
      const cssW = canvas.clientWidth || parseInt(getComputedStyle(canvas).width) || 120;
      const cssH = canvas.clientHeight || parseInt(getComputedStyle(canvas).height) || 120;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    // Lorenz parameters (classic chaotic set)
    let x = 0.01, y = 0, z = 0;
    const dt = 0.008;
    const sigma = 10, rho = 28, beta = 8 / 3;
    const pts = [];
    const maxPts = 900;

    function map(v, a, b, A, B) { return (v - a) * (B - A) / (b - a) + A; }

    function step() {
      for (let i = 0; i < 4; i++) {
        const dx = sigma * (y - x);
        const dy = x * (rho - z) - y;
        const dz = x * y - beta * z;
        x += dx * dt; y += dy * dt; z += dz * dt;
        pts.push([x, y, z]);
        if (pts.length > maxPts) pts.shift();
      }
    }

    function draw() {
      step();

      const w = canvas.clientWidth || 120;
      const h = canvas.clientHeight || 120;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 1;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const [px, py, pz] = pts[i];
        const X = map(px, -20, 20, 8, w - 8);
        const Y = map(pz, -5, 50, h - 8, 8);
        if (i === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      }
      const hue = (Date.now() * 0.02) % 360;
      ctx.strokeStyle = `hsl(${hue}, 80%, 55%)`;
      ctx.stroke();

      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  }
})();
