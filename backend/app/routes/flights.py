from flask import Blueprint, jsonify

from app.models import Prediction

flights_bp = Blueprint("flights", __name__)


@flights_bp.route("/predictions", methods=["GET"])
def list_predictions():
    records = (
        Prediction.query.order_by(Prediction.created_at.desc()).limit(50).all()
    )
    return jsonify([r.to_dict() for r in records])


@flights_bp.route("/predictions/<int:prediction_id>", methods=["GET"])
def get_prediction(prediction_id):
    record = Prediction.query.get(prediction_id)
    if record is None:
        return jsonify({"error": "Prediction not found"}), 404
    return jsonify(record.to_dict())
