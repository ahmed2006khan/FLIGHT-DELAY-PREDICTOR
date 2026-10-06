import os

import joblib
import numpy as np
import pandas as pd

ML_DIR = os.path.abspath(os.path.dirname(__file__))

_risk_model = None
_prob_model = None
_delay_model = None
_weather_encoder = None
_traffic_encoder = None


def _ensure_models_loaded():
    global _risk_model, _prob_model, _delay_model, _weather_encoder, _traffic_encoder

    if _risk_model is not None:
        return

    risk_path = os.path.join(ML_DIR, "risk_model.pkl")
    if not os.path.exists(risk_path):
        # First run convenience: train on the fly if models aren't present yet.
        from app.ml.train_model import train_and_save

        train_and_save()

    _risk_model = joblib.load(os.path.join(ML_DIR, "risk_model.pkl"))
    _prob_model = joblib.load(os.path.join(ML_DIR, "prob_model.pkl"))
    _delay_model = joblib.load(os.path.join(ML_DIR, "delay_model.pkl"))
    _weather_encoder = joblib.load(os.path.join(ML_DIR, "weather_encoder.pkl"))
    _traffic_encoder = joblib.load(os.path.join(ML_DIR, "traffic_encoder.pkl"))


RISK_LABELS = {
    "low": "LOW RISK",
    "medium": "MEDIUM RISK",
    "high": "HIGH RISK",
}


def predict(weather: str, traffic: str, wind: float, previous_delay: int) -> dict:
    """Run the trained models on one flight's features and return the
    same shape the frontend expects: probability, risk, riskClass, delay.
    """
    _ensure_models_loaded()

    weather = (weather or "clear").lower()
    traffic = (traffic or "low").lower()

    weather_enc = _weather_encoder.transform(pd.DataFrame([[weather]], columns=["weather"]))[0][0]
    traffic_enc = _traffic_encoder.transform(pd.DataFrame([[traffic]], columns=["traffic"]))[0][0]

    features = pd.DataFrame(
        [[weather_enc, traffic_enc, float(wind), int(previous_delay)]],
        columns=["weather_enc", "traffic_enc", "wind", "previous_delay"],
    )

    probability = int(round(np.clip(_prob_model.predict(features)[0], 5, 95)))
    delay = int(round(np.clip(_delay_model.predict(features)[0], 0, 90)))
    risk_class = str(_risk_model.predict(features)[0])
    risk = RISK_LABELS.get(risk_class, "LOW RISK")

    return {
        "probability": probability,
        "risk": risk,
        "riskClass": risk_class,
        "delay": delay,
    }
