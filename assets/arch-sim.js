(function () {
  var letters = ["b", "a", "n", "a", "n", "a"];
  var bits = [0, 1, 0, 1, 0, 1];
  var states = [1, 1, 2, 2, 0, 0, 1];

  function sumThrough(index) {
    var total = 0;
    for (var i = 0; i <= index; i += 1) total += bits[i];
    return total;
  }

  function row(kind, op, detail, value, hot) {
    var mlp = op === "ADD" || op === "COUNT" ? " mlp" : "";
    return (
      '<div class="wire' + mlp + (hot ? " is-hot" : "") + '">' +
      '<span class="wire-kind">' + kind + "</span>" +
      '<span class="wire-op">' + op + "</span>" +
      "<span>" + detail + "</span>" +
      '<strong class="sim-val">' + value + "</strong>" +
      "</div>"
    );
  }

  function mount(el) {
    if (el.getAttribute("data-ready")) return;
    el.setAttribute("data-ready", "1");

    var mode = "process";
    var step = 0;
    var say = el.querySelector("[data-say]");
    var count = el.querySelector("[data-count]");
    var word = el.querySelector("[data-word]");
    var rows = el.querySelector("[data-rows]");
    var tape = el.querySelector("[data-tape]");
    var tapeLabel = el.querySelector("[data-tape-label]");
    var nextBtn = el.querySelector("[data-next]");
    var prevBtn = el.querySelector("[data-prev]");

    function draw() {
      var atColon = step === 6;
      count.textContent = atColon ? "At the colon" : "Letter " + (step + 1) + " of 6";

      var tokens = "";
      for (var i = 0; i < letters.length; i += 1) {
        var classes = "sim-tok";
        if (bits[i]) classes += " is-hit";
        if (step === i) classes += " is-on";
        else if (i < step || atColon) classes += " is-seen";
        tokens +=
          '<button type="button" class="' + classes + '" data-jump="' + i + '">' +
          "<b>" + letters[i] + "</b><span>" + bits[i] + "</span></button>";
      }
      tokens +=
        '<button type="button" class="sim-tok sim-colon' + (atColon ? " is-on" : "") + '" data-jump="6">' +
        "<b>:</b><span>" + (mode === "process" ? "copy" : "sum") + "</span></button>";
      word.innerHTML = tokens;

      if (mode === "process" && !atColon) {
        var prev = states[step];
        var bit = bits[step];
        var next = states[step + 1];
        var raw = prev + bit;
        var math = raw === next
          ? prev + " + " + bit + " = " + next
          : prev + " + " + bit + " wraps to " + next;
        say.textContent = bit
          ? letters[step] + " matches a. Head 1 copies the previous value " + prev + ". Head 2 copies the match bit 1. ADD computes " + math + ", and the model emits " + next + "."
          : letters[step] + " is not a. Head 1 copies the previous value " + prev + ". Head 2 copies the match bit 0. ADD leaves the value at " + next + ", and the model emits it.";
        rows.innerHTML =
          row("Head 1", "MOV", "value → prev", String(prev), true) +
          row("Head 2", "MOV", "match → cur", String(bit), true) +
          row("MLP", "ADD", math, String(next), true);
      } else if (mode === "process") {
        say.textContent = "The running count is 1, 2, 2, 0, 0, 1. Head 3 copies the last value into out. ADD stays off, because the colon is not a letter. The readout emits the answer 1.";
        rows.innerHTML =
          row("Head 3", "MOV", "last value → out", "1", true) +
          row("MLP", "ADD", "off at the colon", "—", false);
      } else if (!atColon) {
        var soFar = sumThrough(step);
        say.textContent = bits[step]
          ? letters[step] + " is a match, so the sum of bits grows to " + soFar + ". The modular counter does not move. Outcome waits until the colon."
          : letters[step] + " is a miss, so the sum of bits stays " + soFar + ". The modular counter does not move. Outcome waits until the colon.";
        rows.innerHTML =
          row("Head 1", "AVG", "sum of match bits so far", String(soFar), true) +
          row("Head 2", "MOV", "start value, not used yet", "1", false) +
          row("MLP", "COUNT", "waits for the colon", "—", false);
      } else {
        say.textContent = "The match bits sum to 3. Head 2 copies the start value 1. COUNT computes 1 + 3 = 4, and 4 modulo 3 is 1. That is the only number the model emits.";
        rows.innerHTML =
          row("Head 1", "AVG", "sum of every match bit", "3", true) +
          row("Head 2", "MOV", "start value", "1", true) +
          row("MLP", "COUNT", "1 + 3 mod 3", "1", true);
      }

      tapeLabel.textContent = mode === "process" ? "Emitted running count" : "Emitted answer";
      if (mode === "process") {
        var shown = atColon ? 6 : step + 1;
        var cells = "";
        for (var t = 0; t < 6; t += 1) {
          var ready = t < shown;
          cells += '<span class="sim-out' + (ready ? " is-on" : "") + '">' + (ready ? states[t + 1] : "·") + "</span>";
        }
        tape.innerHTML = cells;
      } else {
        tape.innerHTML = '<span class="sim-out' + (atColon ? " is-on" : "") + '">' + (atColon ? "1" : "·") + "</span>";
      }

      prevBtn.disabled = step === 0;
      nextBtn.textContent = atColon ? "From the start" : "Next letter";
    }

    el.addEventListener("click", function (event) {
      var modeBtn = event.target.closest("[data-mode]");
      if (modeBtn && el.contains(modeBtn)) {
        mode = modeBtn.getAttribute("data-mode");
        var modes = el.querySelectorAll("[data-mode]");
        for (var i = 0; i < modes.length; i += 1) {
          modes[i].classList.toggle("is-on", modes[i] === modeBtn);
        }
        step = 0;
        draw();
        return;
      }
      var jump = event.target.closest("[data-jump]");
      if (jump && el.contains(jump)) {
        step = Number(jump.getAttribute("data-jump"));
        draw();
        return;
      }
      if (event.target.closest("[data-next]")) {
        step = step >= 6 ? 0 : step + 1;
        draw();
      } else if (event.target.closest("[data-prev]") && step > 0) {
        step -= 1;
        draw();
      }
    });

    draw();
  }

  window.initArchSim = function (root) {
    if (!root) return;
    var sims = root.querySelectorAll("[data-sim]");
    for (var i = 0; i < sims.length; i += 1) mount(sims[i]);
  };
})();
