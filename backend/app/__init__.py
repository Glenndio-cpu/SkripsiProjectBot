import os
from datetime import timedelta
from flask import Flask, session
from flask_cors import CORS
from dotenv import load_dotenv
from pathlib import Path

ENV_FILE = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(ENV_FILE, override=True)

from app.migration_health import get_migration_health

def create_app():
    app = Flask(__name__)

    app.config['SECRET_KEY'] = (
        os.getenv('FLASK_SECRET_KEY')
        or os.getenv('SECRET_KEY')
        or os.urandom(32)
    )
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax')
    app.config['SESSION_COOKIE_SECURE'] = os.getenv('SESSION_COOKIE_SECURE', 'false').lower() == 'true'
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(
        minutes=int(os.getenv('SESSION_IDLE_MINUTES', '30'))
    )
    app.config['SESSION_REFRESH_EACH_REQUEST'] = True

    @app.before_request
    def refresh_idle_session_timeout():
        # Keep session alive only while user is active; expires after idle timeout.
        if session.get('user_email'):
            session.permanent = True
            session.modified = True

    # CORS
    CORS(app, origins=[
        'http://103.162.115.123',
        'http://103.162.115.123:4000',
        'http://woricare.online',
        'https://woricare.online',
        'http://www.woricare.online',
        'https://www.woricare.online',
        'http://localhost:4000',
        'http://localhost:5173',
    ], supports_credentials=True)

    # Register blueprints
    from app.routes.chat import chat_bp
    from app.routes.auth import auth_bp
    from app.routes.email_routes import email_bp
    from app.routes.users import users_bp
    from app.routes.rag_routes import rag_bp
    from app.routes.history_routes import history_bp
    from app.routes.announcements import announcements_bp
    from app.routes.fonnte import fonnte_bp

    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(email_bp, url_prefix='/api/email')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(rag_bp, url_prefix='/api/rag')
    app.register_blueprint(history_bp, url_prefix='/api/chat/history')
    app.register_blueprint(announcements_bp, url_prefix='/api/announcements')
    app.register_blueprint(fonnte_bp, url_prefix='/api/fonnte')

    # Health check
    @app.route('/api/health')
    def health():
        import time
        return {
            'status': 'ok',
            'timestamp': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
            'uptime': time.monotonic(),
            'migrations': get_migration_health(),
        }

    @app.route('/api/health/migrations')
    def health_migrations():
        return get_migration_health()

    # Global error handler
    @app.errorhandler(Exception)
    def handle_exception(e):
        app.logger.error(f'Server Error: {e}')
        code = getattr(e, 'code', 500)
        return {'error': str(e)}, code

    return app
