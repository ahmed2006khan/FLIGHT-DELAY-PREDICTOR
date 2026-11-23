const assert = require("assert");
const { predict, validate, windImpact } = require("../predictor");

assert.strictEqual(windImpact(10), 0);
assert.strictEqual(windImpact(25), 5);
assert.strictEqual(windImpact(40), 10);
assert.strictEqual(windImpact(80), 18);

const low = predict({ weather: "clear", wind: 5, previousDelay: 0, traffic: "low" });
assert.strictEqual(low.riskClass, "low");

const high = predict({ weather: "storm", wind: 60, previousDelay: 2, traffic: "high" });
assert.strictEqual(high.riskClass, "high");
assert.ok(high.probability <= 98);

const mid = predict({ weather: "rain", wind: 25, previousDelay: 0, traffic: "medium" });
assert.strictEqual(mid.riskClass, "medium");

assert.ok(validate({}).length > 0);
console.log("All predictor tests passed.");
