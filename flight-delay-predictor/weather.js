// Live weather for an airport at a given date and hour, from Open-Meteo
// (free, no API key). The pure helpers (mapCode, pickHour, summarize) are
// separate from the network call so they can be tested offline.
const { AIRPORTS } = require("./public/airports");

const COORDS = Object.fromEntries(AIRPORTS.map((a) => [a[0], { code: a[0], name: a[1], lat: a[2], lon: a[3] }]));
const HOURLY = "weather_code,wind_speed_10m,visibility,precipitation,temperature_2m";
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();   // airport code -> { at, data }

// Open-Meteo WMO weather code -> the five categories the predictor understands.
function mapCode(code, visibilityM) {
  let w;
  if (code >= 95) w = "storm";
  else if (code === 45 || code === 48) w = "fog";
  else if ((code >= 51 && code <= 67) || (code >= 71 && code <= 77) || (code >= 80 && code <= 86)) w = "rain"; // rain, drizzle, snow, showers
  else if (code === 2 || code === 3) w = "cloudy";
  else w = "clear";
  // Very low visibility counts as fog even when the code says otherwise (but never hides a storm).
  if (w !== "storm" && typeof visibilityM === "number" && visibilityM < 1000) w = "fog";
  return w;
}

// Index of the hour matching `date` (YYYY-MM-DD) and `time` (HH:MM) in an Open-Meteo hourly block.
function pickHour(hourly, date, time) {
  const hh = String(time || "").slice(0, 2).padStart(2, "0");
  return (hourly.time || []).indexOf(`${date}T${hh}:00`);
}

function summarize(payload, date, time) {
  const h = payload && payload.hourly;
  if (!h) return null;
  const i = pickHour(h, date, time);
  if (i < 0) return null;
  const vis = h.visibility ? h.visibility[i] : null;
  const wind = Math.round(h.wind_speed_10m[i] || 0);
  return {
    weather: mapCode(h.weather_code[i], vis),
    wind,
    visibilityKm: typeof vis === "number" ? Math.round(vis / 100) / 10 : null,
    precipitationMm: h.precipitation ? h.precipitation[i] : null,
    tempC: h.temperature_2m ? Math.round(h.temperature_2m[i]) : null,
    code: h.weather_code[i],
    hour: h.time[i],
  };
}

async function loadForecast(c) {
  const hit = cache.get(c.code);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + c.lat + "&longitude=" + c.lon +
    "&hourly=" + HOURLY + "&past_days=1&forecast_days=16&timezone=auto";
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch (e) {
    const err = new Error("The weather service did not respond. Try again in a moment.");
    err.status = 502; throw err;
  }
  if (!res.ok) { const err = new Error("The weather service returned an error (" + res.status + ")."); err.status = 502; throw err; }
  const data = await res.json();
  cache.set(c.code, { at: Date.now(), data });
  return data;
}

async function getAirportWeather(code, date, time) {
  const c = COORDS[String(code || "").toUpperCase()];
  if (!c) { const err = new Error("Unknown airport code: " + code); err.status = 400; throw err; }
  const data = await loadForecast(c);
  const s = summarize(data, date, time);
  if (!s) {
    const err = new Error("No forecast for that date and time. Forecasts cover about the next 15 days.");
    err.status = 422; throw err;
  }
  return { airport: c.code, name: c.name, ...s };
}

module.exports = { COORDS, HOURLY, mapCode, pickHour, summarize, getAirportWeather };
