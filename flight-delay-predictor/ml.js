// Trained models, no extra packages needed:
//  - logistic regression -> chance the flight is delayed by 15 minutes or more
//  - ridge linear regression -> expected delay in minutes
// Train them with `npm run train -- your-data.csv`; the weights are saved to
// model/weights.json and loaded by the server at start-up.
const fs = require("fs");
const path = require("path");
const { WEATHER, TRAFFIC, classify, predict: ruleBased } = require("./predictor");

const WEIGHTS_FILE = path.join(__dirname, "model", "weights.json");
const DELAY_MINUTES = 15;   // "delayed" means at least this many minutes
const FEATURES = ["cloudy", "rain", "fog", "storm", "traffic_medium", "traffic_high", "wind", "inbound_delay", "peak_hour", "midday", "destination_weather"];

function hourOf(r) {
  if (typeof r.hour === "number") return r.hour;
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(r.time || ""));
  return m ? Number(m[1]) : null;
}

function featurize(r) {
  const h = hourOf(r);
  return [
    r.weather === "cloudy" ? 1 : 0, r.weather === "rain" ? 1 : 0, r.weather === "fog" ? 1 : 0, r.weather === "storm" ? 1 : 0,
    r.traffic === "medium" ? 1 : 0, r.traffic === "high" ? 1 : 0,
    Math.min(Number(r.wind) || 0, 100) / 50,
    (Number(r.previousDelay) || 0) / 2,
    h !== null && ((h >= 6 && h <= 9) || (h >= 17 && h <= 21)) ? 1 : 0,
    h !== null && h >= 10 && h <= 16 ? 1 : 0,
    (WEATHER[r.destWeather] || 0) / 35,
  ];
}

const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const dot = (w, x, b) => { let s = b; for (let j = 0; j < w.length; j++) s += w[j] * x[j]; return s; };

// ---------- training ----------
function trainLogistic(X, y, { epochs = 1500, lr = 0.5, l2 = 0.001 } = {}) {
  const n = X.length, d = X[0].length;
  const w = new Array(d).fill(0);
  let b = 0;
  for (let e = 0; e < epochs; e++) {
    const gw = new Array(d).fill(0);
    let gb = 0;
    for (let i = 0; i < n; i++) {
      const err = sigmoid(dot(w, X[i], b)) - y[i];
      gb += err;
      for (let j = 0; j < d; j++) gw[j] += err * X[i][j];
    }
    for (let j = 0; j < d; j++) w[j] -= lr * (gw[j] / n + l2 * w[j]);
    b -= lr * (gb / n);
  }
  return { w, b };
}

// Ridge regression solved exactly (normal equations + Gaussian elimination).
function trainLinear(X, y, l2 = 1) {
  const d = X[0].length + 1;
  const A = Array.from({ length: d }, () => new Array(d + 1).fill(0));
  for (let i = 0; i < X.length; i++) {
    const v = [...X[i], 1];
    for (let r = 0; r < d; r++) {
      for (let c = 0; c < d; c++) A[r][c] += v[r] * v[c];
      A[r][d] += v[r] * y[i];
    }
  }
  for (let r = 0; r < d - 1; r++) A[r][r] += l2;             // no penalty on the intercept
  for (let c = 0; c < d; c++) {
    let p = c;
    for (let r = c + 1; r < d; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < d; r++) {
      if (r === c || A[c][c] === 0) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k <= d; k++) A[r][k] -= f * A[c][k];
    }
  }
  const sol = A.map((row, i) => (row[i] ? row[d] / row[i] : 0));
  return { w: sol.slice(0, d - 1), b: sol[d - 1] };
}

// ---------- evaluation ----------
function auc(scores, labels) {
  const idx = scores.map((_, i) => i).sort((a, b) => scores[a] - scores[b]);
  const ranks = new Array(scores.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && scores[idx[j + 1]] === scores[idx[i]]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[idx[k]] = avg;
    i = j + 1;
  }
  let pos = 0, rankSum = 0;
  labels.forEach((l, i) => { if (l === 1) { pos++; rankSum += ranks[i]; } });
  const neg = labels.length - pos;
  return pos && neg ? (rankSum - (pos * (pos + 1)) / 2) / (pos * neg) : null;
}

