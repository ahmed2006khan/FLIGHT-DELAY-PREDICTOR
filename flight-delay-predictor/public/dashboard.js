(function () {
  const esc = FP.esc;
  const $ = (id) => document.getElementById(id);
  const short = (d) => { const p = d.split("-"); return p[2] + "/" + p[1]; };
  const toneOf = (v) => (v >= 65 ? "high" : v >= 35 ? "medium" : "low");

  function kpi(label, value, unit, note, tone) {
    return '<div class="card kpi" data-tone="' + (tone || "") + '"><span class="kpi-label">' + label + '</span><span class="kpi-value">' + value + (unit ? "<small>" + unit + "</small>" : "") + '</span><span class="kpi-note">' + note + "</span></div>";
  }

  function empty() {
    $("dashBody").hidden = true; $("dashAlert").hidden = true;
    const c = $("dashEmpty"); c.hidden = false;
    c.innerHTML = '<div class="empty"><h3>Your dashboard is waiting for data</h3><p>Make a prediction to start filling it, or load sample data to explore the charts first.</p>' +
      '<div class="btn-row" style="justify-content:center"><a class="btn btn-primary" href="predict.html" style="flex:0 0 auto">Predict a flight</a><button class="btn btn-ghost" id="demoBtn" type="button">Load sample data</button></div></div>';
    $("demoBtn").addEventListener("click", async () => {
      $("demoBtn").disabled = true;
      try { await FP.api("/demo-data", { method: "POST" }); FP.toast("Sample data added"); load(); }
      catch (e) { FP.toast(e.message); $("demoBtn").disabled = false; }
    });
  }

  function draw(a) {
    $("dashEmpty").hidden = true; $("dashBody").hidden = false;
    $("kpis").innerHTML =
      kpi("Predictions analysed", a.total, "", "Across all saved flights") +
      kpi("Average delay", a.avgDelay, "min", "Expected per flight") +
      kpi("Likely on time", a.likelyOnTime, "%", "Flights rated low risk", "low") +
      kpi("High risk, last 24 h", a.highLast24h, "", a.highLast24h ? "Flights to keep an eye on" : "Nothing flagged", a.highLast24h ? "high" : "");

    const al = $("dashAlert");
    if (a.highLast24h > 0) {
      al.hidden = false; al.dataset.tone = a.highLast24h >= 5 ? "high" : "medium";
      al.innerHTML = '<span class="ico" aria-hidden="true">⚠</span><div><strong>' + a.highLast24h + " high-risk " + (a.highLast24h === 1 ? "prediction" : "predictions") + " in the last 24 hours</strong>Biggest driver overall: " + esc(a.causes[0].label.toLowerCase()) + ".</div>";
    } else al.hidden = true;

    Charts.line($("trend"), a.trend.map((t) => ({ label: short(t.date), value: t.avgProbability })), "Average delay chance by flight date");
    Charts.donut($("donut"), a.riskCounts, "Predictions by risk level");
    Charts.columns($("hours"), a.byHour.map((h) => ({ label: String(h.hour).padStart(2, "0") + ":00", value: h.avgProbability })), "Average delay chance by departure hour");
    Charts.hbars($("airlines"), a.byAirline.map((x) => ({ label: x.name, value: x.avgProbability, text: x.avgProbability + "% · " + x.count + " flights", tone: toneOf(x.avgProbability) })), "Average delay chance by airline");
    Charts.hbars($("causes"), a.causes.map((c) => ({ label: c.label, value: c.share, text: c.share + "%" })), "Share of delay score by cause");
    Charts.hbars($("airports"), a.byOrigin.map((x) => ({ label: x.name, value: x.avgProbability, text: x.avgProbability + "% · " + x.count + " flights", tone: toneOf(x.avgProbability) })), "Busiest departure airports");

    $("recent").innerHTML = a.recent.map((p) =>
      "<tr><td>" + esc(p.airline) + " " + esc(p.flight) + "</td><td>" + esc(p.origin) + " → " + esc(p.destination) + "</td><td>" + esc(p.flight_date) + "</td><td>" + esc(p.weather) + "</td><td>" + esc(p.delay) + " min</td><td>" + esc(p.probability) + '%</td><td><span class="risk-badge ' + esc(p.risk_class) + '">' + esc(p.risk) + "</span></td></tr>").join("");
    $("updated").textContent = "Updated " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + (a.storage === "memory" ? " · temporary storage" : "");
  }

  async function load() {
    try {
      const a = await FP.api("/analytics");
      a.total ? draw(a) : empty();
    } catch (e) {
      $("dashBody").hidden = true;
      const c = $("dashEmpty"); c.hidden = false;
      c.innerHTML = '<div class="empty"><h3>Could not load the dashboard</h3><p>' + esc(e.message) + '. If the app is on free hosting it may be waking up; wait a minute and refresh.</p></div>';
    }
  }
  load();
  document.addEventListener("fp:theme", () => {});     // charts use CSS variables, so no redraw needed
  setInterval(() => { if (!document.hidden && !$("dashBody").hidden) load(); }, 30000);
})();
