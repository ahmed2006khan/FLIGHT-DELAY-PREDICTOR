const assert = require("assert");
const { predict, validate, validateConditions, windImpact, timeImpact, bestTimes, confidence } = require("../predictor");
const { analyze } = require("../analytics");
const { generate } = require("../demo-data");

// wind
assert.strictEqual(windImpact(10), 0);
assert.strictEqual(windImpact(25), 5);
assert.strictEqual(windImpact(40), 10);
assert.strictEqual(windImpact(80), 18);

// time of day
assert.strictEqual(timeImpact("08:30"), 8);
assert.strictEqual(timeImpact("13:00"), 3);
assert.strictEqual(timeImpact("02:00"), 0);
assert.strictEqual(timeImpact(undefined), 0);

// risk levels (no time given = original four-factor score)
const low = predict({ weather: "clear", wind: 5, previousDelay: 0, traffic: "low" });
assert.strictEqual(low.riskClass, "low");

const high = predict({ weather: "storm", wind: 60, previousDelay: 2, traffic: "high" });
assert.strictEqual(high.riskClass, "high");
assert.ok(high.probability <= 98);

const mid = predict({ weather: "rain", wind: 25, previousDelay: 0, traffic: "medium" });
assert.strictEqual(mid.riskClass, "medium");

// factors add up to the probability (before clamping) and are all reported
assert.deepStrictEqual(mid.factors.map((f) => f.key), ["weather", "traffic", "wind", "previous", "time", "destination"]);
assert.strictEqual(mid.factors.reduce((s, f) => s + f.points, 0), mid.probability);
assert.ok(mid.tips.length >= 1);

// peak hour adds points
const peak = predict({ weather: "rain", wind: 25, previousDelay: 0, traffic: "medium", time: "08:00" });
assert.strictEqual(peak.probability, mid.probability + 8);

// destination weather adds up to 10 points, and nothing when it is not given
const withDest = predict({ weather: "rain", wind: 25, previousDelay: 0, traffic: "medium", destWeather: "storm" });
assert.strictEqual(withDest.probability, mid.probability + 10);
assert.strictEqual(predict({ weather: "rain", wind: 25, previousDelay: 0, traffic: "medium", destWeather: "clear" }).probability, mid.probability);

// confidence is lowest next to a risk boundary
assert.ok(confidence(35) < confidence(10));
assert.ok(confidence(65) < confidence(90));
assert.ok(confidence(50) >= 60 && confidence(2) <= 98);

// best time
const bt = bestTimes({ weather: "rain", wind: 25, previousDelay: 1, traffic: "medium" });
assert.strictEqual(bt.hours.length, 24);
assert.ok(bt.best.every((h) => h.probability === bt.bestProbability));
assert.ok(bt.hours[8].probability > bt.hours[3].probability);

// validation
assert.ok(validate({}).length > 0);
assert.strictEqual(validateConditions({ weather: "fog", wind: 10, previousDelay: 0, traffic: "low" }).length, 0);
assert.ok(validateConditions({ weather: "hail", wind: 10, previousDelay: 0, traffic: "low" }).length > 0);

// analytics on sample data
const samples = generate(60, new Date("2026-11-20T12:00:00Z"));
const rows = samples.map((s, n) => ({
  id: n + 1, airline: s.input.airline, flight: s.input.flight, origin: s.input.origin, destination: s.input.destination,
  flight_date: s.input.date, flight_time: s.input.time, weather: s.input.weather, wind: s.input.wind,
  previous_delay: s.input.previousDelay, traffic: s.input.traffic, delay: s.result.delay,
  probability: s.result.probability, risk: s.result.risk, risk_class: s.result.riskClass,
  created_at: s.createdAt.toISOString(),
}));
const a = analyze(rows, new Date("2026-11-20T12:00:00Z").getTime());
assert.strictEqual(a.total, 60);
assert.strictEqual(a.riskCounts.low + a.riskCounts.medium + a.riskCounts.high, 60);
assert.strictEqual(a.causes.reduce((s, c) => s + c.share, 0) >= 98, true);   // rounding may lose a point or two
assert.ok(a.trend.length > 0 && a.trend.length <= 14);
assert.strictEqual(a.byHour.length, 24);
assert.ok(a.byAirline.length > 0);
assert.strictEqual(analyze([]).total, 0);

console.log("All tests passed.");
