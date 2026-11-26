(function () {
  const esc = FP.esc;
  FPForm.render(document.getElementById("fieldsA"), "a_");
  FPForm.render(document.getElementById("fieldsB"), "b_");
  FPForm.bindAlert(["a_", "b_"], document.getElementById("alert"));

  document.getElementById("copyAB").addEventListener("click", () => {
    FPForm.fill("b_", FPForm.read("a_"));
    document.getElementById("b_weather").dispatchEvent(new Event("change"));
    FP.toast("Flight A copied into Flight B. Change what differs.");
  });

  const out = document.getElementById("cmpOut");
  const btn = document.getElementById("cmpBtn");
  document.getElementById("compareForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    btn.disabled = true; btn.textContent = "Comparing…";
    try {
      const A = FPForm.read("a_"), B = FPForm.read("b_");
      const [ra, rb] = await Promise.all([FPForm.predict(A, false), FPForm.predict(B, false)]);
      const title = (i) => esc(i.airline + " " + i.flight) + " · " + esc(i.origin) + " → " + esc(i.destination);
      let winner = null, verdict;
      if (ra.probability === rb.probability) verdict = "Both flights have the same delay chance (" + ra.probability + "%).";
      else {
        winner = ra.probability < rb.probability ? "a" : "b";
        const w = winner === "a" ? ra : rb, l = winner === "a" ? rb : ra;
        verdict = "Flight " + winner.toUpperCase() + " is the safer pick: " + w.probability + "% delay chance against " + l.probability + "%, about " + Math.abs(rb.delay - ra.delay) + " minutes less expected delay.";
      }
      const card = (label, key, i, r) =>
        '<section class="card" aria-labelledby="c' + key + '">' + (winner === key ? '<span class="winner-tag">Safer choice</span>' : "") +
        '<div class="card-head"><div><h2 id="c' + key + '">Flight ' + label + "</h2><p>" + title(i) + "</p></div></div>" + FPForm.resultHTML(r, "g_" + key) + "</section>";
      out.innerHTML = '<p class="verdict" role="status">' + esc(verdict) + '</p><div class="grid cols-2" style="margin-top:20px">' + card("A", "a", A, ra) + card("B", "b", B, rb) + "</div>";
      out.hidden = false;
      FPForm.animateGauge("g_a", ra); FPForm.animateGauge("g_b", rb);
      out.scrollIntoView({ block: "start", behavior: "smooth" });
    } catch (err) {
      FP.toast("Comparison failed: " + err.message);
    } finally {
      btn.disabled = false; btn.textContent = "Compare flights";
    }
  });
})();
