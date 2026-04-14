from flask import session

from app.store import find_user_by_email
from app.roles import ROLE_ADMIN, ROLE_PATIENT


def get_authenticated_user():
    email = session.get('user_email')
    if not email:
        return None

    user = find_user_by_email(email)
    if not user:
        session.clear()
        return None

    return user


def is_authenticated() -> bool:
    return get_authenticated_user() is not None


def is_admin_session() -> bool:
    user = get_authenticated_user()
    return bool(user and user.get('role') == ROLE_ADMIN)


def login_session(user: dict) -> None:
    session.clear()
    session.permanent = True
    session['user_email'] = user.get('email')
    session['user_role'] = user.get('role', ROLE_PATIENT)


def logout_session() -> None:
    session.clear()
