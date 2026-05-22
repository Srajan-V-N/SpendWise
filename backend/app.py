import decimal
import datetime
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask.json.provider import DefaultJSONProvider

from config import config
from database import init_db

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s %(message)s')


class AppJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        if isinstance(obj, datetime.date):
            return obj.isoformat()
        if isinstance(obj, bytes):
            return obj.decode('utf-8', errors='replace')
        return super().default(obj)


def create_app():
    app = Flask(__name__)

    app.json_provider_class = AppJSONProvider
    app.json = AppJSONProvider(app)

    app.config['SECRET_KEY'] = config.SECRET_KEY
    app.config['JWT_SECRET_KEY'] = config.JWT_SECRET_KEY
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = config.JWT_ACCESS_TOKEN_EXPIRES
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = config.JWT_REFRESH_TOKEN_EXPIRES
    app.config['JWT_TOKEN_LOCATION'] = config.JWT_TOKEN_LOCATION
    app.config['JWT_HEADER_NAME'] = config.JWT_HEADER_NAME
    app.config['JWT_HEADER_TYPE'] = config.JWT_HEADER_TYPE
    app.config['MAX_CONTENT_LENGTH'] = config.MAX_CONTENT_LENGTH

    config.UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

    CORS(app,
         origins=config.CORS_ORIGINS,
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])

    jwt = JWTManager(app)

    @jwt.expired_token_loader
    def expired_token(_jwt_header, _jwt_data):
        return jsonify({'success': False, 'error': 'Token has expired', 'code': 'TOKEN_EXPIRED'}), 401

    @jwt.invalid_token_loader
    def invalid_token(_msg):
        return jsonify({'success': False, 'error': 'Invalid token', 'code': 'TOKEN_INVALID'}), 401

    @jwt.unauthorized_loader
    def missing_token(_msg):
        return jsonify({'success': False, 'error': 'Authentication required', 'code': 'TOKEN_MISSING'}), 401

    from routes.auth import auth_bp
    from routes.dashboard import dashboard_bp
    from routes.expenses import expenses_bp
    from routes.budgets import budgets_bp
    from routes.goals import goals_bp
    from routes.reports import reports_bp
    from routes.subscriptions import subscriptions_bp
    from routes.notifications import notifications_bp
    from routes.wisebot import wisebot_bp
    from routes.imports import imports_bp

    app.register_blueprint(auth_bp,           url_prefix='/api/auth')
    app.register_blueprint(dashboard_bp,      url_prefix='/api/dashboard')
    app.register_blueprint(expenses_bp,       url_prefix='/api/expenses')
    app.register_blueprint(budgets_bp,        url_prefix='/api/budgets')
    app.register_blueprint(goals_bp,          url_prefix='/api/goals')
    app.register_blueprint(reports_bp,        url_prefix='/api/reports')
    app.register_blueprint(subscriptions_bp,  url_prefix='/api/subscriptions')
    app.register_blueprint(notifications_bp,  url_prefix='/api/notifications')
    app.register_blueprint(wisebot_bp,        url_prefix='/api/wisebot')
    app.register_blueprint(imports_bp,        url_prefix='/api/imports')

    @app.errorhandler(404)
    def not_found(_):
        return jsonify({'success': False, 'error': 'Resource not found'}), 404

    @app.errorhandler(405)
    def method_not_allowed(_):
        return jsonify({'success': False, 'error': 'Method not allowed'}), 405

    @app.errorhandler(413)
    def too_large(_):
        return jsonify({'success': False, 'error': 'File too large (max 16 MB)'}), 413

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'success': False, 'error': 'Internal server error', 'detail': str(e)}), 500

    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'app': 'SpendWise API', 'version': '1.0.0'})

    try:
        init_db()
    except Exception as e:
        logging.error(f'Database init failed: {e}')

    return app


app = create_app()

if __name__ == '__main__':
    app.run(debug=config.DEBUG, port=5000, host='0.0.0.0')
