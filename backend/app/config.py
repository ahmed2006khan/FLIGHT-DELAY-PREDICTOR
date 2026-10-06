import os

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))


def _build_database_uri() -> str:
    engine = os.getenv("DB_ENGINE", "sqlite").lower()

    if engine == "postgres":
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "")
        host = os.getenv("DB_HOST", "localhost")
        port = os.getenv("DB_PORT", "5432")
        name = os.getenv("DB_NAME", "flight_delay_db")
        return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"

    if engine == "mysql":
        user = os.getenv("DB_USER", "root")
        password = os.getenv("DB_PASSWORD", "")
        host = os.getenv("DB_HOST", "localhost")
        port = os.getenv("DB_PORT", "3306")
        name = os.getenv("DB_NAME", "flight_delay_db")
        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}"

    # Default: sqlite, zero setup required
    sqlite_path = os.path.join(BASE_DIR, "flight_delay.db")
    return f"sqlite:///{sqlite_path}"


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production")
    SQLALCHEMY_DATABASE_URI = _build_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
