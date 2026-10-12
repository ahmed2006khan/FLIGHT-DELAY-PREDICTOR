const { Pool } = require("pg");

let pool = null;
const enabled = Boolean(process.env.DATABASE_URL);

if (enabled) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Render (and most hosted Postgres) require SSL; local Postgres usually doesn't.
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
}

async function init() {
  if (!enabled) {
    console.warn("DATABASE_URL not set: predictions will not be saved.");
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      airline VARCHAR(50) NOT NULL,
      flight VARCHAR(20) NOT NULL,
      origin VARCHAR(4) NOT NULL,
      destination VARCHAR(4) NOT NULL,
      flight_date VARCHAR(10) NOT NULL,
      flight_time VARCHAR(5) NOT NULL,
      weather VARCHAR(10) NOT NULL,
      wind INTEGER NOT NULL,
      previous_delay SMALLINT NOT NULL,
      traffic VARCHAR(10) NOT NULL,
      delay INTEGER NOT NULL,
      probability INTEGER NOT NULL,
      risk VARCHAR(20) NOT NULL,
      risk_class VARCHAR(10) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  console.log("Database ready.");
}

async function savePrediction(i, r) {
  if (!enabled) return null;
  const { rows } = await pool.query(
    `INSERT INTO predictions
      (airline, flight, origin, destination, flight_date, flight_time, weather, wind,
       previous_delay, traffic, delay, probability, risk, risk_class)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
    [i.airline, i.flight, i.origin, i.destination, i.date, i.time, i.weather, i.wind,
     i.previousDelay, i.traffic, r.delay, r.probability, r.risk, r.riskClass]
  );
  return rows[0].id;
}

async function recent(limit = 50) {
  if (!enabled) return [];
  const { rows } = await pool.query(
    "SELECT * FROM predictions ORDER BY created_at DESC LIMIT $1", [limit]);
  return rows;
}

async function stats() {
  if (!enabled) return null;
  const { rows } = await pool.query(`
    SELECT COUNT(*)::int AS total,
           COALESCE(ROUND(AVG(delay)),0)::int AS "avgDelay",
           COALESCE(ROUND(AVG(probability)),0)::int AS "avgProbability",
           COUNT(*) FILTER (WHERE risk_class='low')::int AS low,
           COUNT(*) FILTER (WHERE risk_class='medium')::int AS medium,
           COUNT(*) FILTER (WHERE risk_class='high')::int AS high
    FROM predictions`);
  return rows[0];
}

module.exports = { enabled, init, savePrediction, recent, stats };
