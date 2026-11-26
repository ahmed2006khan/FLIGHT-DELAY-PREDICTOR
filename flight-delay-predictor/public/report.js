(function () {
  const esc = FP.esc;
  const saved = FP.store("flightPrediction", null);
  if (!saved || !saved.input || !saved.result) { document.getElementById("noData").hidden = false; return; }
  const { input: i, result: r } = saved;
  document.getElementById("reportBody").hidden = false;
  document.getElementById("stamp").textContent = "Created " + new Date(saved.createdAt).toLocaleString();
  document.getElementById("repResult").innerHTML = FPForm_resultHTML(r);
  Charts.gaugeSet(document.getElementById("repGauge"), r.probability, r.riskClass);

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const prevText = ["No delay", "Minor delay", "Major delay"][i.previousDelay];
  const rows = [
    ["Airline", i.airline], ["Flight", i.flight], ["From", i.origin], ["To", i.destination],
    ["Date", i.date], ["Departure", i.time], ["Weather", cap(i.weather)], ["Wind", i.wind + " km/h"],
    ["Previous flight", prevText], ["Airport traffic", cap(i.traffic)],
  ];
  document.getElementById("kv").innerHTML = rows.map(([k, v]) => "<div><small>" + k + "</small><strong>" + esc(v) + "</strong></div>").join("");

  document.getElementById("analysis").textContent =
    r.probability < 35 ? "This flight has a low chance of a significant delay. Weather, traffic and operations look favourable."
    : r.probability < 65 ? "This flight has a moderate chance of delay. Watch for updates and allow some extra travel time."
    : "This flight has a high chance of delay. Weather, airport traffic or an earlier delay may affect the scheduled departure.";

  const summary = i.airline + " " + i.flight + " (" + i.origin + " to " + i.destination + ", " + i.date + " " + i.time + "): " +
    r.probability + "% delay chance, about " + r.delay + " min expected delay, " + r.risk.toLowerCase() + ".";
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("copyBtn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(summary); FP.toast("Summary copied"); } catch (e) { FP.toast("Copy is not available in this browser"); }
  });
  document.getElementById("csvBtn").addEventListener("click", () => {
    const head = ["airline", "flight", "origin", "destination", "date", "time", "weather", "wind_kmh", "previous_delay", "traffic", "delay_min", "probability_pct", "risk", "confidence_pct"];
    const vals = [i.airline, i.flight, i.origin, i.destination, i.date, i.time, i.weather, i.wind, prevText, i.traffic, r.delay, r.probability, r.risk, r.confidence];
    const cell = (v) => { v = String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([head.join(",") + "\r\n" + vals.map(cell).join(",")], { type: "text/csv" }));
    a.download = "flight-report-" + i.flight + ".csv"; a.click(); URL.revokeObjectURL(a.href);
    FP.toast("CSV downloaded");
  });

  function FPForm_resultHTML(res) {
    const label = { low: "Low risk", medium: "Medium risk", high: "High risk" }[res.riskClass];
    return '<div class="result-top">' + Charts.gaugeSVG("repGauge") + '<div class="delay-big">' + res.delay + "<small>min expected delay</small></div>" +
      '<div style="margin-top:10px"><span class="risk-badge ' + res.riskClass + '">' + label + '</span></div><div class="result-meta"><span>Score stability <strong>' + res.confidence + "%</strong></span></div></div>" +
      '<h3 class="section-title">Why this score</h3>' + res.factors.map((f) =>
        '<div class="factor"><div class="factor-head"><span>' + esc(f.label) + "</span><strong>" + f.points + " / " + f.max + ' pts</strong></div><div class="bar"><span style="width:' + (f.max ? (f.points / f.max) * 100 : 0) + '%"></span></div></div>').join("");
  }
})();
