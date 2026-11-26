require("dotenv").config();
const path = require("path");
const express = require("express");
const db = require("./db");
const { predict, validate, validateConditions, bestTimes } = require("./predictor");
const { analyze } = require("./analytics");
const { generate } = require("./demo-data");
const { AIRPORTS } = require("./public/airports");
const weatherService = require("./weather");
const traffic = require("./traffic");
const ml = require("./ml");

// Trained model (optional): created with `npm run train`. Without it the app uses the rule-based model only.
const trainedModel = ml.load();
console.log(trainedModel ? "Trained model loaded (" + trainedModel.metrics.trainRows + " training rows)." : "No trained model found (model/weights.json). Using the rule-based model.");
const KNOWN = new Set(AIRPORTS.map((a) => a[0]));

const app = express();
const PORT = process.env.PORT || 3000;

function readFlight(b) {
  return {
    airline: String(b.airline || "").trim(),
    flight: String(b.flight || "").trim().toUpperCase(),
    origin: String(b.origin || "").trim().toUpperCase(),
    destination: String(b.destination || "").trim().toUpperCase(),
    date: String(b.date || ""),
    time: String(b.time || ""),
    weather: String(b.weather || ""),
    wind: Number(b.wind),
    previousDelay: Number(b.previousDelay),
    traffic: String(b.traffic || ""),
    destWeather: b.destWeather ? String(b.destWeather) : undefined,
  };
}

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: db.enabled, storage: db.enabled ? "database" : "memory" });
});

app.post("/api/predict", async (req, res) => {
  const b = req.body || {};
  const input = readFlight(b);

  const errors = validate(input);
  if (errors.length) return res.status(400).json({ error: errors.join("; ") });

  const result = predict(input);
  if (trainedModel) {
    // Second opinion from the trained model. The main score stays the explainable rule-based one.
    result.trained = { ...ml.predictWith(trainedModel, input), accuracy: Math.round(trainedModel.metrics.trained.accuracy * 100), testRows: trainedModel.metrics.testRows, synthetic: Boolean(trainedModel.synthetic) };
  }

  // The compare page sends save:false so trial runs do not fill the history.
  if (b.save !== false) {
    try {
      await db.savePrediction(input, result);
    } catch (err) {
      // A database problem should not stop the user from seeing their prediction.
      console.error("Could not save prediction:", err.message);
    }
  }

  res.json(result);
});

// Live conditions for the form: forecast weather at the origin (and destination) plus an estimated traffic level.
app.get("/api/conditions", async (req, res) => {
  const origin = String(req.query.origin || "").toUpperCase();
  const dest = String(req.query.destination || "").toUpperCase();
  const date = String(req.query.date || ""), time = String(req.query.time || "");
  if (!KNOWN.has(origin)) return res.status(400).json({ error: "Pick an origin airport from the list so its weather can be looked up." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}$/.test(time)) return res.status(400).json({ error: "Enter the flight date and departure time first." });
  try {
    const [o, d] = await Promise.allSettled([
      weatherService.getAirportWeather(origin, date, time),
      KNOWN.has(dest) ? weatherService.getAirportWeather(dest, date, time) : Promise.resolve(null),
    ]);
    if (o.status === "rejected") return res.status(o.reason.status || 502).json({ error: o.reason.message });
    res.json({
      origin: o.value,
      destination: d.status === "fulfilled" ? d.value : null,
      traffic: traffic.estimate(origin, time),
      source: "Open-Meteo forecast",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load live conditions" });
  }
});

// Summary of the trained model (metrics only).
app.get("/api/model", (req, res) => res.json({ trained: ml.summary(trainedModel) }));

// Risk for every departure hour under the same conditions.
app.post("/api/best-time", (req, res) => {
  const b = req.body || {};
  const input = {
    weather: String(b.weather || ""),
    wind: Number(b.wind),
    previousDelay: Number(b.previousDelay),
    traffic: String(b.traffic || ""),
  };
  const errors = validateConditions(input);
  if (errors.length) return res.status(400).json({ error: errors.join("; ") });
  res.json(bestTimes(input));
});

app.get("/api/predictions", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 1000);
    res.json({ dbEnabled: db.enabled, predictions: await db.recent(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load predictions" });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    res.json((await db.stats()) || { total: 0, avgDelay: 0, avgProbability: 0, low: 0, medium: 0, high: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load stats" });
  }
});

app.get("/api/analytics", async (req, res) => {
  try {
    const rows = await db.recent(1000);
    res.json({ storage: db.enabled ? "database" : "memory", ...analyze(rows) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load analytics" });
  }
});

// Fills an empty dashboard with sample predictions. Refused once real data exists.
app.post("/api/demo-data", async (req, res) => {
  try {
    if ((await db.count()) > 0) {
      return res.status(409).json({ error: "Sample data can only be added to an empty history." });
    }
    const samples = generate(120);
    for (const s of samples) await db.savePrediction(s.input, s.result, s.createdAt);
    res.json({ added: samples.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not add sample data" });
  }
});

app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

db.init()
  .catch((err) => console.error("Database init failed:", err.message))
  .finally(() => {
    app.listen(PORT, () => console.log(`FlightPredict running on http://localhost:${PORT}`));
  });
