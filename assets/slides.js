(function () {
  window.initSlides = function (root) {
    var deck = root.querySelector("[data-deck]");
    if (!deck || deck.getAttribute("data-ready") === "1") return;
    deck.setAttribute("data-ready", "1");
    var slides = deck.querySelectorAll(".slide");
    var index = 0;
    document.body.classList.add("is-deck");

    function typesetVisible() {
      var slide = slides[index];
      if (!slide) return;
      if (slide.getAttribute("data-tex") === "1") {
        var laidOut = slide.querySelector("mjx-container");
        if (!laidOut || laidOut.getBoundingClientRect().width > 1) return;
        slide.removeAttribute("data-tex");
      }
      var mj = window.MathJax;
      if (!mj || !mj.typesetPromise) {
        if (typesetVisible.waiting) return;
        typesetVisible.waiting = true;
        var again = function () {
          typesetVisible.waiting = false;
          typesetVisible();
        };
        var script = document.querySelector('script[src*="mathjax"]');
        if (script) script.addEventListener("load", function () {
          var ready = window.MathJax && window.MathJax.startup && window.MathJax.startup.promise;
          if (ready) ready.then(again);
          else again();
        }, { once: true });
        return;
      }
      var ready = mj.startup && mj.startup.promise ? mj.startup.promise : Promise.resolve();
      var target = slide;
      ready.then(function () {
        if (target !== slides[index]) return;
        if (mj.typesetClear) mj.typesetClear([target]);
        return mj.typesetPromise([target]);
      }).then(function () {
        if (target === slides[index]) target.setAttribute("data-tex", "1");
      }).catch(function () {});
    }

    var shown = 0;

    function stepsOf(slide) {
      var groups = [];
      var els = slide.querySelectorAll("[data-step]");
      for (var i = 0; i < els.length; i++) {
        var n = parseInt(els[i].getAttribute("data-step"), 10) || 1;
        (groups[n - 1] = groups[n - 1] || []).push(els[i]);
      }
      return groups.filter(Boolean);
    }

    function paintSteps() {
      var groups = stepsOf(slides[index]);
      for (var g = 0; g < groups.length; g++) {
        for (var k = 0; k < groups[g].length; k++) {
          groups[g][k].classList.toggle("is-shown", g < shown);
          groups[g][k].classList.toggle("is-current", g === shown - 1);
        }
      }
      var last = shown && groups[shown - 1][groups[shown - 1].length - 1];
      if (last) last.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return groups.length;
    }

    function show(next, fromEnd) {
      index = Math.max(0, Math.min(slides.length - 1, next));
      for (var i = 0; i < slides.length; i++) {
        slides[i].classList.toggle("is-on", i === index);
      }
      shown = fromEnd ? stepsOf(slides[index]).length : 0;
      update();
      typesetVisible();
    }

    function update() {
      var total = paintSteps();
      var count = deck.querySelector("[data-count]");
      if (count) {
        count.textContent = index + 1 + " / " + slides.length +
          (total ? " \u00b7 step " + shown + "/" + total : "");
      }
      var prev = deck.querySelector("[data-prev]");
      var nextBtn = deck.querySelector("[data-next]");
      if (prev) prev.disabled = index === 0 && shown === 0;
      if (nextBtn) nextBtn.disabled = index === slides.length - 1 && shown === total;
    }

    function forward() {
      if (shown < stepsOf(slides[index]).length) {
        shown++;
        update();
      } else if (index < slides.length - 1) {
        show(index + 1);
      }
    }

    function backward() {
      if (shown > 0) {
        shown--;
        update();
      } else if (index > 0) {
        show(index - 1, true);
      }
    }

    window.typesetCurrentSlide = typesetVisible;

    deck.addEventListener("click", function (event) {
      var control = event.target.closest("[data-prev], [data-next], a");
      if (control) {
        if (control.hasAttribute("data-prev")) backward();
        if (control.hasAttribute("data-next")) forward();
        return;
      }
      if (event.clientX > window.innerWidth * 0.72) forward();
      else if (event.clientX < window.innerWidth * 0.28) backward();
    });

    document.addEventListener("keydown", function (event) {
      if (!document.body.classList.contains("is-deck")) return;
      var tag = event.target && event.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        forward();
      } else if (event.key === "ArrowLeft" || event.key === "PageUp" || event.key === "Backspace") {
        event.preventDefault();
        backward();
      } else if (event.key === "Home") {
        event.preventDefault();
        show(0);
      } else if (event.key === "End") {
        event.preventDefault();
        show(slides.length - 1, true);
      }
    });

    var start = /^#(\d+)(?:-(\d+))?$/.exec(location.hash || "");
    show(start ? parseInt(start[1], 10) - 1 : 0);
    if (start && start[2]) {
      shown = Math.min(parseInt(start[2], 10), stepsOf(slides[index]).length);
      update();
    }
  };
})();
