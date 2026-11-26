const { Pool } = require("pg");

let pool = null;
const enabled = Boolean(process.env.DATABASE_URL);

// Without DATABASE_URL the app keeps the latest predictions in memory so the
// dashboard and history still work. They are lost when the server restarts.
const MEMORY_LIMIT = 1000;
const memory = [];
let memoryId = 1;

if (enabled) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Render (and most hosted Postgres) require SSL; local Postgres usually doesn't.
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
}

async function init() {
  if (!enabled) {
    console.warn("DATABASE_URL not set: predictions are kept in memory only.");
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

// createdAt is optional and only used when loading sample data.
async function savePrediction(i, r, createdAt) {
  if (!enabled) {
    memory.unshift({
      id: memoryId++,
      airline: i.airline, flight: i.flight, origin: i.origin, destination: i.destination,
      flight_date: i.date, flight_time: i.time, weather: i.weather, wind: i.wind,
      previous_delay: i.previousDelay, traffic: i.traffic,
      delay: r.delay, probability: r.probability, risk: r.risk, risk_class: r.riskClass,
      created_at: (createdAt || new Date()).toISOString(),
    });
    if (memory.length > MEMORY_LIMIT) memory.length = MEMORY_LIMIT;
    return memoryId - 1;
  }
  const { rows } = await pool.query(
    `INSERT INTO predictions
      (airline, flight, origin, destination, flight_date, flight_time, weather, wind,
       previous_delay, traffic, delay, probability, risk, risk_class, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,COALESCE($15, NOW())) RETURNING id`,
    [i.airline, i.flight, i.origin, i.destination, i.date, i.time, i.weather, i.wind,
     i.previousDelay, i.traffic, r.delay, r.probability, r.risk, r.riskClass, createdAt || null]
  );
  return rows[0].id;
}

async function recent(limit = 50) {
  if (!enabled) {
    return memory
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
      .slice(0, limit);
  }
  const { rows } = await pool.query(
    "SELECT * FROM predictions ORDER BY created_at DESC, id DESC LIMIT $1", [limit]);
  return rows;
}

async function count() {
  if (!enabled) return memory.length;
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM predictions");
  return rows[0].n;
}

async function stats() {
  if (!enabled) {
    const total = memory.length;
    const avg = (k) => (total ? Math.round(memory.reduce((s, r) => s + r[k], 0) / total) : 0);
    const by = (c) => memory.filter((r) => r.risk_class === c).length;
    return { total, avgDelay: avg("delay"), avgProbability: avg("probability"),
             low: by("low"), medium: by("medium"), high: by("high") };
  }
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

module.exports = { enabled, init, savePrediction, recent, count, stats };
