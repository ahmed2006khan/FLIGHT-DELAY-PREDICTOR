// npm run sample-data  ->  data/sample-flights.csv (SYNTHETIC, for testing only)
const fs = require("fs");
const path = require("path");
const { generate } = require("../sample-data");
const { stringify } = require("./csv");
const n = Number(process.argv[2]) || 5000;
const header = ["origin", "weather", "wind", "traffic", "previousDelay", "hour", "destWeather", "delayMinutes"];
const out = path.join(__dirname, "..", "data", "sample-flights.csv");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, stringify(header, generate(n), ["SYNTHETIC DATA - made-up delays for testing the training code. Do not report results from this file."]));
console.log("Wrote " + n + " synthetic rows to " + out);
