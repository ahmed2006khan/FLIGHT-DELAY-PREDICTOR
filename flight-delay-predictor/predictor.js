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

function monthOf(dateStr) {
  const m = /^(\d{4})-(\d{2})/.exec(String(dateStr || ""));
  return m ? Number(m[2]) : null;
}

// Simple seasonality flags for India-centric routes (monsoon, winter fog, festival peaks).
function seasonFlags(dateStr) {
  const m = monthOf(dateStr);
  if (!m) return [];
  const flags = [];
  if (m >= 6 && m <= 9) flags.push("monsoon");
  if (m === 12 || m === 1 || m === 2) flags.push("winter-fog");
  if (m === 10 || m === 11) flags.push("festival");
  return flags;
}

function tips(input, f) {
  const out = [];
  const season = seasonFlags(input.date);
  if (f.weather >= 28) out.push("Severe weather expected: check your airline's app before leaving for the airport.");
  else if (f.weather >= 20) out.push("Rain can slow ground operations. Allow extra time for the journey.");
  if (f.wind >= 10) out.push("Strong winds can affect take-off and landing slots.");
  if (f.traffic >= 25) out.push("The airport is busy. Reach early and keep boarding documents ready.");
  if (f.previous >= 10) out.push("The aircraft is arriving late from its previous flight, so a late departure is likely.");
  if (f.destination >= 6) out.push("Poor weather at your destination can delay arrival slots or cause holding. Check the destination forecast too.");
  if (f.time >= 8) out.push("This is a peak departure hour. An off-peak slot may be calmer.");
  if (season.includes("monsoon") && f.weather >= 8) out.push("Monsoon season: expect sudden showers and slower ground handling even when the sky looks only cloudy.");
  if (season.includes("winter-fog") && (input.weather === "fog" || input.weather === "cloudy")) out.push("Winter fog season in northern India often causes long ATC holds. Keep plans flexible.");
  if (season.includes("festival")) out.push("Festival travel peak: airports and security lines are busier than usual — arrive earlier.");
  if (!out.length) out.push("Conditions look good. Arrive at the usual time and keep an eye on flight updates.");
  return out;
}

// Short contextual suggestions shown in the suggestion strip.
// Uses a lightweight score (no recursion into full predict/bestTimes).
function suggestions(input, result) {
  const items = [];
  const f = factors(input);
  const hour = parseHour(input.time);
  if (result.probability >= 50 && hour !== null) {
    // Evaluate nearby hours with the same conditions (inline, no full bestTimes).
    const nearby = [];
    for (let h = Math.max(0, hour - 3); h <= Math.min(23, hour + 3); h++) {
      if (h === hour) continue;
      const t = String(h).padStart(2, "0") + ":00";
      const ff = factors({ ...input, time: t });
      const sc = ff.weather + ff.traffic + ff.wind + ff.previous + ff.time + ff.destination;
      const p = Math.min(98, Math.max(2, Math.round(sc)));
      if (p < result.probability - 8) nearby.push({ time: t, probability: p });
    }
    nearby.sort((a, b) => a.probability - b.probability).slice(0, 2).forEach((h) => {
      items.push({
        type: "alt-time",
        text: "Try " + h.time + " instead — about " + h.probability + "% delay chance",
        action: "set-time",
        value: h.time,
      });
    });
  }
  if (f.previous >= 10) {
    items.push({ type: "tip", text: "Inbound aircraft is late — consider a later connection or buffer", action: null });
  }
  if (result.probability >= 65) {
    items.push({ type: "watch", text: "High risk — add to watchlist and re-check closer to departure", action: "watchlist" });
  } else if (result.probability >= 35) {
    items.push({ type: "tip", text: "Medium risk — keep the airline app open for gate changes", action: null });
  } else {
    items.push({ type: "tip", text: "Looking good — still allow normal airport buffer time", action: null });
  }
  if (f.weather >= 20 || f.wind >= 10) {
    items.push({ type: "tip", text: "Weather-driven risk — re-run the prediction a few hours before departure", action: null });
  }
  return items.slice(0, 4);
}

function predict(input) {
  const f = factors(input);
  const score = f.weather + f.traffic + f.wind + f.previous + f.time + f.destination;

  const probability = Math.min(98, Math.max(2, Math.round(score)));
  const delay = probability < 20
    ? Math.round(probability * 0.3)
    : Math.round(probability * 0.9 + input.previousDelay * 8);

  const { risk, riskClass } = classify(probability);
  const result = {
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
  result.suggestions = suggestions(input, result);
  result.season = seasonFlags(input.date);
  return result;
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
  classify, confidence, suggestions, seasonFlags, FACTOR_LABELS, FACTOR_MAX, WEATHER, TRAFFIC,
};
