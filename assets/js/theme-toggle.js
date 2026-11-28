(function () {
  "use strict";

  var STORAGE_KEY = "mii-pokhid-theme";
  var body = document.body;
  if (!body) {
    return;
  }

  var toggle = document.getElementById("theme-toggle");

  function applyTheme(theme, persist) {
    var isDark = theme === "dark";
    body.classList.toggle("dark-theme", isDark);

    if (toggle) {
      toggle.setAttribute("aria-checked", isDark ? "true" : "false");
    }

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
      } catch (e) {
        /* ignore storage errors */
      }
    }
  }

  function getSavedTheme() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      return saved === "dark" ? "dark" : "light";
    } catch (e) {
      return "light";
    }
  }

  // Restore saved choice on load
  applyTheme(getSavedTheme(), false);

  if (!toggle) {
    return;
  }

  toggle.addEventListener("click", function () {
    var next = body.classList.contains("dark-theme") ? "light" : "dark";
    applyTheme(next, true);
  });
})();
