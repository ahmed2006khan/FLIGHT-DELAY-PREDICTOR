# FlightPredict: Know before you go.

A full-stack flight delay predictor.
**Stack:** HTML/CSS/JS frontend, Node.js + Express backend, PostgreSQL (optional).

## Features
- **Dashboard**: key numbers, delay trend, risk mix, delays by hour / airline / airport, delay causes, recent predictions
- **Predict a flight**: delay chance, expected minutes, confidence, "why this score" breakdown, tips, saved routes
- **Compare flights**: two flights side by side (not saved to history)
- **Best time to fly**: delay chance for each departure hour
- **History**: search, filter by risk and weather, CSV export
- **Report**: print / save as PDF, CSV download, copy summary
- **Accessibility**: light and dark themes, high-contrast mode, text size controls, keyboard navigation, skip link, screen-reader labels for charts, reduced-motion support, mobile menu
- **Works without a database**: predictions are kept in memory (they clear on restart). Add `DATABASE_URL` for permanent storage.

## Structure
```
public/        frontend (pages, style.css, shell.js, charts.js, common.js, per-page scripts, logo + favicon)
server.js      Express app and REST API
predictor.js   scoring model, confidence, best-time, validation
analytics.js   dashboard numbers from saved predictions
demo-data.js   sample predictions for an empty dashboard
db.js          PostgreSQL queries (with in-memory fallback)
test/          unit tests
```

## API
| Method | Endpoint          | Purpose                                                        |
|--------|-------------------|----------------------------------------------------------------|
| POST   | /api/predict      | Delay, probability, risk, confidence, factors, tips (`save:false` skips saving) |
| POST   | /api/best-time    | Delay chance for each hour of the day                          |
| GET    | /api/analytics    | All dashboard numbers                                          |
| GET    | /api/predictions  | Recent saved predictions (`?limit=`, up to 1000)               |
| GET    | /api/stats        | Totals and averages                                            |
| POST   | /api/demo-data    | Adds 120 sample predictions, only when history is empty        |
| GET    | /api/health       | Server and storage status                                      |

## Run locally
```
npm install
cp .env.example .env     # add DATABASE_URL (optional)
npm start                # http://localhost:3000
npm test
```
The `predictions` table is created automatically on startup. No database changes were needed for the new features.

## Deploy on Render
1. Create a **PostgreSQL** instance on Render and copy its Internal Database URL.
2. Create a **Web Service** from your GitHub repo.
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variables: `DATABASE_URL` = the URL above, `NODE_ENV` = `production`

## Prediction model
Score = weather (up to 35) + airport traffic (up to 25) + inbound delay (up to 20) + wind (up to 18) + time of day (up to 8).
Time of day: 06:00-09:59 and 17:00-21:59 add 8, 10:00-16:59 adds 3, other hours add 0.
Risk: below 35% low, 35-65% medium, above 65% high.
Confidence (60-98%) is how far the score is from the nearest risk boundary.
This is a rule-based estimate for learning, not live airline data.

## Branding
Logo files: `public/logo.svg` (full lockup), `public/logo-mark.svg` and `public/favicon.svg`. Slogan: "Know before you go."

## Live conditions (new)

On the Predict page:

- **Use my location** picks the nearest airport from the list. Your location is read in the browser and never sent to the server.
- **Fill from live forecast** looks up the forecast for the origin airport at the flight's date and time (and the destination airport if you entered one) and fills weather and wind. It also fills airport traffic. Forecasts come from [Open-Meteo](https://open-meteo.com) (free, no API key) and cover about the next 15 days. Every value can still be edited by hand.
- Destination weather adds up to 10 points to the score. It only counts when the destination forecast was loaded.
- **Airport traffic is an estimate** from airport size and time of day, not a live feed. The previous-flight delay is still entered by you, because free sources for it are unreliable.

API: `GET /api/conditions?origin=BLR&destination=DEL&date=2026-12-01&time=08:30`

## Trained model (new)

Two models are trained with `npm run train`: logistic regression (chance of a delay of 15+ minutes) and ridge regression (expected minutes). They use no extra packages. The main score stays the rule-based one, and when `model/weights.json` exists the result also shows the trained model's estimate. The Model page shows accuracy and AUC on held-out test flights next to the rule-based score and a "guess the common outcome" baseline.

### Train on real data

1. Get a real flights file with the actual delay in minutes (BTS on-time data or a Kaggle flight-delay dataset). Make a CSV with columns `origin, destination, date (YYYY-MM-DD), hour or time, delayMinutes`, and optionally `previousDelayMinutes`. Airports must be in `public/airports.js`.
2. Real flight data has no weather, so add it from historical records (needs internet):
   `npm run enrich -- data/flights.csv`  (writes `data/flights-weather.csv` with `weather`, `wind`, `destWeather`)
3. Train: `npm run train -- data/flights-weather.csv`
4. Commit `model/weights.json` and redeploy. Quote the accuracy, AUC and the baseline from the Model page in your report.

`npm run sample-data` creates SYNTHETIC rows with made-up delays. Use it only to test that the code runs. Results from it say nothing about real flights, and the Model page shows a warning if a model was trained on it.

Other changes: "Confidence" is now called "Score stability", Go First and Vistara were removed from the airline list, and `npm test` runs all three test files.
