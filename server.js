require("dotenv").config();
const path = require("path");
const express = require("express");
const db = require("./db");
const { predict, validate } = require("./predictor");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: db.enabled });
});

app.post("/api/predict", async (req, res) => {
  const b = req.body || {};
  const input = {
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
  };

  const errors = validate(input);
  if (errors.length) return res.status(400).json({ error: errors.join("; ") });

  const result = predict(input);

  try {
    await db.savePrediction(input, result);
  } catch (err) {
    // A database problem should not stop the user from seeing their prediction.
    console.error("Could not save prediction:", err.message);
  }

  res.json(result);
});

app.get("/api/predictions", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
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

app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

db.init()
  .catch((err) => console.error("Database init failed:", err.message))
  .finally(() => {
    app.listen(PORT, () => console.log(`FlightPredict running on http://localhost:${PORT}`));
  });
