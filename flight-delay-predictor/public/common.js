// Flight form + prediction result markup shared by the Predict and Compare pages.
(function () {
  const esc = FP.esc;
  const FIELDS = ["airline", "flight", "origin", "destination", "date", "time", "weather", "wind", "previousDelay", "traffic"];

  function ensureLists() {
    if (document.getElementById("airportList")) return;
    const dl = document.createElement("datalist");
    dl.id = "airportList";
    dl.innerHTML = window.AIRPORTS.map((a) => '<option value="' + a[0] + '">' + esc(a[1]) + "</option>").join("");
    document.body.appendChild(dl);
  }

  // Builds the ten flight fields inside `container`. `p` is an id prefix ("" or "a_").
  function render(container, p) {
    ensureLists();
    const id = (n) => p + n;
    container.innerHTML =
      '<div class="form-grid">' +
      '<div class="field"><label for="' + id("airline") + '">Airline</label><select id="' + id("airline") + '" required><option value="">Select airline</option>' +
      window.AIRLINES.map((a) => "<option>" + esc(a) + "</option>").join("") + "</select></div>" +
      '<div class="field"><label for="' + id("flight") + '">Flight number</label><input id="' + id("flight") + '" type="text" placeholder="e.g. 6E203" autocomplete="off" maxlength="12" required></div>' +
      '<div class="route-row">' +
      '<div class="field"><label for="' + id("origin") + '">From <span class="hint">(airport code)</span></label><input id="' + id("origin") + '" list="airportList" type="text" placeholder="e.g. BLR" maxlength="4" autocomplete="off" autocapitalize="characters" pattern="[A-Za-z]{3,4}" title="3 or 4 letter airport code" required></div>' +
      '<button type="button" class="btn btn-ghost swap-btn" data-swap="' + p + '" aria-label="Swap origin and destination">⇄</button>' +
      '<div class="field"><label for="' + id("destination") + '">To <span class="hint">(airport code)</span></label><input id="' + id("destination") + '" list="airportList" type="text" placeholder="e.g. DEL" maxlength="4" autocomplete="off" autocapitalize="characters" pattern="[A-Za-z]{3,4}" title="3 or 4 letter airport code" required></div></div>' +
      '<div class="field"><label for="' + id("date") + '">Flight date</label><input id="' + id("date") + '" type="date" required></div>' +
      '<div class="field"><label for="' + id("time") + '">Departure time</label><input id="' + id("time") + '" type="time" required></div>' +
      '<div class="field"><label for="' + id("weather") + '">Weather</label><select id="' + id("weather") + '" required><option value="">Select weather</option><option value="clear">Clear</option><option value="cloudy">Cloudy</option><option value="rain">Rain</option><option value="storm">Storm</option><option value="fog">Fog</option></select></div>' +
      '<div class="field"><label for="' + id("wind") + '">Wind speed <span class="hint">(km/h)</span></label><input id="' + id("wind") + '" type="number" inputmode="numeric" placeholder="e.g. 25" min="0" max="300" required></div>' +
      '<div class="field"><label for="' + id("previousDelay") + '">Previous flight delay</label><select id="' + id("previousDelay") + '" required><option value="0">No delay</option><option value="1">Minor delay</option><option value="2">Major delay</option></select></div>' +
      '<div class="field"><label for="' + id("traffic") + '">Airport traffic</label><select id="' + id("traffic") + '" required><option value="">Select traffic</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>' +
      "</div>";

    const origin = container.querySelector("#" + id("origin"));
    const dest = container.querySelector("#" + id("destination"));
    [origin, dest, container.querySelector("#" + id("flight"))].forEach((el) => el.addEventListener("input", () => {
      const pos = el.selectionStart; el.value = el.value.toUpperCase(); try { el.setSelectionRange(pos, pos); } catch (e) { /* date/number inputs */ }
    }));
    container.querySelector("[data-swap]").addEventListener("click", () => {
      const t = origin.value; origin.value = dest.value; dest.value = t;
    });
    const date = container.querySelector("#" + id("date"));
    if (!date.value) date.value = new Date().toISOString().slice(0, 10);
  }

  function read(p) {
    const v = (n) => document.getElementById(p + n).value;
    return {
      airline: v("airline"), flight: v("flight").trim().toUpperCase(),
      origin: v("origin").trim().toUpperCase(), destination: v("destination").trim().toUpperCase(),
      date: v("date"), time: v("time"), weather: v("weather"), wind: Number(v("wind")),
      previousDelay: Number(v("previousDelay")), traffic: v("traffic"),
    };
  }

  function fill(p, values) {
    FIELDS.forEach((n) => {
      if (values[n] === undefined || values[n] === null) return;
      document.getElementById(p + n).value = values[n];
    });
  }

  // Live warning while the form is being filled in.
  function conditionAlert(values) {
    if (values.weather === "storm") return { tone: "high", title: "Storm warning", text: "Thunderstorms often cause ground holds and re-routing. Check with your airline before leaving." };
    if (values.weather === "fog") return { tone: "medium", title: "Fog advisory", text: "Low visibility procedures slow take-offs and landings and can cause cascading delays." };
    if (values.wind >= 50) return { tone: "high", title: "Strong wind warning", text: "Winds of 50 km/h or more can affect approach paths and runway use." };
    return null;
  }
  function bindAlert(prefixes, alertEl) {
    function update() {
      let found = null;
      prefixes.forEach((p) => {
        const w = document.getElementById(p + "weather"), wind = document.getElementById(p + "wind");
        const a = conditionAlert({ weather: w.value, wind: Number(wind.value) });
        if (a && (!found || a.tone === "high")) found = a;
      });
      if (!found) { alertEl.hidden = true; return; }
      alertEl.dataset.tone = found.tone;
      alertEl.innerHTML = '<span class="ico" aria-hidden="true">⚠</span><div><strong>' + esc(found.title) + "</strong>" + esc(found.text) + "</div>";
      alertEl.hidden = false;
    }
    prefixes.forEach((p) => ["weather", "wind"].forEach((n) => {
      const el = document.getElementById(p + n);
      el.addEventListener("input", update); el.addEventListener("change", update);
    }));
    update();
  }

  // Markup for one prediction result. gaugeId must be unique on the page.
  function resultHTML(r, gaugeId) {
    const label = { low: "Low risk", medium: "Medium risk", high: "High risk" }[r.riskClass];
    return '<div class="result-top">' + Charts.gaugeSVG(gaugeId) +
      '<div class="delay-big">' + r.delay + "<small>min expected delay</small></div>" +
      '<div style="margin-top:10px"><span class="risk-badge ' + r.riskClass + '">' + label + "</span></div>" +
      '<div class="result-meta"><span>Score stability <strong>' + r.confidence + '%</strong></span></div></div>' +
      (r.trained ? '<p style="margin:12px 0 0;font-size:.9em;opacity:.9">Trained model: <strong>' + r.trained.probability + '%</strong> delay chance, about ' + r.trained.delay + ' min (' + r.trained.accuracy + '% accuracy on ' + r.trained.testRows + ' test flights' + (r.trained.synthetic ? ', synthetic demo data' : '') + ').</p>' : '') +
      '<h3 class="section-title">Why this score</h3>' +
      r.factors.map((f) =>
        '<div class="factor"><div class="factor-head"><span>' + esc(f.label) + "</span><strong>" + f.points + " / " + f.max + ' pts</strong></div><div class="bar" role="img" aria-label="' + esc(f.label) + " adds " + f.points + " of " + f.max + ' points"><span style="width:' + (f.max ? (f.points / f.max) * 100 : 0) + '%"></span></div></div>'
      ).join("") +
      '<h3 class="section-title">What to do</h3><ul class="tips">' + r.tips.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul>";
  }
  function animateGauge(gaugeId, r) {
    const svg = document.getElementById(gaugeId);
    requestAnimationFrame(() => requestAnimationFrame(() => Charts.gaugeSet(svg, r.probability, r.riskClass)));
  }

  async function predict(input, save) {
    return FP.api("/predict", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, save: save !== false }),
    });
  }

  window.FPForm = { FIELDS, render, read, fill, bindAlert, resultHTML, animateGauge, predict };
})();
