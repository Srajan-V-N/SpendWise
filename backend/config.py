import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta

env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

class Config:
    # Flask
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'spendwise-dev-secret-change-in-prod')
    DEBUG = os.getenv('FLASK_DEBUG', 'true').lower() == 'true'

    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-dev-secret-change-in-prod')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'

    # Database
    DB_HOST = os.getenv('MYSQL_HOST', 'localhost')
    DB_PORT = int(os.getenv('MYSQL_PORT', 3306))
    DB_USER = os.getenv('MYSQL_USER', 'root')
    DB_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
    DB_NAME = os.getenv('MYSQL_DB', 'defaultdb')

    # AI
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    GEMINI_MODEL = 'gemini-2.5-flash'

    # CORS
    CORS_ORIGINS = [o.strip() for o in os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')]

    # Uploads
    UPLOAD_FOLDER = Path(__file__).parent / 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB


config = Config()
