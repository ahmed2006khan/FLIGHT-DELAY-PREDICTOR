(function () {
  const esc = FP.esc;
  let all = [];
  const rowsEl = document.getElementById("rows"), note = document.getElementById("note");

  function view() {
    const q = document.getElementById("q").value.trim().toLowerCase();
    const risk = document.getElementById("fRisk").value, weather = document.getElementById("fWeather").value;
    return all.filter((p) =>
      (!risk || p.risk_class === risk) && (!weather || p.weather === weather) &&
      (!q || [p.airline, p.flight, p.origin, p.destination].join(" ").toLowerCase().includes(q)));
  }
  function draw() {
    const list = view();
    document.getElementById("count").textContent = "Showing " + Math.min(list.length, 200) + " of " + list.length + " matching predictions (" + all.length + " saved)";
    rowsEl.innerHTML = list.slice(0, 200).map((p) =>
      "<tr><td>" + esc(p.airline) + " " + esc(p.flight) + "</td><td>" + esc(p.origin) + " → " + esc(p.destination) + "</td><td>" + esc(p.flight_date) + " " + esc(p.flight_time) + "</td><td>" + esc(p.weather) + "</td><td>" + esc(p.traffic) + "</td><td>" + esc(p.delay) + " min</td><td>" + esc(p.probability) + '%</td><td><span class="risk-badge ' + esc(p.risk_class) + '">' + esc(p.risk) + "</span></td></tr>").join("");
    note.hidden = list.length > 0;
    if (!list.length) note.textContent = all.length ? "No predictions match these filters." : "No predictions yet. Run one from the Predict page.";
  }
  ["q", "fRisk", "fWeather"].forEach((id) => document.getElementById(id).addEventListener("input", draw));

  document.getElementById("csvBtn").addEventListener("click", () => {
    const list = view();
    if (!list.length) { FP.toast("Nothing to export"); return; }
    const cols = ["created_at", "airline", "flight", "origin", "destination", "flight_date", "flight_time", "weather", "wind", "previous_delay", "traffic", "delay", "probability", "risk"];
    const cell = (v) => { v = String(v ?? ""); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    const csv = [cols.join(",")].concat(list.map((p) => cols.map((c) => cell(p[c])).join(","))).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "flight-predictions.csv"; a.click(); URL.revokeObjectURL(a.href);
    FP.toast("CSV downloaded");
  });

  async function load() {
    try {
      const [h, a] = await Promise.all([FP.api("/predictions?limit=1000"), FP.api("/analytics")]);
      all = h.predictions;
      const n = document.getElementById("storageNote");
      if (!h.dbEnabled) { n.hidden = false; n.innerHTML = '<span class="ico" aria-hidden="true">ℹ</span><div><strong>Temporary storage</strong>No DATABASE_URL is set, so history is kept in memory and clears when the server restarts.</div>'; }
      const stat = (label, value, tone) => '<div class="card kpi" data-tone="' + (tone || "") + '"><span class="kpi-label">' + label + '</span><span class="kpi-value">' + value + "</span></div>";
      document.getElementById("hStats").innerHTML = stat("Predictions", a.total) + stat("Average delay", a.avgDelay + "<small>min</small>") + stat("Average chance", a.avgProbability + "<small>%</small>") + stat("High risk", a.riskCounts.high, "high");
      draw();
    } catch (err) { note.textContent = "Could not load history: " + err.message; }
  }
  load();
})();
