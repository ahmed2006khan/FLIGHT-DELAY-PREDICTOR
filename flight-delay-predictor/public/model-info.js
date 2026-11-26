// Fills the "Trained model" card on the model page from /api/model.
(async function () {
  const box = document.getElementById("trainedBody");
  if (!box) return;
  const esc = FP.esc, pct = (v) => (v === null || v === undefined ? "n/a" : (v * 100).toFixed(1) + "%");
  try {
    const { trained: t } = await FP.api("/model");
    if (!t) {
      box.innerHTML = "<p>No trained model is loaded yet, so predictions use the rule-based score only. Train one on a real flights file with <code>npm run train -- data/flights.csv</code> (see the README), commit <code>model/weights.json</code> and redeploy.</p>";
      return;
    }
    const m = t.metrics;
    box.innerHTML =
      (t.synthetic ? '<div class="alert" data-tone="high" role="status"><span class="ico" aria-hidden="true">⚠</span><div><strong>Demo data</strong>This model was trained on synthetic sample data. The numbers below only show the code works.</div></div>' : "") +
      "<p>Trained " + esc(new Date(t.trainedAt).toLocaleDateString()) + (t.source ? " on <strong>" + esc(t.source) + "</strong>" : "") + ". Delayed means " + t.delayThresholdMinutes + " minutes or more. " +
      m.trainRows + " flights to train, " + m.testRows + " held back to test.</p>" +
      '<div style="overflow-x:auto"><table><thead><tr><th>On the test flights</th><th>Accuracy</th><th>AUC</th></tr></thead><tbody>' +
      "<tr><td>Always guess the common outcome</td><td>" + pct(m.majorityBaselineAccuracy) + "</td><td>0.500</td></tr>" +
      "<tr><td>Rule-based score</td><td>" + pct(m.ruleBased.accuracy) + "</td><td>" + (m.ruleBased.auc === null ? "n/a" : m.ruleBased.auc.toFixed(3)) + "</td></tr>" +
      "<tr><td><strong>Trained model</strong></td><td><strong>" + pct(m.trained.accuracy) + "</strong></td><td><strong>" + (m.trained.auc === null ? "n/a" : m.trained.auc.toFixed(3)) + "</strong></td></tr></tbody></table></div>" +
      "<p>Precision " + pct(m.trained.precision) + ", recall " + pct(m.trained.recall) + ", F1 " + pct(m.trained.f1) + ". Average error on delay minutes: " + m.trained.maeMinutes.toFixed(1) + " min.</p>";
  } catch (e) {
    box.textContent = "Could not load model details: " + e.message;
  }
})();
