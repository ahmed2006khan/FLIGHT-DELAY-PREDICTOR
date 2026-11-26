const assert = require("assert");
const os = require("os");
const path = require("path");
const ml = require("../ml");
const { generate } = require("../sample-data");

// Checks that the training code works, using SYNTHETIC rows (not real flights).
const rows = generate(3000, 3).map((r) => ({ ...r, time: String(r.hour).padStart(2, "0") + ":00" }));
const model = ml.train(rows, { epochs: 600 });
assert.strictEqual(model.features.length, model.logistic.w.length);
assert.ok(model.metrics.trained.auc > 0.7, "model should rank delayed flights above on-time ones");
assert.ok(model.metrics.trained.accuracy >= model.metrics.majorityBaselineAccuracy - 0.02);
assert.ok(model.metrics.trained.maeMinutes < 60);
assert.strictEqual(model.metrics.trainRows + model.metrics.testRows, 3000);

// bad weather, heavy traffic and a late aircraft must score higher than a calm case
const calm = ml.predictWith(model, { weather: "clear", wind: 5, traffic: "low", previousDelay: 0, time: "02:00" });
const bad = ml.predictWith(model, { weather: "storm", wind: 60, traffic: "high", previousDelay: 2, time: "08:00", destWeather: "rain" });
assert.ok(bad.probability > calm.probability + 20);
assert.ok(bad.delay >= calm.delay);
assert.ok(calm.probability >= 2 && bad.probability <= 98);

// save and load round trip
const file = path.join(os.tmpdir(), "fp-weights-test.json");
ml.save(model, file);
const back = ml.load(file);
assert.deepStrictEqual(ml.predictWith(back, { weather: "rain", wind: 30, traffic: "medium", previousDelay: 1, time: "18:00" }),
  ml.predictWith(model, { weather: "rain", wind: 30, traffic: "medium", previousDelay: 1, time: "18:00" }));
assert.strictEqual(ml.load(path.join(os.tmpdir(), "does-not-exist.json")), null);
assert.strictEqual(ml.summary(null), null);
assert.throws(() => ml.train(rows.slice(0, 10)));

// AUC sanity
assert.strictEqual(ml.auc([0.1, 0.2, 0.8, 0.9], [0, 0, 1, 1]), 1);
assert.strictEqual(ml.auc([0.5, 0.5, 0.5, 0.5], [0, 1, 0, 1]), 0.5);

console.log("Model tests passed.");
