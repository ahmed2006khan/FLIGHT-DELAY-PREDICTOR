// Scoring model. Weights match the "How it works", "Weather", and "Wind" pages.
const WEATHER = { clear: 0, cloudy: 8, rain: 20, fog: 28, storm: 35 };   // up to 35
const TRAFFIC = { low: 3, medium: 12, high: 25 };                         // up to 25
const PREVIOUS = [0, 10, 20];                                             // up to 20

const FACTOR_LABELS = {
  weather: "Weather",
  traffic: "Airport traffic",
  wind: "Wind speed",
  previous: "Inbound delay",
  time: "Time of day",
  destination: "Destination weather",
};
const FACTOR_MAX = { weather: 35, traffic: 25, wind: 18, previous: 20, time: 8, destination: 10 };

function windImpact(kmh) {                                                // up to 18
  if (kmh < 20) return 0;
  if (kmh < 30) return 5;
  if (kmh <= 50) return 10;
  return 18;
}

// Typical airport congestion by departure hour (0-23): morning and evening banks
// are busiest. Up to 8 points. Returns 0 when no usable time is given, so
// callers that do not pass a time get the original four-factor score.
function timeImpact(time) {                                               // up to 8
  const hour = parseHour(time);
  if (hour === null) return 0;
  if ((hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 21)) return 8;
  if ((hour >= 10 && hour <= 16)) return 3;
  return 0;                                                               // late night / early morning
}

function parseHour(time) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(time || ""));
  if (!m) return null;
  const h = Number(m[1]);
  return h >= 0 && h <= 23 ? h : null;
}

// Points each factor adds to the delay score.
function factors({ weather, wind, previousDelay, traffic, time, destWeather }) {
  return {
    weather: WEATHER[weather] || 0,
    traffic: TRAFFIC[traffic] || 0,
    wind: windImpact(wind),
    previous: PREVIOUS[previousDelay] || 0,
    time: timeImpact(time),
    destination: Math.round(((WEATHER[destWeather] || 0) * 10) / 35),   // up to 10, only when destination weather is known
  };
}

function classify(probability) {
  if (probability >= 65) return { risk: "HIGH RISK", riskClass: "high" };
  if (probability >= 35) return { risk: "MEDIUM RISK", riskClass: "medium" };
  return { risk: "LOW RISK", riskClass: "low" };
}

// How far the score sits from the nearest risk boundary (35 or 65), scaled to
// 60-98%. A score right on a boundary could easily tip into the next class.
function confidence(probability) {
  const distance = Math.min(Math.abs(probability - 35), Math.abs(probability - 65));
  return Math.min(98, Math.round(60 + distance * 2.5));
}

function tips(input, f) {
  const out = [];
  if (f.weather >= 28) out.push("Severe weather expected: check your airline's app before leaving for the airport.");
  else if (f.weather >= 20) out.push("Rain can slow ground operations. Allow extra time for the journey.");
  if (f.wind >= 10) out.push("Strong winds can affect take-off and landing slots.");
  if (f.traffic >= 25) out.push("The airport is busy. Reach early and keep boarding documents ready.");
  if (f.previous >= 10) out.push("The aircraft is arriving late from its previous flight, so a late departure is likely.");
  if (f.destination >= 6) out.push("Poor weather at your destination can delay arrival slots or cause holding. Check the destination forecast too.");
  if (f.time >= 8) out.push("This is a peak departure hour. An off-peak slot may be calmer.");
  if (!out.length) out.push("Conditions look good. Arrive at the usual time and keep an eye on flight updates.");
  return out;
}

function predict(input) {
  const f = factors(input);
  const score = f.weather + f.traffic + f.wind + f.previous + f.time + f.destination;

  const probability = Math.min(98, Math.max(2, Math.round(score)));
  const delay = probability < 20
    ? Math.round(probability * 0.3)
    : Math.round(probability * 0.9 + input.previousDelay * 8);

  const { risk, riskClass } = classify(probability);
  return {
    delay,
    probability,
    risk,
    riskClass,
    confidence: confidence(probability),
    factors: Object.keys(f).map((key) => ({
      key,
      label: FACTOR_LABELS[key],
      points: f[key],
      max: FACTOR_MAX[key],
    })),
    tips: tips(input, f),
  };
}

// Risk for every departure hour with the same conditions, plus the best slots.
function bestTimes(input) {
  const hours = [];
  for (let h = 0; h < 24; h++) {
    const time = String(h).padStart(2, "0") + ":00";
    const r = predict({ ...input, time });
    hours.push({ hour: h, time, probability: r.probability, delay: r.delay, riskClass: r.riskClass });
  }
  const min = Math.min(...hours.map((h) => h.probability));
  const best = hours.filter((h) => h.probability === min);
  return { hours, bestProbability: min, best };
}

function validate(b) {
  const errors = [];
  if (!b.airline) errors.push("airline is required");
  if (!b.flight) errors.push("flight is required");
  if (!/^[A-Z]{3,4}$/.test(b.origin || "")) errors.push("origin must be a 3-4 letter airport code");
  if (!/^[A-Z]{3,4}$/.test(b.destination || "")) errors.push("destination must be a 3-4 letter airport code");
  if (!b.date) errors.push("date is required");
  if (!b.time) errors.push("time is required");
  if (!(b.weather in WEATHER)) errors.push("weather must be clear, cloudy, rain, storm or fog");
  if (!(b.traffic in TRAFFIC)) errors.push("traffic must be low, medium or high");
  if (typeof b.wind !== "number" || isNaN(b.wind) || b.wind < 0 || b.wind > 300)
    errors.push("wind must be a number between 0 and 300");
  if (![0, 1, 2].includes(b.previousDelay)) errors.push("previousDelay must be 0, 1 or 2");
  if (b.destWeather && !(b.destWeather in WEATHER)) errors.push("destWeather must be clear, cloudy, rain, storm or fog");
  return errors;
}

// For the planner: same checks but flight details and time are not needed.
function validateConditions(b) {
  const errors = [];
  if (!(b.weather in WEATHER)) errors.push("weather must be clear, cloudy, rain, storm or fog");
  if (!(b.traffic in TRAFFIC)) errors.push("traffic must be low, medium or high");
  if (typeof b.wind !== "number" || isNaN(b.wind) || b.wind < 0 || b.wind > 300)
    errors.push("wind must be a number between 0 and 300");
  if (![0, 1, 2].includes(b.previousDelay)) errors.push("previousDelay must be 0, 1 or 2");
  return errors;
}

module.exports = {
  predict, validate, validateConditions, windImpact, timeImpact, factors, bestTimes,
  classify, confidence, FACTOR_LABELS, FACTOR_MAX, WEATHER, TRAFFIC,
};
