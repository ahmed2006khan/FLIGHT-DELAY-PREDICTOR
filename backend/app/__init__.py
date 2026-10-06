from flask import Flask, jsonify
from flask_cors import CORS

from app.config import Config
from app.models import db


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)
    db.init_app(app)

    from app.routes.predict import predict_bp
    from app.routes.flights import flights_bp

    app.register_blueprint(predict_bp, url_prefix="/api")
    app.register_blueprint(flights_bp, url_prefix="/api")

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok"})

    with app.app_context():
        db.create_all()

    return app
