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
  function resultHTML(r, gaugeId, opts) {
    opts = opts || {};
    const label = { low: "Low risk", medium: "Medium risk", high: "High risk" }[r.riskClass];
    const seasonBadge = (r.season && r.season.length)
      ? '<span class="season-badge">' + esc(r.season.map((s) => ({ monsoon: "Monsoon", "winter-fog": "Winter fog", festival: "Festival peak" }[s] || s)).join(" · ")) + "</span>"
      : "";
    const sugg = (r.suggestions || []).map((s, i) =>
      '<button type="button" class="sugg-chip" data-sugg="' + i + '" data-action="' + esc(s.action || "") + '" data-value="' + esc(s.value || "") + '">' + esc(s.text) + "</button>"
    ).join("");
    const strip = sugg
      ? '<div class="suggestion-strip" role="region" aria-label="Suggestions"><div class="sugg-label">Suggestions</div><div class="sugg-row">' + sugg + "</div></div>"
      : "";
    const whatIf = opts.whatIf !== false
      ? '<div class="what-if card-inset" id="whatIfPanel">' +
        '<h3 class="section-title" style="margin-top:0">What if…</h3>' +
        '<p class="hint" style="margin:0 0 10px">Drag to see how the score changes. Press Predict again to lock a new result.</p>' +
        '<div class="what-if-grid">' +
        '<label class="wi-field">Weather<select id="wiWeather"><option value="clear">Clear</option><option value="cloudy">Cloudy</option><option value="rain">Rain</option><option value="fog">Fog</option><option value="storm">Storm</option></select></label>' +
        '<label class="wi-field">Wind (km/h)<input id="wiWind" type="range" min="0" max="80" step="5"><span id="wiWindVal" class="wi-val"></span></label>' +
        '<label class="wi-field">Traffic<select id="wiTraffic"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>' +
        '<label class="wi-field">Inbound delay<select id="wiPrev"><option value="0">On time</option><option value="1">15–45 min</option><option value="2">45+ min</option></select></label>' +
        '</div><div class="wi-result" id="wiResult" aria-live="polite"></div></div>'
      : "";
    const actions =
      '<div class="btn-row result-actions">' +
      '<button type="button" class="btn btn-ghost" id="shareBtn">Share</button>' +
      '<button type="button" class="btn btn-ghost" id="watchBtn">☆ Watchlist</button>' +
      '<button type="button" class="btn btn-ghost" id="feedbackYes">Was accurate</button>' +
      '<button type="button" class="btn btn-ghost" id="feedbackNo">Was off</button>' +
      "</div>";
    return strip +
      '<div class="result-top">' + Charts.gaugeSVG(gaugeId) +
      '<div class="delay-big">' + r.delay + "<small>min expected delay</small></div>" +
      '<div style="margin-top:10px"><span class="risk-badge ' + r.riskClass + '">' + label + "</span> " + seasonBadge + "</div>" +
      '<div class="result-meta"><span>Score stability <strong>' + r.confidence + '%</strong></span><span>Delay chance <strong>' + r.probability + '%</strong></span></div></div>' +
      (r.trained ? '<p style="margin:12px 0 0;font-size:.9em;opacity:.9">Trained model: <strong>' + r.trained.probability + '%</strong> delay chance, about ' + r.trained.delay + ' min (' + r.trained.accuracy + '% accuracy on ' + r.trained.testRows + ' test flights' + (r.trained.synthetic ? ', synthetic demo data' : '') + ').</p>' : '') +
      '<h3 class="section-title">Why this score</h3>' +
      r.factors.map((f) =>
        '<div class="factor"><div class="factor-head"><span>' + esc(f.label) + "</span><strong>" + f.points + " / " + f.max + ' pts</strong></div><div class="bar" role="img" aria-label="' + esc(f.label) + " adds " + f.points + " of " + f.max + ' points"><span style="width:' + (f.max ? (f.points / f.max) * 100 : 0) + '%"></span></div></div>'
      ).join("") +
      '<h3 class="section-title">What to do</h3><ul class="tips">' + r.tips.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul>" +
      whatIf + actions;
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

  // Client-side score for What-if (mirrors server rule-based model).
  function clientScore(input) {
    const W = { clear: 0, cloudy: 8, rain: 20, fog: 28, storm: 35 };
    const T = { low: 3, medium: 12, high: 25 };
    const P = [0, 10, 20];
    function wind(kmh) { if (kmh < 20) return 0; if (kmh < 30) return 5; if (kmh <= 50) return 10; return 18; }
    function timeImpact(time) {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(time || ""));
      if (!m) return 0;
      const h = Number(m[1]);
      if ((h >= 6 && h <= 9) || (h >= 17 && h <= 21)) return 8;
      if (h >= 10 && h <= 16) return 3;
      return 0;
    }
    const dest = input.destWeather ? Math.round(((W[input.destWeather] || 0) * 10) / 35) : 0;
    const score = (W[input.weather] || 0) + (T[input.traffic] || 0) + wind(Number(input.wind) || 0) + (P[input.previousDelay] || 0) + timeImpact(input.time) + dest;
    const probability = Math.min(98, Math.max(2, Math.round(score)));
    const delay = probability < 20 ? Math.round(probability * 0.3) : Math.round(probability * 0.9 + (input.previousDelay || 0) * 8);
    let riskClass = "low";
    if (probability >= 65) riskClass = "high";
    else if (probability >= 35) riskClass = "medium";
    return { probability, delay, riskClass };
  }

  window.FPForm = { FIELDS, render, read, fill, bindAlert, resultHTML, animateGauge, predict, clientScore };
})();
