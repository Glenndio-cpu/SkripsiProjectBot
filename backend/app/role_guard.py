"""Centralized auth and role guards for route handlers."""

from functools import wraps
from typing import Callable
from flask import jsonify, request

from app.session_auth import get_authenticated_user


def require_auth(view_fn: Callable):
    """Require a valid logged-in session before entering the view."""

    @wraps(view_fn)
    def wrapper(*args, **kwargs):
        user = get_authenticated_user()
        if not user:
            return jsonify(error='Sesi tidak valid. Silakan login ulang'), 401
        return view_fn(*args, **kwargs)

    return wrapper


def require_roles(*roles: str):
    """Require a valid session and one of the allowed roles."""

    allowed = set(roles)

    def decorator(view_fn: Callable):
        @wraps(view_fn)
        def wrapper(*args, **kwargs):
            user = get_authenticated_user()
            if not user:
                return jsonify(error='Sesi tidak valid. Silakan login ulang'), 401

            role = user.get('role') or 'patient'
            if role not in allowed:
                return jsonify(error='Anda tidak memiliki akses untuk fitur ini'), 403

            return view_fn(*args, **kwargs)

        return wrapper

    return decorator


def require_email_match_or_roles(*roles: str, source: str = 'path', field: str = 'email'):
    """Allow self access, or access by one of privileged roles."""

    allowed = set(roles)

    def decorator(view_fn: Callable):
        @wraps(view_fn)
        def wrapper(*args, **kwargs):
            user = get_authenticated_user()
            if not user:
                return jsonify(error='Sesi tidak valid. Silakan login ulang'), 401

            target_email = ''
            if source == 'path':
                target_email = kwargs.get(field, '')
            elif source == 'json':
                body = request.get_json(silent=True) or {}
                target_email = body.get(field, '')
            elif source == 'query':
                target_email = request.args.get(field, '')

            user_email = user.get('email', '')
            user_role = user.get('role') or 'patient'

            if not target_email:
                return view_fn(*args, **kwargs)

            if user_email == target_email or user_role in allowed:
                return view_fn(*args, **kwargs)

            return jsonify(error='Tidak diizinkan mengakses data pengguna lain'), 403

        return wrapper

    return decorator
