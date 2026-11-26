// Airport traffic estimate. There is no free live traffic feed, so this is
// based on airport size and the usual morning/evening departure banks.
// The app says so wherever it uses this value.
const HUBS = new Set(["DEL", "BOM", "BLR", "HYD", "MAA", "CCU", "DXB", "LHR", "SIN", "JFK", "SFO", "FRA", "CDG", "BKK", "HKG", "DOH", "KUL", "NRT", "SYD", "AUH"]);
const MID = new Set(["PNQ", "AMD", "GOI", "GOX", "COK", "TRV", "JAI", "LKO", "GAU", "IXC", "PAT", "BBI", "IDR", "NAG", "CCJ", "CJB", "VTZ", "ATQ"]);

function estimate(code, time) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(time || ""));
  const hour = m ? Number(m[1]) : null;
  const peak = hour !== null && ((hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 21));
  const day = hour !== null && hour >= 10 && hour <= 16;
  const c = String(code || "").toUpperCase();
  let level = "low";
  if (HUBS.has(c)) level = peak ? "high" : day ? "medium" : "low";
  else if (MID.has(c)) level = peak ? "medium" : "low";
  return { level, basis: "Estimated from airport size and time of day, not live traffic." };
}

module.exports = { estimate };
