// npm run train -- data/flights.csv [--epochs 1500] [--out model/weights.json]
//
// Columns (header names, any order):
//   required : weather (clear|cloudy|rain|fog|storm), wind (km/h), delayMinutes, and hour (0-23) or time (HH:MM)
//   optional : traffic (low|medium|high)  - if missing it is estimated from `origin` and the hour
//              previousDelay (0|1|2) or previousDelayMinutes (<=15 -> 0, <=45 -> 1, more -> 2)
//              destWeather (same values as weather)
const fs = require("fs");
const path = require("path");
const ml = require("../ml");
const csv = require("./csv");
const traffic = require("../traffic");
const { WEATHER, TRAFFIC } = require("../predictor");

const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : def; };
const file = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!file) { console.error("Usage: npm run train -- path/to/flights.csv"); process.exit(1); }

const { rows: raw, header, comments } = csv.parse(fs.readFileSync(file, "utf8"));
for (const col of ["weather", "wind", "delayMinutes"]) {
  if (!header.includes(col)) { console.error("Missing required column: " + col); process.exit(1); }
}
if (!header.includes("hour") && !header.includes("time")) { console.error("Need an `hour` or `time` column."); process.exit(1); }

let skipped = 0;
const rows = [];
for (const r of raw) {
  const hour = r.hour !== undefined && r.hour !== "" ? Number(r.hour) : Number(String(r.time || "").slice(0, 2));
  const wind = Number(r.wind), delayMinutes = Number(r.delayMinutes);
  const time = Number.isFinite(hour) ? String(hour).padStart(2, "0") + ":00" : "";
  let prev = 0;
  if (r.previousDelayMinutes !== undefined && r.previousDelayMinutes !== "") { const m = Number(r.previousDelayMinutes); prev = m <= 15 ? 0 : m <= 45 ? 1 : 2; }
  else if (r.previousDelay !== undefined && r.previousDelay !== "") prev = Number(r.previousDelay);
  const tr = r.traffic || (r.origin ? traffic.estimate(r.origin, time).level : "medium");
  const ok = r.weather in WEATHER && tr in TRAFFIC && Number.isFinite(wind) && Number.isFinite(delayMinutes) && Number.isFinite(hour) && hour >= 0 && hour <= 23 && [0, 1, 2].includes(prev);
  if (!ok) { skipped++; continue; }
  rows.push({ weather: r.weather, wind, traffic: tr, previousDelay: prev, time, destWeather: r.destWeather in WEATHER ? r.destWeather : undefined, delayMinutes });
}

const model = ml.train(rows, { epochs: Number(flag("epochs", 1500)) });
model.source = path.basename(file);
model.synthetic = comments.some((c) => /SYNTHETIC/i.test(c));
ml.save(model, flag("out", ml.WEIGHTS_FILE));

const m = model.metrics, pct = (v) => (v === null ? "n/a" : (v * 100).toFixed(1) + "%");
console.log(`Rows used: ${rows.length} (skipped ${skipped}); train ${m.trainRows} / test ${m.testRows}; delayed share ${pct(m.delayedShare)}`);
console.log(`Always-guess-majority accuracy : ${pct(m.majorityBaselineAccuracy)}`);
console.log(`Rule-based model   accuracy ${pct(m.ruleBased.accuracy)}  AUC ${m.ruleBased.auc === null ? "n/a" : m.ruleBased.auc.toFixed(3)}`);
console.log(`Trained model      accuracy ${pct(m.trained.accuracy)}  AUC ${m.trained.auc === null ? "n/a" : m.trained.auc.toFixed(3)}  F1 ${pct(m.trained.f1)}  MAE ${m.trained.maeMinutes.toFixed(1)} min`);
if (model.synthetic) console.log("\nNOTE: this file is marked SYNTHETIC. These numbers only prove the code runs.");
console.log("Saved " + flag("out", ml.WEIGHTS_FILE));
