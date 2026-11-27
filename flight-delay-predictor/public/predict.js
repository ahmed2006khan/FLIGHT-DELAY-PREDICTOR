(function () {
  const esc = FP.esc;
  FPForm.render(document.getElementById("fields"), "");
  FPForm.bindAlert([""], document.getElementById("alert"));

  const form = document.getElementById("flightForm");
  const btn = document.getElementById("submitBtn");
  const empty = document.getElementById("empty");
  const result = document.getElementById("result");
  let lastInput = null;
  let lastResult = null;

  // ----- saved routes (kept in this browser) -----
  const KEY = "fp.routes";
  function routes() { return FP.store(KEY, []); }
  function drawRoutes() {
    const list = routes();
    const wrap = document.getElementById("savedWrap");
    wrap.hidden = !list.length;
    document.getElementById("saved").innerHTML = list.map((r, i) =>
      '<span class="chip" style="padding:0"><button type="button" class="chip" style="border:0" data-use="' + i + '" aria-label="Use route ' + esc(r.origin) + " to " + esc(r.destination) + (r.airline ? " on " + esc(r.airline) : "") + '">✈ ' +
      esc(r.origin) + " → " + esc(r.destination) + (r.airline ? " · " + esc(r.airline) : "") + '</button><button type="button" class="chip" style="border:0;padding-left:2px" data-del="' + i + '" aria-label="Remove saved route ' + esc(r.origin) + " to " + esc(r.destination) + '"><span class="x" aria-hidden="true">×</span></button></span>'
    ).join("");
  }
  document.getElementById("saved").addEventListener("click", (e) => {
    const use = e.target.closest("[data-use]"), del = e.target.closest("[data-del]");
    const list = routes();
    if (use) {
      const r = list[Number(use.dataset.use)];
      FPForm.fill("", { origin: r.origin, destination: r.destination, airline: r.airline || "", flight: r.flight || "" });
      FP.toast("Route filled in");
    } else if (del) {
      list.splice(Number(del.dataset.del), 1); FP.save(KEY, list); drawRoutes(); FP.toast("Route removed");
    }
  });
  document.getElementById("saveRoute").addEventListener("click", () => {
    const v = FPForm.read("");
    if (!/^[A-Z]{3,4}$/.test(v.origin) || !/^[A-Z]{3,4}$/.test(v.destination)) { FP.toast("Enter both airport codes first"); return; }
    const list = routes();
    if (list.some((r) => r.origin === v.origin && r.destination === v.destination && (r.airline || "") === v.airline)) { FP.toast("Route already saved"); return; }
    list.unshift({ origin: v.origin, destination: v.destination, airline: v.airline, flight: v.flight });
    FP.save(KEY, list.slice(0, 8)); drawRoutes(); FP.toast("Route saved");
  });
  drawRoutes();

  // ----- watchlist -----
  const WKEY = "fp.watchlist";
  function watchlist() { return FP.store(WKEY, []); }
  function addWatch(input, r) {
    const list = watchlist();
    const id = [input.origin, input.destination, input.date, input.time, input.flight].join("|");
    if (list.some((w) => w.id === id)) { FP.toast("Already on watchlist"); return; }
    list.unshift({
      id, origin: input.origin, destination: input.destination, date: input.date, time: input.time,
      flight: input.flight, airline: input.airline, probability: r.probability, delay: r.delay, riskClass: r.riskClass,
      addedAt: new Date().toISOString()
    });
    FP.save(WKEY, list.slice(0, 20));
    FP.toast("Added to watchlist");
  }

  // ----- wire result interactions -----
  function wireResult(input, r) {
    lastInput = input;
    lastResult = r;

    result.querySelectorAll(".sugg-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const action = chip.dataset.action;
        const value = chip.dataset.value;
        if (action === "set-time" && value) {
          const t = document.getElementById("time");
          if (t) { t.value = value; t.dispatchEvent(new Event("input", { bubbles: true })); }
          FP.toast("Time set to " + value + " — press Predict delay");
        } else if (action === "watchlist") {
          addWatch(input, r);
        }
      });
    });

    const wiWeather = document.getElementById("wiWeather");
    const wiWind = document.getElementById("wiWind");
    const wiWindVal = document.getElementById("wiWindVal");
    const wiTraffic = document.getElementById("wiTraffic");
    const wiPrev = document.getElementById("wiPrev");
    const wiResult = document.getElementById("wiResult");
    if (wiWeather && input) {
      wiWeather.value = input.weather || "clear";
      wiWind.value = Math.min(80, Number(input.wind) || 0);
      wiWindVal.textContent = wiWind.value + " km/h";
      wiTraffic.value = input.traffic || "medium";
      wiPrev.value = String(input.previousDelay || 0);
      function refreshWi() {
        const sim = {
          weather: wiWeather.value,
          wind: Number(wiWind.value),
          traffic: wiTraffic.value,
          previousDelay: Number(wiPrev.value),
          time: input.time,
          destWeather: input.destWeather
        };
        const s = FPForm.clientScore(sim);
        const label = { low: "Low", medium: "Medium", high: "High" }[s.riskClass];
        wiResult.innerHTML = "Estimated <strong>" + s.probability + "%</strong> chance · ~" + s.delay + " min · <span class=\"risk-badge " + s.riskClass + "\">" + label + "</span>";
        wiWindVal.textContent = wiWind.value + " km/h";
      }
      [wiWeather, wiWind, wiTraffic, wiPrev].forEach((el) => el.addEventListener("input", refreshWi));
      refreshWi();
    }

    const shareBtn = document.getElementById("shareBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", async () => {
        const text = "FlightPredict: " + (input.flight || "") + " " + input.origin + "→" + input.destination +
          " on " + input.date + " " + input.time + " — " + r.probability + "% delay chance, ~" + r.delay + " min expected. Know before you go.";
        try {
          if (navigator.share) {
            await navigator.share({ title: "FlightPredict", text });
          } else {
            await navigator.clipboard.writeText(text);
            FP.toast("Copied prediction to clipboard");
          }
        } catch (e) {
          try { await navigator.clipboard.writeText(text); FP.toast("Copied prediction to clipboard"); }
          catch (e2) { FP.toast("Could not share"); }
        }
      });
    }

    const watchBtn = document.getElementById("watchBtn");
    if (watchBtn) watchBtn.addEventListener("click", () => addWatch(input, r));

    function saveFeedback(ok) {
      const fb = FP.store("fp.feedback", []);
      fb.unshift({ ok, probability: r.probability, delay: r.delay, at: new Date().toISOString(), route: input.origin + "-" + input.destination });
      FP.save("fp.feedback", fb.slice(0, 50));
      FP.toast(ok ? "Thanks — marked as accurate" : "Thanks — we'll use this to improve");
      const yes = document.getElementById("feedbackYes");
      const no = document.getElementById("feedbackNo");
      if (yes) yes.disabled = true;
      if (no) no.disabled = true;
    }
    const fy = document.getElementById("feedbackYes");
    const fn = document.getElementById("feedbackNo");
    if (fy) fy.addEventListener("click", () => saveFeedback(true));
    if (fn) fn.addEventListener("click", () => saveFeedback(false));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = FPForm.read("");
    btn.disabled = true; btn.textContent = "Predicting…";
    try {
      const r = await FPForm.predict(input, true);
      empty.hidden = true; result.hidden = false;
      result.innerHTML = FPForm.resultHTML(r, "mainGauge") +
        '<div class="btn-row"><a class="btn btn-primary" href="report.html">Open full report</a><a class="btn btn-ghost" href="compare.html">Compare with another flight</a><a class="btn btn-ghost" href="connection.html">Connection risk</a></div>';
      FPForm.animateGauge("mainGauge", r);
      FP.save("flightPrediction", { input, result: r, createdAt: new Date().toISOString() });
      wireResult(input, r);
      result.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch (err) {
      FP.toast("Prediction failed: " + err.message);
      empty.hidden = false; result.hidden = true;
      empty.querySelector("h3").textContent = "Could not reach the server";
      empty.querySelector("p").textContent = "Free hosting can sleep after inactivity. Wait 30–60 seconds and try again. Details: " + err.message;
    } finally {
      btn.disabled = false; btn.textContent = "Predict delay";
    }
  });

  form.addEventListener("reset", () => {
    result.hidden = true; empty.hidden = false;
    lastInput = null; lastResult = null;
    setTimeout(() => { document.getElementById("date").value = new Date().toISOString().slice(0, 10); document.getElementById("alert").hidden = true; }, 0);
  });
})();
