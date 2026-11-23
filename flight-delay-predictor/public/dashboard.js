(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "");
  const RISK_TEXT = { low: "LOW RISK", medium: "MEDIUM RISK", high: "HIGH RISK" };
  const RISK_COLOR = { low: "#22c55e", medium: "#facc15", high: "#ef4444" };

  async function getJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  // Normalise database rows and browser-stored rows to one shape.
  const fromDb = (p) => ({
    airline: p.airline, flight: p.flight, origin: p.origin, destination: p.destination,
    date: p.flight_date, time: p.flight_time, weather: p.weather, traffic: p.traffic,
    delay: Number(p.delay), probability: Number(p.probability),
    risk: p.risk, riskClass: p.risk_class, at: p.created_at,
  });
  const fromLocal = (p) => ({
    airline: p.airline, flight: p.flight, origin: p.origin, destination: p.destination,
    date: p.date, time: p.time, weather: String(p.weather || "").toLowerCase(),
    traffic: String(p.traffic || "").toLowerCase(),
    delay: Number(p.delay), probability: Number(p.probability),
    risk: p.risk, riskClass: p.riskClass, at: p.savedAt,
  });

  function readLocal(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; }
  }

  function computeStats(rows) {
    const n = rows.length;
    const avg = (k) => (n ? Math.round(rows.reduce((a, r) => a + r[k], 0) / n) : 0);
    const count = (c) => rows.filter((r) => r.riskClass === c).length;
    return { total: n, avgDelay: avg("delay"), avgProbability: avg("probability"),
             low: count("low"), medium: count("medium"), high: count("high") };
  }

  function emptyNote(html) { return '<div class="empty-note">' + html + "</div>"; }
  const NEW = '<a href="new-prediction.html">Run a prediction</a>';

  /* ---------- status ---------- */
  function renderStatus(health, source) {
    const dot = $("navDot");
    const chips = [];
    if (health) {
      $("navStatus").textContent = "Prediction System Online";
      chips.push('<span class="chip ok"><i></i>Prediction API online</span>');
    } else {
      $("navStatus").textContent = "Server unreachable";
      dot.style.background = "#ef4444"; dot.style.boxShadow = "0 0 12px #ef4444";
      chips.push('<span class="chip bad"><i></i>Prediction API unreachable</span>');
    }
    chips.push(source === "db"
      ? '<span class="chip ok"><i></i>Database connected: showing all saved predictions</span>'
      : '<span class="chip warn"><i></i>No database: showing predictions made in this browser</span>');
    $("chips").innerHTML = chips.join("");
  }

  /* ---------- KPIs ---------- */
  function renderKpis(s, source) {
    $("kTotal").textContent = s.total;
    $("kTotalSub").textContent = s.total ? (source === "db" ? "saved in the database" : "in this browser") : "none yet";
    $("kDelay").textContent = s.total ? s.avgDelay : "–";
    $("kProb").textContent = s.total ? s.avgProbability + "%" : "–";
    $("kHigh").textContent = s.high;
    $("kHighSub").textContent = s.total ? Math.round((s.high / s.total) * 100) + "% of all predictions" : "none yet";
  }

  /* ---------- donut ---------- */
  function renderRiskMix(s) {
    if (!s.total) { $("riskMix").innerHTML = emptyNote("No predictions yet. " + NEW + " to see your risk mix."); return; }
    const R = 60, C = 2 * Math.PI * R;
    let offset = 0;
    const segs = ["low", "medium", "high"].map((k) => {
      const len = (s[k] / s.total) * C;
      const el = s[k]
        ? `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${RISK_COLOR[k]}" stroke-width="22"
             stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 80 80)"></circle>`
        : "";
      offset += len;
      return el;
    }).join("");
    const pct = (k) => Math.round((s[k] / s.total) * 100);
    $("riskMix").innerHTML = `
      <div class="donut-wrap">
        <svg class="donut" viewBox="0 0 160 160" role="img"
             aria-label="Risk mix: ${s.low} low, ${s.medium} medium, ${s.high} high">
          <circle cx="80" cy="80" r="${R}" fill="none" stroke="#1e293b" stroke-width="22"></circle>
          ${segs}
          <text x="80" y="82" text-anchor="middle" font-size="28" font-weight="800">${s.total}</text>
          <text x="80" y="100" text-anchor="middle" font-size="10" style="fill:#64748b">predictions</text>
        </svg>
        <div class="legend">
          <div><span class="dot low"></span>Low risk<b>${s.low} (${pct("low")}%)</b></div>
          <div><span class="dot medium"></span>Medium risk<b>${s.medium} (${pct("medium")}%)</b></div>
          <div><span class="dot high"></span>High risk<b>${s.high} (${pct("high")}%)</b></div>
        </div>
      </div>`;
  }

  /* ---------- trend ---------- */
  function renderTrend(rows) {
    if (!rows.length) { $("trend").innerHTML = emptyNote("No predictions yet. " + NEW + " to start the trend."); return; }
    const pts = rows.slice(0, 20).reverse(); // oldest -> newest
    $("trendSub").textContent = "Your last " + pts.length + " prediction" + (pts.length > 1 ? "s" : "") + ", oldest to newest.";
    const W = 520, H = 230, L = 34, Rt = 12, T = 12, B = 28;
    const x = (i) => (pts.length === 1 ? (L + W - Rt) / 2 : L + (i * (W - L - Rt)) / (pts.length - 1));
    const y = (v) => T + (1 - v / 100) * (H - T - B);
    const band = (from, to, color) =>
      `<rect x="${L}" y="${y(to)}" width="${W - L - Rt}" height="${y(from) - y(to)}" fill="${color}" opacity=".07"></rect>`;
    const grid = [0, 35, 65, 100].map((v) =>
      `<line x1="${L}" x2="${W - Rt}" y1="${y(v)}" y2="${y(v)}" stroke="#334155" stroke-dasharray="3 4" stroke-width=".8"></line>
       <text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}%</text>`).join("");
    const line = pts.map((p, i) => x(i) + "," + y(p.probability)).join(" ");
    const area = pts.length > 1
      ? `<polygon points="${L},${y(0)} ${line} ${x(pts.length - 1)},${y(0)}" fill="#60a5fa" opacity=".10"></polygon>
         <polyline points="${line}" fill="none" stroke="#60a5fa" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"></polyline>`
      : "";
    const dots = pts.map((p, i) =>
      `<circle cx="${x(i)}" cy="${y(p.probability)}" r="4.5" fill="${RISK_COLOR[p.riskClass] || "#60a5fa"}" stroke="#0b1222" stroke-width="1.5">
         <title>${esc(p.airline)} ${esc(p.flight)}, ${esc(p.origin)} to ${esc(p.destination)}: ${p.probability}% chance, ${p.delay} min</title></circle>`).join("");
    $("trend").innerHTML = `
      <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Delay chance of recent predictions">
        ${band(0, 35, "#22c55e")}${band(35, 65, "#facc15")}${band(65, 100, "#ef4444")}
        ${grid}${area}${dots}
        <text x="${L}" y="${H - 8}">Oldest</text>
        <text x="${W - Rt}" y="${H - 8}" text-anchor="end">Latest</text>
      </svg>`;
  }

  /* ---------- recent table ---------- */
  function renderRecent(rows) {
    if (!rows.length) { $("recent").innerHTML = emptyNote("No predictions yet. " + NEW + " and it will show up here."); return; }
    $("recent").innerHTML = `
      <table class="dash-table">
        <thead><tr><th>Flight</th><th>Route</th><th>Weather</th><th>Delay</th><th>Chance</th><th>Risk</th></tr></thead>
        <tbody>${rows.slice(0, 6).map((p) => `
          <tr>
            <td>${esc(p.airline)} ${esc(p.flight)}</td>
            <td>${esc(p.origin)} → ${esc(p.destination)}</td>
            <td>${esc(cap(p.weather))}</td>
            <td>${esc(p.delay)} min</td>
            <td>${esc(p.probability)}%</td>
            <td><span class="risk-badge ${esc(p.riskClass)}">${esc(p.risk)}</span></td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  }

  /* ---------- latest ---------- */
  function renderLatest(local, rows, source) {
    const p = local ? fromLocal(local) : (rows[0] || null);
    if (!p) { $("latest").innerHTML = emptyNote("You haven't checked a flight yet. " + NEW + "."); return; }
    const when = [p.date, p.time].filter(Boolean).join(" ");
    $("latest").innerHTML = `
      <div class="latest-top">
        <div>
          <div class="latest-route">${esc(p.origin)} → ${esc(p.destination)}</div>
          <div class="latest-meta">${esc(p.airline)} ${esc(p.flight)}${when ? " · " + esc(when) : ""}</div>
        </div>
        <span class="risk-badge ${esc(p.riskClass)}">${esc(p.risk)}</span>
      </div>
      <div class="latest-nums">
        <div class="summary-item"><small>Estimated delay</small><strong>${esc(p.delay)} min</strong></div>
        <div class="summary-item"><small>Delay chance</small><strong>${esc(p.probability)}%</strong></div>
      </div>
      <div class="progress"><div class="progress-bar" style="width:${Math.max(0, Math.min(100, p.probability))}%"></div></div>
      ${local ? '<div class="buttons"><a class="btn-link btn-ghost" style="flex:1" href="report.html">Open full report</a></div>' : ""}`;
  }

  /* ---------- model weights ---------- */
  function renderWeights() {
    const items = [["Weather", 35], ["Airport traffic", 25], ["Previous flight delay", 20], ["Wind speed", 18]];
    $("weights").innerHTML = items.map(([name, pts]) => `
      <div class="weight-row">
        <div class="top"><span>${name}</span><b>up to ${pts} points</b></div>
        <div class="track"><div class="fill" style="width:${(pts / 35) * 100}%"></div></div>
      </div>`).join("");
  }

  /* ---------- patterns ---------- */
  function mode(arr) {
    const m = {};
    arr.forEach((v) => { if (v) m[v] = (m[v] || 0) + 1; });
    const top = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    return top ? { value: top[0], n: top[1] } : null;
  }
  function renderPatterns(rows) {
    if (!rows.length) { $("patterns").innerHTML = emptyNote("Patterns appear after your first prediction."); return; }
    const w = mode(rows.map((r) => r.weather));
    const route = mode(rows.map((r) => r.origin + " → " + r.destination));
    const byAirline = {};
    rows.forEach((r) => { (byAirline[r.airline] = byAirline[r.airline] || []).push(r.delay); });
    const worst = Object.entries(byAirline)
      .map(([a, d]) => [a, Math.round(d.reduce((x, y) => x + y, 0) / d.length), d.length])
      .sort((a, b) => b[1] - a[1])[0];
    const item = (label, value, note) =>
      `<div class="summary-item"><small>${label}</small><strong>${esc(value)}</strong>${note ? `<small style="margin:4px 0 0">${esc(note)}</small>` : ""}</div>`;
    $("patternSub").textContent = "Based on your last " + rows.length + " prediction" + (rows.length > 1 ? "s" : "") + ".";
    $("patterns").innerHTML =
      item("Most common weather", cap(w.value), w.n + " of " + rows.length + " flights") +
      item("Most checked route", route.value, route.n + (route.n === 1 ? " prediction" : " predictions")) +
      item("Longest average delay", worst[0] + ", " + worst[1] + " min", "across " + worst[2] + (worst[2] === 1 ? " flight" : " flights"));
  }

  /* ---------- load ---------- */
  async function init() {
    renderWeights();
    let health = null, rows = [], stats = null, source = "local";
    try { health = await getJSON("/api/health"); } catch (e) { /* server unreachable */ }

    if (health && health.database) {
      try {
        const [h, s] = await Promise.all([getJSON("/api/predictions?limit=50"), getJSON("/api/stats")]);
        rows = h.predictions.map(fromDb);
        stats = s;
        source = "db";
      } catch (e) { /* fall back to browser history */ }
    }
    if (source !== "db") {
      const saved = readLocal("flightPredictionHistory");
      rows = Array.isArray(saved) ? saved.map(fromLocal) : [];
      stats = computeStats(rows);
    }

    renderStatus(health, source);
    renderKpis(stats, source);
    renderRiskMix(stats);
    renderTrend(rows);
    renderRecent(rows);
    renderLatest(readLocal("flightPrediction"), rows, source);
    renderPatterns(rows);
  }
  init();
})();
