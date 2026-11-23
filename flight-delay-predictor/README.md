# FlightPredict – Flight Delay Predictor

> **Know before you go.**

Full-stack Node.js app that predicts flight delays from weather, airport traffic, wind speed and previous-leg delay.

**Stack:** HTML/CSS/JS frontend · Express API · PostgreSQL (optional)

---

## Project structure

```
public/           Frontend pages + assets
  index.html      Dashboard
  new-prediction.html
  predict.html, weather.html, risk.html, history.html, report.html
  style.css, script.js, dashboard.js, logo.svg, favicon.svg
server.js         Express server + REST API
predictor.js      Scoring model + validation
db.js             PostgreSQL (optional) – table auto-created on start
test/             Unit tests for the model
.env.example      Environment template
render.yaml       One-click Render blueprint (optional)
```

## API

| Method | Endpoint         | Purpose                          |
|--------|------------------|----------------------------------|
| POST   | /api/predict     | Returns delay, probability, risk |
| GET    | /api/predictions | Recent saved predictions         |
| GET    | /api/stats       | Totals and averages              |
| GET    | /api/health      | Server + database status         |

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. (Optional) configure database
cp .env.example .env
# Edit .env and set DATABASE_URL if you want history saved
# Example local: postgresql://postgres:password@localhost:5432/flightdb

# 3. Start the server
npm start
# → http://localhost:3000

# 4. Run unit tests
npm test
```

Without `DATABASE_URL` the app still works: predictions are returned and stored in the browser (`localStorage`). The `predictions` table is created automatically when a database is connected.

## Deploy on Render (recommended)

### Option A – Blueprint (easiest)

1. Push this repo to GitHub.
2. In Render Dashboard → **New** → **Blueprint**.
3. Select the repo. Render reads `render.yaml` and creates:
   - a free Web Service
   - a free PostgreSQL database
   - links `DATABASE_URL` for you
4. Deploy. Your site will be live at `https://<name>.onrender.com`.

### Option B – Manual

1. Create a **PostgreSQL** instance on Render → copy the **Internal Database URL**.
2. Create a **Web Service** from the same GitHub repo:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. Environment variables:
   - `DATABASE_URL` = the Internal Database URL from step 1
   - `NODE_ENV` = `production`
4. Deploy.

**Note:** Free Render services sleep after ~15 min of inactivity. The first request after sleep can take 30–60 seconds.

## Prediction model

Score = weather (0–35) + airport traffic (0–25) + wind (0–18) + previous delay (0–20).  
Probability is capped between 2% and 98%.

| Risk        | Probability |
|-------------|-------------|
| LOW RISK    | < 35%       |
| MEDIUM RISK | 35–64%      |
| HIGH RISK   | ≥ 65%       |

## Environment variables

| Variable       | Required | Description                                      |
|----------------|----------|--------------------------------------------------|
| `PORT`         | No       | Defaults to 3000 (Render sets this automatically)|
| `DATABASE_URL` | No       | PostgreSQL connection string. History is optional|
| `NODE_ENV`     | No       | Set to `production` on Render for SSL            |

## Startup commands summary

```bash
npm install          # install dependencies
npm start            # production start (node server.js)
npm run dev          # development with auto-reload (Node 18+)
npm test             # run model unit tests
```

## License

MIT
