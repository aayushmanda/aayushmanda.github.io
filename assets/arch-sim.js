(function () {
  var letters = ["b", "a", "n", "a", "n", "a"];
  var bits = [0, 1, 0, 1, 0, 1];
  var states = [1, 1, 2, 2, 0, 0, 1];

  function sumThrough(index) {
    var total = 0;
    for (var i = 0; i <= index; i += 1) total += bits[i];
    return total;
  }

  function mount(el) {
    if (el.getAttribute("data-ready")) return;
    el.setAttribute("data-ready", "1");

    var mode = "process";
    var step = 0;
    var count = el.querySelector("[data-count]");
    var word = el.querySelector("[data-word]");
    var block1 = el.querySelector("[data-b1]");
    var block2Label = el.querySelector("[data-b2-label]");
    var block2 = el.querySelector("[data-b2]");
    var equation = el.querySelector("[data-eq]");
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
        "<b>:</b><span>colon</span></button>";
      word.innerHTML = tokens;

      if (!atColon) {
        var letter = letters[step];
        var bit = bits[step];
        block1.textContent = bit
          ? "The query is a. This letter is " + letter + ", so it matches. Block 1 writes the mark 1 and stops. It does not add anything."
          : "The query is a. This letter is " + letter + ", so it misses. Block 1 writes the mark 0 and stops. It does not add anything.";
      } else {
        block1.textContent = "Block 1 is already finished. The marks on banana are 0, 1, 0, 1, 0, 1. The colon is not a letter, so no new mark is written.";
      }

      if (mode === "process" && !atColon) {
        var prev = states[step];
        var next = states[step + 1];
        var raw = prev + bits[step];
        block2Label.textContent = "Block 2 · running count · add this one mark";
        block2.textContent = "Start from the count already written, " + prev + ", and add the mark from block 1, which is " + bits[step] + ".";
        equation.textContent = raw === next
          ? prev + " + " + bits[step] + " = " + next
          : prev + " + " + bits[step] + " = " + raw + ", and " + raw + " modulo 3 is " + next;
      } else if (mode === "process") {
        block2Label.textContent = "Block 2 · running count · read the last number";
        block2.textContent = "The additions are finished. The numbers written down are 1, 2, 2, 0, 0, 1. The colon copies the last one. That is the answer.";
        equation.textContent = "answer = 1";
      } else if (!atColon) {
        var soFar = sumThrough(step);
        block2Label.textContent = "Block 2 · one sum · still waiting";
        block2.textContent = bits[step]
          ? "This mark is 1, so it joins the pile. The pile is now " + soFar + ". The count itself stays at the start value, 1, until the colon."
          : "This mark is 0, so the pile stays " + soFar + ". The count itself stays at the start value, 1, until the colon.";
        equation.textContent = "pile = " + soFar + ", count still 1";
      } else {
        block2Label.textContent = "Block 2 · one sum at the colon";
        block2.textContent = "Now the marks are added together, and the start value is added after that. Nothing was written down between the letters.";
        equation.textContent = "0 + 1 + 0 + 1 + 0 + 1 = 3, then 1 + 3 = 4, and 4 modulo 3 is 1";
      }

      tapeLabel.textContent = mode === "process" ? "Numbers written down" : "Number written down";
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
