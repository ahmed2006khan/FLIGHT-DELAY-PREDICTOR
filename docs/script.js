const API_BASE_URL = "https://flight-delay-predictor-8wkj.onrender.com/api";

const form = document.getElementById("flightForm");
const resetBtn = document.getElementById("resetBtn");
const submitBtn = form ? form.querySelector(".predict-btn") : null;

if (form) {
  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const airline = document.getElementById("airline").value;
    const flight = document.getElementById("flightNumber").value.trim().toUpperCase();
    const origin = document.getElementById("origin").value.trim().toUpperCase();
    const destination = document.getElementById("destination").value.trim().toUpperCase();
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;
    const weather = document.getElementById("weather").value;
    const wind = document.getElementById("wind").value;
    const previousDelayValue = Number(document.getElementById("previousDelay").value);
    const traffic = document.getElementById("traffic").value;

    const weatherText = weather.charAt(0).toUpperCase() + weather.slice(1);
    const trafficText = traffic.charAt(0).toUpperCase() + traffic.slice(1);

    const previousDelay =
      previousDelayValue === 0 ? "No Delay" :
      previousDelayValue === 1 ? "Minor Delay" : "Major Delay";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Predicting...";
    }

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          airline,
          flight,
          origin,
          destination,
          date,
          time,
          weather,
          wind: Number(wind),
          previousDelay: previousDelayValue,
          traffic
        })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${response.status})`);
      }

      const prediction = await response.json();

      document.getElementById("emptyResult").style.display = "none";
      document.getElementById("result").classList.add("show");

      document.getElementById("delayMinutes").textContent = prediction.delay;
      document.getElementById("probabilityText").textContent = prediction.probability + "%";
      document.getElementById("progressBar").style.width = prediction.probability + "%";

      const badge = document.getElementById("riskBadge");
      badge.textContent = prediction.risk;
      badge.className = "risk-badge " + prediction.riskClass;

      document.getElementById("summaryAirline").textContent = airline;
      document.getElementById("summaryFlight").textContent = flight;
      document.getElementById("summaryRoute").textContent = origin + " → " + destination;
      document.getElementById("summaryWeather").textContent = weatherText;

      const predictionData = {
        airline,
        flight,
        origin,
        destination,
        date,
        time,
        weather: weatherText,
        wind,
        previousDelay,
        traffic: trafficText,
        delay: prediction.delay,
        probability: prediction.probability,
        risk: prediction.risk,
        riskClass: prediction.riskClass
      };

      localStorage.setItem("flightPrediction", JSON.stringify(predictionData));

      setTimeout(() => {
        window.location.href = "report.html";
      }, 650);
    } catch (err) {
      alert(
        "Couldn't reach the prediction server. It may be waking up " +
        "(free hosting sleeps after inactivity) — please wait 30-60 " +
        "seconds and try again.\n\n" +
        "Details: " + err.message
      );
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Predict Delay";
      }
    }
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", resetForm);
}

function resetForm() {
  form.reset();
  document.getElementById("emptyResult").style.display = "flex";
  document.getElementById("result").classList.remove("show");
  document.getElementById("progressBar").style.width = "0%";
}
