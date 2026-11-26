// Small dependency-free charts. Each draws into an element and adds a text summary for screen readers.
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const cls = (p) => (p >= 65 ? "high" : p >= 35 ? "medium" : "low");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function srTable(caption, headers, rows) {
    return '<table class="sr-only"><caption>' + esc(caption) + "</caption><thead><tr>" +
      headers.map((h) => "<th>" + esc(h) + "</th>").join("") + "</tr></thead><tbody>" +
      rows.map((r) => "<tr>" + r.map((c) => "<td>" + esc(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table>";
  }

  // Area/line chart of values 0-100 (probability).
  function line(el, points, label) {
    if (!points.length) { el.innerHTML = '<p class="note">Not enough data yet.</p>'; return; }
    const W = 640, H = 250, L = 38, R = 14, T = 14, B = 34;
    const x = (i) => (points.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (points.length - 1));
    const y = (v) => T + (1 - v / 100) * (H - T - B);
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(label) + '"><defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".38"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>';
    [0, 35, 65, 100].forEach((v) => {
      s += '<line class="grid-line" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="axis" x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + "%</text>";
    });
    const path = points.map((p, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.value).toFixed(1)).join(" ");
    s += '<path class="area" d="' + path + " L" + x(points.length - 1).toFixed(1) + " " + y(0) + " L" + x(0).toFixed(1) + " " + y(0) + 'Z"/><path class="line" d="' + path + '"/>';
    points.forEach((p, i) => {
      s += '<circle class="pt ' + cls(p.value) + '" cx="' + x(i).toFixed(1) + '" cy="' + y(p.value).toFixed(1) + '" r="5"><title>' + esc(p.label + ": " + p.value + "%") + "</title></circle>";
      if (points.length <= 8 || i % 2 === 0) s += '<text class="axis" x="' + x(i).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(p.label) + "</text>";
    });
    s += "</svg>" + srTable(label, ["Date", "Average delay probability %"], points.map((p) => [p.label, p.value]));
    el.className = "chart"; el.innerHTML = s;
  }

  // 24-column chart. items: [{label, value|null}]
  function columns(el, items, label, unit, domain) {
    const lo = domain ? domain[0] : 0, hi = domain ? domain[1] : 100;
    const W = 640, H = 230, L = 34, R = 6, T = 12, B = 30;
    const slot = (W - L - R) / items.length, bw = slot * 0.66;
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(label) + '">';
    [lo, Math.round((lo + hi) / 2), hi].forEach((v) => {
      s += '<line class="grid-line" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="axis" x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + "%</text>";
    });
    items.forEach((it, i) => {
      const cx = L + i * slot + (slot - bw) / 2;
      if (it.value == null) {
        s += '<rect class="col none" x="' + cx.toFixed(1) + '" y="' + (y(lo) - 3) + '" width="' + bw.toFixed(1) + '" height="3" rx="1.5"><title>' + esc(it.label + ": no data") + "</title></rect>";
      } else {
        const h = Math.max(3, y(lo) - y(it.value));
        s += '<rect class="col ' + cls(it.value) + '" x="' + cx.toFixed(1) + '" y="' + (y(lo) - h).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3"><title>' + esc(it.label + ": " + it.value + (unit || "%")) + "</title></rect>";
      }
      if (i % 3 === 0) s += '<text class="axis" x="' + (cx + bw / 2).toFixed(1) + '" y="' + (H - 9) + '" text-anchor="middle">' + esc(it.label.slice(0, 2)) + "</text>";
    });
    s += "</svg>" + srTable(label, ["Hour", "Delay probability %"], items.map((it) => [it.label, it.value == null ? "no data" : it.value]));
    el.className = "chart"; el.innerHTML = s;
  }

  // Donut of risk counts: {low, medium, high}
  function donut(el, counts, label) {
    const total = counts.low + counts.medium + counts.high;
    const R = 62, C = 2 * Math.PI * R;
    let s = '<svg viewBox="0 0 180 180" role="img" aria-label="' + esc(label) + '" style="max-width:210px;margin:auto"><circle class="donut-track" cx="90" cy="90" r="' + R + '" fill="none" stroke-width="20"/>';
    let offset = 0;
    ["low", "medium", "high"].forEach((k) => {
      if (!counts[k]) return;
      const len = (counts[k] / total) * C;
      s += '<circle class="donut-seg ' + k + '" cx="90" cy="90" r="' + R + '" fill="none" stroke-width="20" stroke-dasharray="' + len.toFixed(2) + " " + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 90 90)"><title>' + esc(k + ": " + counts[k]) + "</title></circle>";
      offset += len;
    });
    s += '<text class="donut-num" x="90" y="92" text-anchor="middle" font-size="28">' + total + '</text><text class="donut-sub" x="90" y="110" text-anchor="middle">predictions</text></svg>';
    s += '<div class="legend"><span><i class="low"></i>Low ' + counts.low + '</span><span><i class="medium"></i>Medium ' + counts.medium + '</span><span><i class="high"></i>High ' + counts.high + "</span></div>";
    el.className = "chart"; el.innerHTML = s;
  }

  // Horizontal bars as a list. items: [{label, value (0-100 width), text, tone?}]
  function hbars(el, items, label) {
    if (!items.length) { el.innerHTML = '<p class="note">No data yet.</p>'; return; }
    el.innerHTML = '<ul class="hbars" aria-label="' + esc(label) + '">' + items.map((it) =>
      '<li><div class="row"><span>' + esc(it.label) + "</span><strong>" + esc(it.text) + '</strong></div><div class="bar"><span class="' + (it.tone || "") + '" style="width:' + Math.max(2, Math.min(100, it.value)) + '%"></span></div></li>'
    ).join("") + "</ul>";
  }

  // Semicircle-ish ring gauge. Returns markup; call update() afterwards to animate.
  function gaugeSVG(id) {
    const R = 54, C = 2 * Math.PI * R;
    return '<svg class="gauge" id="' + id + '" viewBox="0 0 140 140" role="img" aria-label="Delay probability" data-risk="low">' +
      '<circle class="track" cx="70" cy="70" r="' + R + '" fill="none" stroke-width="12"/>' +
      '<circle class="fill" cx="70" cy="70" r="' + R + '" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + C.toFixed(2) + '" transform="rotate(-90 70 70)"/>' +
      '<text class="num" x="70" y="76" text-anchor="middle" font-size="32" font-weight="700">0%</text>' +
      '<text class="sub" x="70" y="96" text-anchor="middle" font-size="10">delay chance</text></svg>';
  }
  function gaugeSet(svg, probability, riskClass) {
    const C = 2 * Math.PI * 54;
    svg.dataset.risk = riskClass;
    svg.querySelector(".fill").style.strokeDashoffset = (C * (1 - probability / 100)).toFixed(2);
    svg.querySelector(".num").textContent = probability + "%";
    svg.setAttribute("aria-label", "Delay probability " + probability + " percent, " + riskClass + " risk");
  }

  window.Charts = { line, columns, donut, hbars, gaugeSVG, gaugeSet, cls };
})();
