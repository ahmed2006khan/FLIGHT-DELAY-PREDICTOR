(function () {
  const esc = FP.esc;
  function ranges(hours) {            // [{hour}] -> "00:00–05:59, 22:00–23:59"
    const out = []; let start = null, prev = null;
    hours.forEach((h) => {
      if (start === null) { start = prev = h; return; }
      if (h === prev + 1) prev = h; else { out.push([start, prev]); start = prev = h; }
    });
    if (start !== null) out.push([start, prev]);
    const p = (n) => String(n).padStart(2, "0");
    return out.map(([a, b]) => p(a) + ":00–" + p(b) + ":59").join(", ");
  }

  document.getElementById("btForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      weather: document.getElementById("weather").value,
      wind: Number(document.getElementById("wind").value),
      previousDelay: Number(document.getElementById("previousDelay").value),
      traffic: document.getElementById("traffic").value,
    };
    try {
      const r = await FP.api("/best-time", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const lowest = r.bestProbability;
      const bestAll = r.hours.filter((h) => h.probability === lowest).map((h) => h.hour);
      const day = r.hours.filter((h) => h.hour >= 6 && h.hour <= 21);
      const dayMin = Math.min(...day.map((h) => h.probability));
      const bestDay = day.filter((h) => h.probability === dayMin).map((h) => h.hour);
      const worst = Math.max(...r.hours.map((h) => h.probability));
      const worstHours = r.hours.filter((h) => h.probability === worst).map((h) => h.hour);

      document.getElementById("btEmpty").hidden = true;
      const s = document.getElementById("btSummary");
      s.hidden = false;
      s.innerHTML =
        '<div class="kv" style="grid-template-columns:1fr">' +
        "<div><small>Lowest delay chance (any hour)</small><strong>" + esc(ranges(bestAll)) + " · " + lowest + "%</strong></div>" +
        "<div><small>Best slot between 06:00 and 21:59</small><strong>" + esc(ranges(bestDay)) + " · " + dayMin + "%</strong></div>" +
        "<div><small>Busiest slot to avoid</small><strong>" + esc(ranges(worstHours)) + " · " + worst + "%</strong></div></div>" +
        '<p class="hint" style="margin-top:12px">Only the time-of-day factor changes between hours. Weather, wind, traffic and inbound delay stay as you entered them.</p>' +
        '<div class="btn-row"><a class="btn btn-primary" href="predict.html">Predict a specific flight</a></div>';

      document.getElementById("btChartCard").hidden = false;
      Charts.columns(document.getElementById("btChart"),
        r.hours.map((h) => ({ label: h.time, value: h.probability })), "Delay chance for each departure hour", "%",
        [Math.max(0, Math.floor((lowest - 10) / 10) * 10), Math.min(100, Math.ceil((worst + 10) / 10) * 10)]);
    } catch (err) { FP.toast("Could not calculate: " + err.message); }
  });
})();
