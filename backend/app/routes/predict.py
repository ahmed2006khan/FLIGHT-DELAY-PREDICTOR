from flask import Blueprint, jsonify, request

from app.ml.predictor import predict as run_prediction
from app.models import Prediction, db

predict_bp = Blueprint("predict", __name__)

REQUIRED_FIELDS = [
    "airline",
    "flight",
    "origin",
    "destination",
    "date",
    "time",
    "weather",
    "wind",
    "previousDelay",
    "traffic",
]


@predict_bp.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}

    missing = [f for f in REQUIRED_FIELDS if f not in data or data[f] in ("", None)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        wind = float(data["wind"])
        previous_delay = int(data["previousDelay"])
    except (TypeError, ValueError):
        return jsonify({"error": "wind and previousDelay must be numeric"}), 400

    result = run_prediction(
        weather=data["weather"],
        traffic=data["traffic"],
        wind=wind,
        previous_delay=previous_delay,
    )

    record = Prediction(
        airline=data["airline"],
        flight=data["flight"],
        origin=data["origin"],
        destination=data["destination"],
        date=data["date"],
        time=data["time"],
        weather=data["weather"],
        wind=wind,
        previous_delay=previous_delay,
        traffic=data["traffic"],
        probability=result["probability"],
        risk=result["risk"],
        risk_class=result["riskClass"],
        delay=result["delay"],
    )
    db.session.add(record)
    db.session.commit()

    return jsonify(
        {
            "id": record.id,
            "probability": result["probability"],
            "risk": result["risk"],
            "riskClass": result["riskClass"],
            "delay": result["delay"],
        }
    )
