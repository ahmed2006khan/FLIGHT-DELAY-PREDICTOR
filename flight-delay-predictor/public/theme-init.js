// Runs before the page paints so the saved theme, contrast and text size apply without a flash.
(function () {
  try {
    var root = document.documentElement;
    var theme = localStorage.getItem("fp.theme");
    if (theme !== "light") theme = "dark";   // navy is the default look; light is opt-in via the toggle
    root.setAttribute("data-theme", theme);
    if (localStorage.getItem("fp.contrast") === "high") root.setAttribute("data-contrast", "high");
    var scale = Number(localStorage.getItem("fp.fontScale"));
    if (scale >= 90 && scale <= 140) root.style.fontSize = scale + "%";
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
