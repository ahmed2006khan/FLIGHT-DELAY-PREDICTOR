// Shared page frame: sidebar, top bar (theme, contrast, text size), status pill, and small helpers.
(function () {
  const NAV = [
    { title: "Overview", items: [
      { key: "dashboard", href: "index.html", label: "Dashboard", icon: "M4 13h6V4H4zM14 20h6V4h-6zM4 20h6v-3H4z" },
    ]},
    { title: "Tools", items: [
      { key: "predict", href: "predict.html", label: "Predict a flight", icon: "M3 11 21 3l-6 18-3-7z" },
      { key: "compare", href: "compare.html", label: "Compare flights", icon: "M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4" },
      { key: "best-time", href: "best-time.html", label: "Best time to fly", icon: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" },
    ]},
    { title: "Learn", items: [
      { key: "weather", href: "weather.html", label: "Weather impact", icon: "M7 18a4 4 0 1 1 .9-7.9A5.5 5.5 0 0 1 18.5 11 3.5 3.5 0 0 1 18 18z" },
      { key: "risk", href: "risk.html", label: "Risk levels", icon: "M12 3 2 20h20zM12 10v4M12 17h.01" },
      { key: "model", href: "model.html", label: "How it works", icon: "M12 17h.01M9.1 9a3 3 0 1 1 4.5 2.6c-.9.5-1.6 1.1-1.6 2.1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" },
    ]},
    { title: "Records", items: [
      { key: "history", href: "history.html", label: "History", icon: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2" },
    ]},
  ];

  const MARK = '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><linearGradient id="fpg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#38bdf8"/><stop offset=".55" stop-color="#3b6cff"/><stop offset="1" stop-color="#2dd4bf"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="#0a1330"/><circle cx="32" cy="32" r="22" fill="none" stroke="#1c2a55" stroke-width="4"/><circle cx="32" cy="32" r="22" fill="none" stroke="url(#fpg)" stroke-width="4" stroke-linecap="round" stroke-dasharray="104 138" transform="rotate(130 32 32)"/><path d="M19 33.5 45 21.5 37.5 44.5 31.5 36.5Z" fill="url(#fpg)"/><path d="M31.5 36.5 45 21.5" stroke="#0a1330" stroke-width="2" stroke-linecap="round"/></svg>';
  const ico = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function store(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage may be blocked */ } }

  let toastTimer;
  function toast(message) {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast"; t.className = "toast no-print"; t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = message; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  }

  async function api(path, options) {
    const res = await fetch("/api" + path, options);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Request failed (" + res.status + ")");
    return body;
  }

  window.FP = { esc, store, save, toast, api };

  function build() {
    const main = document.getElementById("main");
    if (!main) return;
    const current = document.body.dataset.page;

    const skip = document.createElement("a");
    skip.className = "skip-link"; skip.href = "#main"; skip.textContent = "Skip to main content";

    const nav = NAV.map((g) =>
      '<div class="nav-group"><div class="nav-group-title" id="ng-' + g.title + '">' + g.title + '</div>' +
      '<div role="group" aria-labelledby="ng-' + g.title + '">' +
      g.items.map((i) =>
        '<a class="nav-link" href="' + i.href + '"' + (i.key === current ? ' aria-current="page"' : "") + ">" + ico(i.icon) + "<span>" + i.label + "</span></a>"
      ).join("") + "</div></div>"
    ).join("");

    const sidebar = document.createElement("aside");
    sidebar.className = "sidebar"; sidebar.id = "sidebar";
    sidebar.innerHTML =
      '<a class="brand" href="index.html" aria-label="FlightPredict home">' + MARK +
      '<span><span class="brand-name">Flight<b>Predict</b></span><span class="brand-slogan">Know before you go.</span></span></a>' +
      '<nav aria-label="Main">' + nav + "</nav>" +
      '<div class="sidebar-foot">BCA Data Science project</div>';

    const scrim = document.createElement("div");
    scrim.className = "scrim"; scrim.setAttribute("aria-hidden", "true");

    const top = document.createElement("header");
    top.className = "topbar no-print";
    top.innerHTML =
      '<button class="icon-btn menu-btn" id="menuBtn" type="button" aria-label="Open menu" aria-controls="sidebar" aria-expanded="false">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>' +
      '<a class="topbar-brand" href="index.html">' + MARK + "<span>FlightPredict</span></a>" +
      '<div class="topbar-spacer"></div>' +
      '<div class="status-pill" id="statusPill" data-state="" role="status"><span class="status-dot"></span><span class="status-text">Checking system…</span></div>' +
      '<div class="tools" role="group" aria-label="Display settings">' +
      '<div class="size-group" role="group" aria-label="Text size">' +
      '<button class="icon-btn" id="fontDown" type="button" aria-label="Decrease text size">A−</button>' +
      '<button class="icon-btn" id="fontUp" type="button" aria-label="Increase text size">A+</button></div>' +
      '<button class="icon-btn" id="contrastBtn" type="button" aria-pressed="false" aria-label="High contrast">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg></button>' +
      '<button class="icon-btn" id="themeBtn" type="button" aria-label="Switch theme"></button></div>';

    const foot = document.createElement("footer");
    foot.className = "site-foot";
    foot.textContent = "FlightPredict · Know before you go. · Estimates come from a scoring model, not official airline data.";

    const content = document.createElement("div");
    content.className = "content";
    main.parentNode.insertBefore(content, main);
    content.append(top, main, foot);
    document.body.prepend(skip, sidebar, scrim);

    wireControls();
    wireMenu(scrim);
    checkHealth();
  }

  function wireControls() {
    const root = document.documentElement;
    const themeBtn = document.getElementById("themeBtn");
    const contrastBtn = document.getElementById("contrastBtn");
    const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>';

    function paintTheme() {
      const dark = root.getAttribute("data-theme") !== "light";
      themeBtn.innerHTML = dark ? SUN : MOON;
      themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
      document.dispatchEvent(new CustomEvent("fp:theme"));
    }
    themeBtn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("fp.theme", next); } catch (e) { /* ignore */ }
      paintTheme();
    });
    paintTheme();

    const high = root.getAttribute("data-contrast") === "high";
    contrastBtn.setAttribute("aria-pressed", String(high));
    contrastBtn.addEventListener("click", () => {
      const on = contrastBtn.getAttribute("aria-pressed") !== "true";
      contrastBtn.setAttribute("aria-pressed", String(on));
      if (on) root.setAttribute("data-contrast", "high"); else root.removeAttribute("data-contrast");
      try { localStorage.setItem("fp.contrast", on ? "high" : "normal"); } catch (e) { /* ignore */ }
      toast(on ? "High contrast on" : "High contrast off");
    });

    function setScale(delta) {
      const current = parseInt(root.style.fontSize, 10) || 100;
      const next = Math.min(135, Math.max(90, current + delta));
      root.style.fontSize = next + "%";
      try { localStorage.setItem("fp.fontScale", String(next)); } catch (e) { /* ignore */ }
      toast("Text size " + next + "%");
    }
    document.getElementById("fontDown").addEventListener("click", () => setScale(-10));
    document.getElementById("fontUp").addEventListener("click", () => setScale(10));
  }

  function wireMenu(scrim) {
    const btn = document.getElementById("menuBtn");
    const sidebar = document.getElementById("sidebar");
    function set(open) {
      document.body.classList.toggle("nav-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (open) { const first = sidebar.querySelector("a"); if (first) first.focus(); } else if (document.activeElement && sidebar.contains(document.activeElement)) btn.focus();
    }
    btn.addEventListener("click", () => set(!document.body.classList.contains("nav-open")));
    scrim.addEventListener("click", () => set(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("nav-open")) set(false); });
  }

  async function checkHealth() {
    const pill = document.getElementById("statusPill");
    const text = pill.querySelector(".status-text");
    try {
      const h = await api("/health");
      if (h.database) { pill.dataset.state = "ok"; text.textContent = "Online · database connected"; }
      else { pill.dataset.state = "warn"; text.textContent = "Online · temporary storage"; }
    } catch (e) {
      pill.dataset.state = "down"; text.textContent = "Server unreachable";
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
