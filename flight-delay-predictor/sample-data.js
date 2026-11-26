// SYNTHETIC flights for testing the training pipeline. The delays come from a
// made-up formula, not from real flights, so a model trained on this proves the
// code works but says nothing about real delays. Use real data for your report.
const WEATHERS = ["clear", "cloudy", "rain", "fog", "storm"];
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function generate(n = 5000, seed = 1) {
  const rand = mulberry32(seed), pick = (l) => l[Math.floor(rand() * l.length)];
  const eff = { clear: 0, cloudy: 0.3, rain: 1.0, fog: 1.4, storm: 2.0 };
  const rows = [];
  for (let i = 0; i < n; i++) {
    const weather = pick(WEATHERS), traffic = pick(["low", "medium", "high"]), destWeather = pick(WEATHERS);
    const wind = Math.round(rand() * 60), previousDelay = Math.floor(rand() * 3), hour = Math.floor(rand() * 24);
    const peak = (hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 21) ? 1 : 0;
    const logit = -3.6 + eff[weather] + 0.5 * eff[destWeather] + { low: 0, medium: 0.4, high: 0.9 }[traffic]
      + wind / 40 + 0.8 * previousDelay + 0.5 * peak + (rand() - 0.5) * 1.2;
    const delayed = rand() < 1 / (1 + Math.exp(-logit));
    const delayMinutes = delayed ? Math.round(15 + -Math.log(1 - rand()) * (15 + 10 * previousDelay)) : Math.round(rand() * 10);
    rows.push({ origin: pick(["DEL", "BOM", "BLR", "HYD", "PNQ", "GOI"]), weather, wind, traffic, previousDelay, hour, destWeather, delayMinutes });
  }
  return rows;
}
module.exports = { generate };
