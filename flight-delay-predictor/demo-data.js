// Sample predictions so a new dashboard is not empty (used by POST /api/demo-data).
const { predict } = require("./predictor");

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AIRLINES = [
  { name: "IndiGo", code: "6E" }, { name: "Air India", code: "AI" }, { name: "Akasa Air", code: "QP" },
  { name: "SpiceJet", code: "SG" }, { name: "Emirates", code: "EK" },
];
const ROUTES = [
  ["BLR", "DEL"], ["DEL", "BOM"], ["BOM", "BLR"], ["HYD", "BLR"], ["MAA", "DEL"],
  ["CCU", "BOM"], ["BLR", "GOI"], ["DEL", "DXB"], ["PNQ", "DEL"], ["AMD", "BOM"],
];
const pick = (rand, list) => list[Math.floor(rand() * list.length)];
function weighted(rand, entries) {
  let r = rand() * entries.reduce((s, e) => s + e[1], 0);
  for (const [value, w] of entries) { if ((r -= w) <= 0) return value; }
  return entries[0][0];
}

function generate(n = 120, now = new Date(), seed = 42) {
  const rand = mulberry32(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const airline = pick(rand, AIRLINES);
    const [origin, destination] = pick(rand, ROUTES);
    const daysAgo = Math.floor(rand() * 14);
    const hour = Math.floor(rand() * 18) + 5;
    const flightDate = new Date(now.getTime() - daysAgo * 86400000);
    const createdAt = new Date(now.getTime() - Math.floor(rand() * 13 * 86400000));
    const input = {
      airline: airline.name,
      flight: airline.code + (100 + Math.floor(rand() * 900)),
      origin, destination,
      date: flightDate.toISOString().slice(0, 10),
      time: String(hour).padStart(2, "0") + ":" + pick(rand, ["00", "15", "30", "45"]),
      weather: weighted(rand, [["clear", 40], ["cloudy", 25], ["rain", 20], ["fog", 8], ["storm", 7]]),
      wind: Math.floor(rand() * 55),
      previousDelay: weighted(rand, [[0, 60], [1, 28], [2, 12]]),
      traffic: weighted(rand, [["low", 25], ["medium", 45], ["high", 30]]),
    };
    out.push({ input, result: predict(input), createdAt });
  }
  return out;
}

module.exports = { generate };
