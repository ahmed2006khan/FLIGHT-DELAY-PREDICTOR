const assert = require("assert");
const { mapCode, pickHour, summarize, COORDS } = require("../weather");
const { estimate } = require("../traffic");
const { AIRPORTS, AIRLINES } = require("../public/airports");

// weather codes -> predictor categories
assert.strictEqual(mapCode(0, 10000), "clear");
assert.strictEqual(mapCode(1, 10000), "clear");
assert.strictEqual(mapCode(3, 10000), "cloudy");
assert.strictEqual(mapCode(45, 5000), "fog");
assert.strictEqual(mapCode(61, 8000), "rain");
assert.strictEqual(mapCode(81, 8000), "rain");
assert.strictEqual(mapCode(95, 8000), "storm");
assert.strictEqual(mapCode(1, 400), "fog");        // very low visibility counts as fog
assert.strictEqual(mapCode(96, 400), "storm");     // but never hides a storm

// picking the right hour from an Open-Meteo style payload
const payload = { hourly: {
  time: ["2026-12-01T07:00", "2026-12-01T08:00", "2026-12-01T09:00"],
  weather_code: [1, 63, 95], wind_speed_10m: [10.4, 27.6, 55], visibility: [9000, 7000, 3000],
  precipitation: [0, 1.2, 8], temperature_2m: [20.2, 19.8, 19],
} };
assert.strictEqual(pickHour(payload.hourly, "2026-12-01", "08:30"), 1);
assert.strictEqual(pickHour(payload.hourly, "2026-12-02", "08:30"), -1);
const s = summarize(payload, "2026-12-01", "08:30");
assert.strictEqual(s.weather, "rain");
assert.strictEqual(s.wind, 28);
assert.strictEqual(s.visibilityKm, 7);
assert.strictEqual(summarize(payload, "2026-12-05", "08:00"), null);
assert.strictEqual(summarize(null, "2026-12-01", "08:00"), null);

// traffic estimate
assert.strictEqual(estimate("DEL", "08:15").level, "high");
assert.strictEqual(estimate("DEL", "13:00").level, "medium");
assert.strictEqual(estimate("DEL", "02:00").level, "low");
assert.strictEqual(estimate("PNQ", "18:00").level, "medium");
assert.strictEqual(estimate("UDR", "18:00").level, "low");

// airport data: every airport has coordinates in range, codes are unique, retired airlines are gone
assert.strictEqual(new Set(AIRPORTS.map((a) => a[0])).size, AIRPORTS.length);
AIRPORTS.forEach((a) => {
  assert.ok(/^[A-Z]{3}$/.test(a[0]) && Math.abs(a[2]) <= 90 && Math.abs(a[3]) <= 180, a[0]);
  assert.ok(COORDS[a[0]]);
});
assert.ok(!AIRLINES.includes("Go First") && !AIRLINES.includes("Vistara"));

console.log("Live weather tests passed.");
