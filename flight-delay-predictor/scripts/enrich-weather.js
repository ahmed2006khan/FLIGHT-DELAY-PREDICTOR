// npm run enrich -- data/flights.csv [data/flights-weather.csv]
//
// Real flight-delay datasets (BTS, Kaggle, DGCA-style tables) usually have no weather.
// This adds `weather` and `wind` columns (and `destWeather` when a `destination` column
// exists) by looking up HISTORICAL weather at each airport from Open-Meteo's free archive.
// Needs internet. Input columns: origin, date (YYYY-MM-DD), hour (0-23) or time (HH:MM),
// delayMinutes, and optionally destination. Airports must be in public/airports.js.
// Then train with:  npm run train -- data/flights-weather.csv
const fs = require("fs");
const csv = require("./csv");
const { COORDS, HOURLY, summarize } = require("../weather");

const [input, output = input.replace(/\.csv$/i, "") + "-weather.csv"] = process.argv.slice(2);
if (!input) { console.error("Usage: npm run enrich -- flights.csv [out.csv]"); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const addDays = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

async function archive(code, start, end) {
  const c = COORDS[code];
  const merged = { hourly: { time: [], weather_code: [], wind_speed_10m: [], visibility: [], precipitation: [], temperature_2m: [] } };
  for (let s = start; s <= end; s = addDays(s, 366)) {                 // one request per year of data
    const e = addDays(s, 365) < end ? addDays(s, 365) : end;
    const url = "https://archive-api.open-meteo.com/v1/archive?latitude=" + c.lat + "&longitude=" + c.lon +
      "&start_date=" + s + "&end_date=" + e + "&hourly=" + HOURLY + "&timezone=auto";
    let res = await fetch(url);
    if (res.status === 429) { await sleep(15000); res = await fetch(url); }
    if (!res.ok) throw new Error(code + ": archive request failed (" + res.status + ")");
    const h = (await res.json()).hourly;
    for (const k of Object.keys(merged.hourly)) merged.hourly[k].push(...(h[k] || []));
    await sleep(400);
  }
  return merged;
}

(async () => {
  const { rows, header } = csv.parse(fs.readFileSync(input, "utf8"));
  const hourOf = (r) => (r.hour !== undefined && r.hour !== "" ? String(Number(r.hour)).padStart(2, "0") : String(r.time || "").slice(0, 2).padStart(2, "0")) + ":00";
  const hasDest = header.includes("destination");

  const need = {};   // airport -> [min date, max date]
  const note = (code, date) => { if (!COORDS[code] || !date) return; const n = need[code] || (need[code] = [date, date]); if (date < n[0]) n[0] = date; if (date > n[1]) n[1] = date; };
  rows.forEach((r) => { note((r.origin || "").toUpperCase(), r.date); if (hasDest) note((r.destination || "").toUpperCase(), r.date); });

  const data = {};
  for (const code of Object.keys(need)) {
    console.log("Fetching " + code + " " + need[code][0] + " to " + need[code][1]);
    data[code] = await archive(code, need[code][0], need[code][1]);
  }

  const out = [];
  let missing = 0;
  for (const r of rows) {
    const o = (r.origin || "").toUpperCase(), d = (r.destination || "").toUpperCase();
    const w = data[o] && summarize(data[o], r.date, hourOf(r));
    if (!w) { missing++; continue; }
    const row = { ...r, weather: w.weather, wind: w.wind };
    if (hasDest) { const dw = data[d] && summarize(data[d], r.date, hourOf(r)); row.destWeather = dw ? dw.weather : ""; }
    out.push(row);
  }
  const outHeader = header.filter((h) => h !== "weather" && h !== "wind" && h !== "destWeather").concat(["weather", "wind"], hasDest ? ["destWeather"] : []);
  fs.writeFileSync(output, csv.stringify(outHeader, out));
  console.log("Wrote " + out.length + " rows to " + output + " (" + missing + " rows skipped: unknown airport or no weather for that hour).");
})().catch((e) => { console.error(e.message); process.exit(1); });
