(function () {
  var canvas = document.getElementById("lorenz-canvas");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var dpr = Math.max(1, window.devicePixelRatio || 1);
  var x = 0.01;
  var y = 0;
  var z = 0;
  var sigma = 10;
  var rho = 28;
  var beta = 8 / 3;
  var dt = 0.006;
  var stepsPerFrame = 3;
  var trailMax = 1100;
  var designHeight = 260;
  var bandCount = 6;
  var minAlpha = 0.06;
  var maxAlpha = 0.62;
  var trail = [];

  var accentColor = "#c8500e";
  var isDarkTheme = false;

  function refreshTheme() {
    isDarkTheme = document.documentElement.getAttribute("data-theme")
      ? document.documentElement.getAttribute("data-theme") === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    var value = getComputedStyle(document.documentElement).getPropertyValue("--accent");
    accentColor = value ? value.trim() : isDarkTheme ? "#ff9752" : "#c8500e";
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function step() {
    for (var i = 0; i < stepsPerFrame; i += 1) {
      var dx = sigma * (y - x);
      var dy = x * (rho - z) - y;
      var dz = x * y - beta * z;
      x += dx * dt;
      y += dy * dt;
      z += dz * dt;
      trail.push({ x: x, y: y, z: z });
    }
    if (trail.length > trailMax) {
      trail.splice(0, trail.length - trailMax);
    }
  }

  function project(point, rect) {
    var scale = rect.height / designHeight;
    return {
      x: rect.width * 0.5 + point.x * 8.3 * scale,
      y: rect.height * 0.76 - point.z * 4.2 * scale + point.y * 1.4 * scale
    };
  }

  function draw() {
    var rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    if (trail.length < 2) return;

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = accentColor;

    var bandSize = Math.ceil(trail.length / bandCount);
    for (var b = 0; b < bandCount; b += 1) {
      var start = b * bandSize;
      var end = Math.min(trail.length, start + bandSize + 1);
      if (start >= trail.length - 1) break;

      var t = b / (bandCount - 1);
      ctx.globalAlpha = minAlpha + (maxAlpha - minAlpha) * t;
      ctx.beginPath();
      for (var i = start; i < end; i += 1) {
        var p = project(trail[i], rect);
        if (i === start) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function animate() {
    step();
    draw();
    window.requestAnimationFrame(animate);
  }

  refreshTheme();
  resize();
  animate();
  window.addEventListener("resize", resize);
  window.addEventListener("themechange", refreshTheme);
  try {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", refreshTheme);
  } catch (e) {}
})();
