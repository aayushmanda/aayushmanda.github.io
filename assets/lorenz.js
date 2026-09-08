(function () {
  var canvas = document.getElementById("lorenz-canvas");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var dpr = Math.max(1, window.devicePixelRatio || 1);
  var points = [];
  var x = 0.01;
  var y = 0;
  var z = 0;
  var sigma = 10;
  var rho = 28;
  var beta = 8 / 3;
  var dt = 0.006;
  var maxPoints = 9000;
  var drawn = 0;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawn = 0;
    ctx.clearRect(0, 0, rect.width, rect.height);
  }

  function generate() {
    for (var i = 0; i < maxPoints; i += 1) {
      var dx = sigma * (y - x);
      var dy = x * (rho - z) - y;
      var dz = x * y - beta * z;
      x += dx * dt;
      y += dy * dt;
      z += dz * dt;
      points.push({ x: x, y: y, z: z });
    }
  }

  function project(point, rect) {
    return {
      x: rect.width * 0.55 + point.x * 8.3,
      y: rect.height * 0.58 - point.z * 4.2 + point.y * 1.4
    };
  }

  function drawStaticBase() {
    var rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = "rgba(72, 96, 122, 0.16)";
    ctx.beginPath();
    for (var i = 100; i < Math.min(points.length, 3600); i += 1) {
      var p = project(points[i], rect);
      if (i === 100) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  function animate() {
    var rect = canvas.getBoundingClientRect();
    if (drawn === 0) drawStaticBase();

    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "rgba(42, 80, 117, 0.44)";
    ctx.beginPath();

    var start = Math.max(100, drawn);
    var end = Math.min(points.length, start + 65);
    for (var i = start; i < end; i += 1) {
      var p = project(points[i], rect);
      if (i === start) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }

    ctx.stroke();
    drawn = end;

    if (drawn < points.length) {
      window.requestAnimationFrame(animate);
    }
  }

  generate();
  resize();
  animate();
  window.addEventListener("resize", function () {
    resize();
    animate();
  });
})();
