(function () {
  window.initSlides = function (root) {
    var deck = root.querySelector("[data-deck]");
    if (!deck || deck.getAttribute("data-ready") === "1") return;
    deck.setAttribute("data-ready", "1");
    var slides = deck.querySelectorAll(".slide");
    var index = 0;
    document.body.classList.add("is-deck");

    function show(next) {
      index = Math.max(0, Math.min(slides.length - 1, next));
      for (var i = 0; i < slides.length; i++) {
        slides[i].classList.toggle("is-on", i === index);
      }
      var count = deck.querySelector("[data-count]");
      if (count) count.textContent = index + 1 + " / " + slides.length;
      var prev = deck.querySelector("[data-prev]");
      var nextBtn = deck.querySelector("[data-next]");
      if (prev) prev.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === slides.length - 1;
    }

    deck.addEventListener("click", function (event) {
      var control = event.target.closest("[data-prev], [data-next], a");
      if (control) {
        if (control.hasAttribute("data-prev")) show(index - 1);
        if (control.hasAttribute("data-next")) show(index + 1);
        return;
      }
      if (event.clientX > window.innerWidth * 0.72) show(index + 1);
      else if (event.clientX < window.innerWidth * 0.28) show(index - 1);
    });

    document.addEventListener("keydown", function (event) {
      if (!document.body.classList.contains("is-deck")) return;
      var tag = event.target && event.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        show(index + 1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp" || event.key === "Backspace") {
        event.preventDefault();
        show(index - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        show(0);
      } else if (event.key === "End") {
        event.preventDefault();
        show(slides.length - 1);
      }
    });

    show(0);
  };
})();
