// Turns saved prediction rows (database column names) into dashboard numbers.
const { factors, FACTOR_LABELS } = require("./predictor");

const PREV_INDEX = { 0: 0, 1: 1, 2: 2 };

function round1(n) { return Math.round(n * 10) / 10; }
function avg(list) { return list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0; }

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return map;
}

function summarize(name, list) {
  return {
    name,
    count: list.length,
    avgProbability: Math.round(avg(list.map((r) => r.probability))),
    avgDelay: Math.round(avg(list.map((r) => r.delay))),
  };
}

function analyze(rows, now = Date.now()) {
  const total = rows.length;
  const riskCounts = { low: 0, medium: 0, high: 0 };
  rows.forEach((r) => { if (riskCounts[r.risk_class] !== undefined) riskCounts[r.risk_class]++; });

  const dayAgo = now - 24 * 3600 * 1000;
  const highLast24h = rows.filter(
    (r) => r.risk_class === "high" && new Date(r.created_at).getTime() >= dayAgo
  ).length;

  // Delay trend: average probability per flight date, latest 14 dates that have data.
  const byDate = groupBy(rows, (r) => r.flight_date);
  const trend = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([date, list]) => ({
      date,
      count: list.length,
      avgProbability: Math.round(avg(list.map((r) => r.probability))),
    }));

  const byAirline = [...groupBy(rows, (r) => r.airline).entries()]
    .map(([name, list]) => summarize(name, list))
    .sort((a, b) => b.avgProbability - a.avgProbability);

  const byOrigin = [...groupBy(rows, (r) => r.origin).entries()]
    .map(([name, list]) => summarize(name, list))
    .sort((a, b) => b.count - a.count || b.avgProbability - a.avgProbability)
    .slice(0, 8);

  const hourBuckets = Array.from({ length: 24 }, () => []);
  rows.forEach((r) => {
    const h = parseInt(String(r.flight_time).slice(0, 2), 10);
    if (h >= 0 && h <= 23) hourBuckets[h].push(r.probability);
  });
  const byHour = hourBuckets.map((list, hour) => ({
    hour,
    count: list.length,
    avgProbability: list.length ? Math.round(avg(list)) : null,
  }));

  // Delay causes: share of all score points contributed by each factor.
  const totals = { weather: 0, traffic: 0, wind: 0, previous: 0, time: 0 };
  rows.forEach((r) => {
    const f = factors({
      weather: r.weather,
      wind: Number(r.wind),
      previousDelay: PREV_INDEX[r.previous_delay] ?? 0,
      traffic: r.traffic,
      time: r.flight_time,
    });
    Object.keys(totals).forEach((k) => { totals[k] += f[k]; });
  });
  const pointSum = Object.values(totals).reduce((a, b) => a + b, 0);
  const causes = Object.keys(totals)
    .map((key) => ({
      key,
      label: FACTOR_LABELS[key],
      share: pointSum ? Math.round((totals[key] / pointSum) * 100) : 0,
    }))
    .sort((a, b) => b.share - a.share);

  return {
    total,
    avgDelay: Math.round(avg(rows.map((r) => r.delay))),
    avgProbability: Math.round(avg(rows.map((r) => r.probability))),
    likelyOnTime: total ? round1((riskCounts.low / total) * 100) : 0,
    highLast24h,
    riskCounts,
    trend,
    byAirline,
    byOrigin,
    byHour,
    causes,
    recent: rows.slice(0, 8),
  };
}

module.exports = { analyze };
