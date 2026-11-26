// Live conditions for the Predict page: "Use my location" and "Fill from live forecast".
// Your location stays in the browser. Only the airport codes, date and time are sent to the server.
(function () {
  const form = document.getElementById("flightForm");
  if (!form || !window.FPForm) return;
  const esc = FP.esc;
  const $ = (id) => document.getElementById(id);
  let destWeather = null;   // destination forecast from the last "Fill" (sent with the prediction)

  const panel = document.createElement("div");
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", "Live conditions");
  panel.style.cssText = "margin-bottom:18px";
  panel.innerHTML =
    '<div class="btn-row" style="margin:0 0 8px">' +
    '<button type="button" class="btn btn-ghost" id="useLoc">📍 Use my location</button>' +
    '<button type="button" class="btn btn-ghost" id="liveFill">☁ Fill from live forecast</button></div>' +
    '<div id="liveStatus" class="hint" aria-live="polite">Pick your airport from your location, then fill weather, wind and traffic from the forecast. You can still change any value.</div>';
  form.insertBefore(panel, $("fields"));
  const status = (html) => { $("liveStatus").innerHTML = html; };

  function km(a, b) {   // haversine distance in km
    const r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }

  $("useLoc").addEventListener("click", () => {
    if (!navigator.geolocation) { status("Your browser does not support location. Type the airport code instead."); return; }
    status("Finding your location…");
    navigator.geolocation.getCurrentPosition((pos) => {
      const me = [pos.coords.latitude, pos.coords.longitude];
      let best = null;
      window.AIRPORTS.forEach((a) => { const d = km(me, [a[2], a[3]]); if (!best || d < best.d) best = { a, d }; });
      if (best.d > 300) { status("The nearest airport in the list is " + esc(best.a[1]) + " (" + Math.round(best.d) + " km away). Type your airport code instead."); return; }
      const o = $("origin"); o.value = best.a[0]; o.dispatchEvent(new Event("input", { bubbles: true }));
      status("Nearest airport: <strong>" + esc(best.a[0]) + "</strong> (" + esc(best.a[1]) + ", " + Math.round(best.d) + " km away). Your location was not sent anywhere.");
    }, (err) => {
      status(err.code === 1 ? "Location permission was blocked. Type the airport code instead." : "Could not get your location. Type the airport code instead.");
    }, { timeout: 10000, maximumAge: 600000 });
  });

  function setSelect(id, value) { const el = $(id); el.value = value; el.dispatchEvent(new Event("change", { bubbles: true })); }
  const label = { clear: "clear", cloudy: "cloudy", rain: "rain", fog: "fog", storm: "storm" };

  $("liveFill").addEventListener("click", async () => {
    const v = FPForm.read("");
    if (!v.origin || !v.date || !v.time) { status("Enter the origin airport, date and departure time first."); return; }
    const btn = $("liveFill"); btn.disabled = true; status("Loading the forecast…");
    try {
      const q = new URLSearchParams({ origin: v.origin, destination: v.destination, date: v.date, time: v.time });
      const c = await FP.api("/conditions?" + q);
      setSelect("weather", c.origin.weather);
      $("wind").value = c.origin.wind; $("wind").dispatchEvent(new Event("input", { bubbles: true }));
      setSelect("traffic", c.traffic.level);
      destWeather = c.destination ? c.destination.weather : null;
      let html = "<strong>" + esc(c.origin.airport) + "</strong> at " + esc(v.time) + ": " + label[c.origin.weather] + ", wind " + c.origin.wind + " km/h" +
        (c.origin.visibilityKm !== null ? ", visibility " + c.origin.visibilityKm + " km" : "") +
        (c.destination ? ". <strong>" + esc(c.destination.airport) + "</strong> (destination): " + label[c.destination.weather] : ". Destination weather not included") +
        ". Traffic: " + esc(c.traffic.level) + " (" + esc(c.traffic.basis.toLowerCase()) + ") Source: " + esc(c.source) + ".";
      status(html);
    } catch (err) {
      status("Could not load the forecast: " + esc(err.message) + " You can still enter the conditions by hand.");
    } finally { btn.disabled = false; }
  });

  // A changed destination means the stored destination weather no longer applies.
  $("destination").addEventListener("input", () => { destWeather = null; });
  form.addEventListener("reset", () => { destWeather = null; status("Pick your airport from your location, then fill weather, wind and traffic from the forecast. You can still change any value."); });

  // Send the destination weather along with the prediction (Predict page only).
  const baseRead = FPForm.read;
  FPForm.read = function (p) {
    const v = baseRead(p);
    if (p === "" && destWeather) v.destWeather = destWeather;
    return v;
  };
})();
