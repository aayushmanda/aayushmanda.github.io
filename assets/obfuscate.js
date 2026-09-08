(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var links = document.querySelectorAll(".email-link[data-e]");
    for (var i = 0; i < links.length; i += 1) {
      var el = links[i];
      try {
        var email = atob(el.getAttribute("data-e"));
        el.setAttribute("href", "mailto:" + email);
        el.textContent = email;
      } catch (e) {}
    }
  });
})();
