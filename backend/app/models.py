from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Prediction(db.Model):
    __tablename__ = "predictions"

    id = db.Column(db.Integer, primary_key=True)

    airline = db.Column(db.String(64), nullable=False)
    flight = db.Column(db.String(32), nullable=False)
    origin = db.Column(db.String(8), nullable=False)
    destination = db.Column(db.String(8), nullable=False)
    date = db.Column(db.String(16), nullable=False)
    time = db.Column(db.String(16), nullable=False)
    weather = db.Column(db.String(32), nullable=False)
    wind = db.Column(db.Float, nullable=False)
    previous_delay = db.Column(db.Integer, nullable=False)
    traffic = db.Column(db.String(32), nullable=False)

    probability = db.Column(db.Integer, nullable=False)
    risk = db.Column(db.String(32), nullable=False)
    risk_class = db.Column(db.String(16), nullable=False)
    delay = db.Column(db.Integer, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "airline": self.airline,
            "flight": self.flight,
            "origin": self.origin,
            "destination": self.destination,
            "date": self.date,
            "time": self.time,
            "weather": self.weather,
            "wind": self.wind,
            "previousDelay": self.previous_delay,
            "traffic": self.traffic,
            "probability": self.probability,
            "risk": self.risk,
            "riskClass": self.risk_class,
            "delay": self.delay,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
