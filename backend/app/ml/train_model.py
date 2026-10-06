"""
Generates synthetic training data mirroring the weighting scheme described
on the frontend's predict.html page (weather up to 35%, traffic up to 25%,
wind up to 18%, previous delay up to 20%), then trains:

  - a RandomForestClassifier for risk level (low / medium / high)
  - a RandomForestRegressor for delay probability (%)
  - a RandomForestRegressor for estimated delay (minutes)

Swap in a real dataset (e.g. Kaggle's Airline Delay dataset, or BTS
On-Time Performance data) by replacing generate_synthetic_data() below —
everything downstream (feature encoding, training, saving) stays the same.
"""

import os
import random

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import OrdinalEncoder

ML_DIR = os.path.abspath(os.path.dirname(__file__))

WEATHER_OPTIONS = ["clear", "cloudy", "rain", "storm", "fog"]
TRAFFIC_OPTIONS = ["low", "medium", "high"]

WEATHER_SCORE = {"clear": 0, "cloudy": 8, "rain": 20, "storm": 35, "fog": 28}
TRAFFIC_SCORE = {"low": 0, "medium": 12, "high": 25}


def _wind_score(wind: float) -> float:
    if wind >= 50:
        return 18
    if wind >= 30:
        return 10
    if wind >= 20:
        return 5
    return 0


def _risk_bucket(probability: float) -> str:
    if probability < 35:
        return "low"
    if probability < 65:
        return "medium"
    return "high"


def generate_synthetic_data(n_samples: int = 6000, seed: int = 42) -> pd.DataFrame:
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    rows = []
    for _ in range(n_samples):
        weather = rng.choice(WEATHER_OPTIONS)
        traffic = rng.choice(TRAFFIC_OPTIONS)
        wind = float(np_rng.uniform(0, 120))
        previous_delay = rng.choice([0, 1, 2])

        base = 10
        base += WEATHER_SCORE[weather]
        base += TRAFFIC_SCORE[traffic]
        base += previous_delay * 10
        base += _wind_score(wind)

        # small amount of noise so the model learns a smooth surface
        # rather than memorizing the exact formula
        noise = np_rng.normal(0, 4)
        probability = min(95, max(5, round(base + noise)))

        delay = round((probability / 100) * 75)
        if delay < 5 and probability >= 20:
            delay = 5
        delay = int(min(90, max(0, delay + np_rng.normal(0, 3))))

        risk = _risk_bucket(probability)

        rows.append(
            {
                "weather": weather,
                "traffic": traffic,
                "wind": wind,
                "previous_delay": previous_delay,
                "probability": probability,
                "delay": delay,
                "risk": risk,
            }
        )

    return pd.DataFrame(rows)


def train_and_save():
    df = generate_synthetic_data()

    weather_encoder = OrdinalEncoder(categories=[WEATHER_OPTIONS])
    traffic_encoder = OrdinalEncoder(categories=[TRAFFIC_OPTIONS])

    df["weather_enc"] = weather_encoder.fit_transform(df[["weather"]])
    df["traffic_enc"] = traffic_encoder.fit_transform(df[["traffic"]])

    feature_cols = ["weather_enc", "traffic_enc", "wind", "previous_delay"]
    X = df[feature_cols]

    # Risk classifier
    risk_model = RandomForestClassifier(
        n_estimators=200, max_depth=8, random_state=42
    )
    risk_model.fit(X, df["risk"])

    # Probability regressor
    prob_model = RandomForestRegressor(
        n_estimators=200, max_depth=8, random_state=42
    )
    prob_model.fit(X, df["probability"])

    # Delay minutes regressor
    delay_model = RandomForestRegressor(
        n_estimators=200, max_depth=8, random_state=42
    )
    delay_model.fit(X, df["delay"])

    joblib.dump(risk_model, os.path.join(ML_DIR, "risk_model.pkl"))
    joblib.dump(prob_model, os.path.join(ML_DIR, "prob_model.pkl"))
    joblib.dump(delay_model, os.path.join(ML_DIR, "delay_model.pkl"))
    joblib.dump(weather_encoder, os.path.join(ML_DIR, "weather_encoder.pkl"))
    joblib.dump(traffic_encoder, os.path.join(ML_DIR, "traffic_encoder.pkl"))

    print(f"Trained on {len(df)} synthetic samples.")
    print("Saved: risk_model.pkl, prob_model.pkl, delay_model.pkl, "
          "weather_encoder.pkl, traffic_encoder.pkl")


if __name__ == "__main__":
    train_and_save()
