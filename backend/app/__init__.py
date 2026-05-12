import os
import traceback
import uuid
from datetime import timedelta
from flask import Flask, session, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from pathlib import Path
from werkzeug.exceptions import HTTPException

ENV_FILE = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(ENV_FILE, override=True)

from app.migration_health import get_migration_health


def _get_cors_origins():
    raw = (os.getenv('CORS_ALLOWED_ORIGINS') or '').strip()
    if raw:
        origins = [origin.strip() for origin in raw.split(',') if origin.strip()]
        if origins:
            return origins

    # Safe default for local development.
    return [
        'http://localhost:4000',
        'http://localhost:5173',
    ]

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
    CORS(app, origins=_get_cors_origins(), supports_credentials=True)

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
        error_id = str(uuid.uuid4())

        if isinstance(e, HTTPException):
            code = e.code or 500
            message = e.description or e.name or 'Request error'
            app.logger.info(
                f'[{error_id}] HTTP {code} {request.method} {request.path} - {message}'
            )
            return jsonify({'error': {'message': message, 'code': code, 'id': error_id}}), code

        app.logger.error(
            f'[{error_id}] Unhandled error {request.method} {request.path}: {e}\n{traceback.format_exc()}'
        )
        return (
            jsonify({'error': {'message': 'Internal server error', 'code': 500, 'id': error_id}}),
            500,
        )

    @app.after_request
    def set_security_headers(response):
        # Security headers to improve baseline security posture.
        response.headers.setdefault('X-Content-Type-Options', 'nosniff')
        response.headers.setdefault('X-Frame-Options', 'DENY')
        response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers.setdefault('Permissions-Policy', 'geolocation=(), microphone=(), camera=(self)')
        response.headers.setdefault(
            'Content-Security-Policy',
            "default-src 'self' https: data: blob:; "
            "base-uri 'self'; "
            "frame-ancestors 'none'; "
            "form-action 'self' https:; "
            "object-src 'none'; "
            "img-src 'self' https: data: blob:; "
            "script-src 'self' https: 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' https: 'unsafe-inline'; "
            "connect-src 'self' https: wss:; "
            "font-src 'self' https: data:"
        )

        if os.getenv('ENABLE_HSTS', 'true').lower() == 'true':
            response.headers.setdefault(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains; preload'
            )

        return response

    return app
