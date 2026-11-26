(function () {
  const esc = FP.esc;
  FPForm.render(document.getElementById("fields"), "");
  FPForm.bindAlert([""], document.getElementById("alert"));

  const form = document.getElementById("flightForm");
  const btn = document.getElementById("submitBtn");
  const empty = document.getElementById("empty");
  const result = document.getElementById("result");

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
      toastRoute("Route filled in");
    } else if (del) {
      list.splice(Number(del.dataset.del), 1); FP.save(KEY, list); drawRoutes(); FP.toast("Route removed");
    }
  });
  function toastRoute(m) { FP.toast(m); }
  document.getElementById("saveRoute").addEventListener("click", () => {
    const v = FPForm.read("");
    if (!/^[A-Z]{3,4}$/.test(v.origin) || !/^[A-Z]{3,4}$/.test(v.destination)) { FP.toast("Enter both airport codes first"); return; }
    const list = routes();
    if (list.some((r) => r.origin === v.origin && r.destination === v.destination && (r.airline || "") === v.airline)) { FP.toast("Route already saved"); return; }
    list.unshift({ origin: v.origin, destination: v.destination, airline: v.airline, flight: v.flight });
    FP.save(KEY, list.slice(0, 8)); drawRoutes(); FP.toast("Route saved");
  });
  drawRoutes();

  // ----- predict -----
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = FPForm.read("");
    btn.disabled = true; btn.textContent = "Predicting…";
    try {
      const r = await FPForm.predict(input, true);
      empty.hidden = true; result.hidden = false;
      result.innerHTML = FPForm.resultHTML(r, "mainGauge") +
        '<div class="btn-row"><a class="btn btn-primary" href="report.html">Open full report</a><a class="btn btn-ghost" href="compare.html">Compare with another flight</a></div>';
      FPForm.animateGauge("mainGauge", r);
      FP.save("flightPrediction", { input, result: r, createdAt: new Date().toISOString() });
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
    setTimeout(() => { document.getElementById("date").value = new Date().toISOString().slice(0, 10); document.getElementById("alert").hidden = true; }, 0);
  });
})();
