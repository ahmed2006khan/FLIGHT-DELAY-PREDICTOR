# FlightPredict - Full-Stack Flight Delay Predictor (Node.js)

**Stack:** HTML/CSS/JS frontend, Node.js + Express backend, PostgreSQL database.

## Structure
```
public/        frontend (index, predict, weather, risk, report, history pages)
server.js      Express app and REST API
predictor.js   scoring model and input validation
db.js          PostgreSQL connection and queries
test/          unit tests for the model
```

## API
| Method | Endpoint           | Purpose                               |
|--------|--------------------|---------------------------------------|
| POST   | /api/predict       | Returns delay, probability, risk      |
| GET    | /api/predictions   | Recent saved predictions              |
| GET    | /api/stats         | Totals and averages                   |
| GET    | /api/health        | Server and database status            |

## Run locally
```
npm install
cp .env.example .env     # add your DATABASE_URL (optional)
npm start                # http://localhost:3000
npm test
```
The `predictions` table is created automatically on startup.

## Deploy on Render
1. Create a **PostgreSQL** instance on Render and copy its Internal Database URL.
2. Create a **Web Service** from your GitHub repo.
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variables: `DATABASE_URL` = the URL above, `NODE_ENV` = `production`

## Prediction model
Score = weather (up to 35) + airport traffic (up to 25) + wind (up to 18) + previous delay (up to 20).
Risk: below 35% low, 35-65% medium, above 65% high.
"# FLIGHT-DELAY-PREDICTOR" 
