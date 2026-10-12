// Scoring model. Weights match the "Smart Prediction", "Weather", and "Wind" pages.
const WEATHER = { clear: 0, cloudy: 8, rain: 20, fog: 28, storm: 35 };   // up to 35
const TRAFFIC = { low: 3, medium: 12, high: 25 };                         // up to 25
const PREVIOUS = [0, 10, 20];                                             // up to 20

function windImpact(kmh) {                                                // up to 18
  if (kmh < 20) return 0;
  if (kmh < 30) return 5;
  if (kmh <= 50) return 10;
  return 18;
}

function predict({ weather, wind, previousDelay, traffic }) {
  const score =
    WEATHER[weather] + TRAFFIC[traffic] + windImpact(wind) + PREVIOUS[previousDelay];

  const probability = Math.min(98, Math.max(2, Math.round(score)));
  const delay = probability < 20
    ? Math.round(probability * 0.3)
    : Math.round(probability * 0.9 + previousDelay * 8);

  let risk = "LOW RISK", riskClass = "low";
  if (probability >= 65) { risk = "HIGH RISK"; riskClass = "high"; }
  else if (probability >= 35) { risk = "MEDIUM RISK"; riskClass = "medium"; }

  return { delay, probability, risk, riskClass };
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
  return errors;
}

module.exports = { predict, validate, windImpact };