function binaryMetrics(probs, labels) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  probs.forEach((p, i) => {
    const pred = p >= 0.5 ? 1 : 0;
    if (pred && labels[i]) tp++; else if (pred && !labels[i]) fp++; else if (!pred && labels[i]) fn++; else tn++;
  });
  const precision = tp + fp ? tp / (tp + fp) : 0, recall = tp + fn ? tp / (tp + fn) : 0;
  return {
    accuracy: (tp + tn) / labels.length, precision, recall,
    f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0,
    auc: auc(probs, labels),
  };
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function split(rows, testFraction = 0.2, seed = 7) {
  const rand = mulberry32(seed), a = rows.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  const nTest = Math.max(1, Math.round(a.length * testFraction));
  return { test: a.slice(0, nTest), train: a.slice(nTest) };
}

// rows: [{ weather, wind, traffic, previousDelay, time|hour, destWeather?, delayMinutes }]
function train(rows, options = {}) {
  if (rows.length < 50) throw new Error("Need at least 50 rows to train (got " + rows.length + ").");
  const { train: tr, test: te } = split(rows, options.testFraction, options.seed);
  const X = tr.map(featurize), yBin = tr.map((r) => (r.delayMinutes >= DELAY_MINUTES ? 1 : 0));
  const yMin = tr.map((r) => Math.min(Math.max(r.delayMinutes, 0), 300));
  const logistic = trainLogistic(X, yBin, options);
  const linear = trainLinear(X, yMin);

  const Xt = te.map(featurize), yt = te.map((r) => (r.delayMinutes >= DELAY_MINUTES ? 1 : 0));
  const probs = Xt.map((x) => sigmoid(dot(logistic.w, x, logistic.b)));
  const model = metricsOf(probs, yt, te, linear, Xt);
  const posRate = yt.reduce((s, v) => s + v, 0) / yt.length;
  const ruleProbs = te.map((r) => ruleBased({ ...r, previousDelay: r.previousDelay || 0 }).probability / 100);
  const rule = binaryMetrics(ruleProbs, yt);
  return {
    version: 1,
    trainedAt: new Date().toISOString(),
    delayThresholdMinutes: DELAY_MINUTES,
    features: FEATURES,
    logistic, linear,
    metrics: {
      trainRows: tr.length, testRows: te.length, delayedShare: posRate,
      majorityBaselineAccuracy: Math.max(posRate, 1 - posRate),
      trained: model, ruleBased: rule,
    },
  };
}

function metricsOf(probs, labels, rows, linear, Xt) {
  const m = binaryMetrics(probs, labels);
  m.maeMinutes = rows.reduce((s, r, i) => s + Math.abs(Math.max(0, dot(linear.w, Xt[i], linear.b)) - r.delayMinutes), 0) / rows.length;
  return m;
}

// ---------- using a trained model ----------
function predictWith(model, input) {
  const x = featurize(input);
  const p = sigmoid(dot(model.logistic.w, x, model.logistic.b));
  const probability = Math.min(98, Math.max(2, Math.round(p * 100)));
  const delay = Math.max(0, Math.round(dot(model.linear.w, x, model.linear.b)));
  return { probability, delay, riskClass: classify(probability).riskClass };
}

function save(model, file = WEIGHTS_FILE) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(model, null, 2));
}

function load(file = WEIGHTS_FILE) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return null; }
}

// Short, safe summary for the web page (no weights).
function summary(model) {
  if (!model) return null;
  const { trainedAt, delayThresholdMinutes, metrics, source, synthetic } = model;
  return { trainedAt, delayThresholdMinutes, metrics, source: source || null, synthetic: Boolean(synthetic) };
}

module.exports = { FEATURES, DELAY_MINUTES, featurize, train, predictWith, save, load, summary, auc, WEIGHTS_FILE, TRAFFIC };
