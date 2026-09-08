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
  var stepsPerFrame = 4;
  var trailMax = 2600;
  var headLength = 140;
  var trail = [];

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
    return {
      x: rect.width * 0.55 + point.x * 8.3,
      y: rect.height * 0.58 - point.z * 4.2 + point.y * 1.4
    };
  }

  function draw() {
    var rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    if (trail.length < 2) return;

    var headStart = Math.max(0, trail.length - headLength);

    ctx.lineWidth = 1.1;
    ctx.strokeStyle = "rgba(72, 96, 122, 0.16)";
    ctx.beginPath();
    for (var i = 0; i < headStart; i += 1) {
      var p = project(trail[i], rect);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "rgba(42, 80, 117, 0.5)";
    ctx.beginPath();
    for (var j = headStart; j < trail.length; j += 1) {
      var q = project(trail[j], rect);
      if (j === headStart) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
  }

  function animate() {
    step();
    draw();
    window.requestAnimationFrame(animate);
  }

  resize();
  animate();
  window.addEventListener("resize", resize);
})();
