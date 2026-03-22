"""Chat history persistence – save/load from chat_history table."""

from app.db import query, execute


def save_message(email: str, role: str, content: str, mode: str = 'consultation'):
    """Save a single chat message to database."""
    execute(
        'INSERT INTO chat_history (email, role, content, mode) VALUES (%s, %s, %s, %s)',
        (email, role, content, mode),
    )


def get_history(email: str, mode: str = 'consultation', limit: int = 50) -> list:
    """Load recent chat history for a user."""
    rows = query(
        'SELECT role, content, created_at AS createdAt '
        'FROM chat_history WHERE email = %s AND mode = %s '
        'ORDER BY created_at DESC LIMIT %s',
        (email, mode, limit),
    )
    rows.reverse()
    result = []
    for r in rows:
        created = r.get('createdAt')
        result.append({
            'role': r['role'],
            'content': r['content'],
            'createdAt': created.isoformat() if hasattr(created, 'isoformat') else created,
        })
    return result


def clear_history(email: str, mode: str = None):
    """Clear chat history for a user. If mode is None, clear all modes."""
    if mode:
        execute('DELETE FROM chat_history WHERE email = %s AND mode = %s', (email, mode))
    else:
        execute('DELETE FROM chat_history WHERE email = %s', (email,))


def get_history_count(email: str) -> dict:
    """Get count of messages per mode for a user."""
    rows = query(
        'SELECT mode, COUNT(*) AS cnt FROM chat_history WHERE email = %s GROUP BY mode',
        (email,),
    )
    result = {}
    for r in rows:
        result[r['mode']] = r['cnt']
    return result
