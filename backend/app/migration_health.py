"""Helpers for migration health/status reporting."""

from pathlib import Path

from app.db import query


MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / 'migrations'


def _list_migration_files() -> list[str]:
    if not MIGRATIONS_DIR.exists():
        return []
    return sorted([p.name for p in MIGRATIONS_DIR.glob('*.sql')])


def get_migration_health() -> dict:
    all_files = _list_migration_files()

    try:
        applied_rows = query(
            'SELECT filename, checksum, executed_at FROM schema_migrations ORDER BY id ASC'
        )
    except Exception as exc:
        return {
            'ok': False,
            'status': 'schema_migrations_unavailable',
            'error': str(exc),
            'availableMigrations': all_files,
            'appliedCount': 0,
            'pendingCount': len(all_files),
            'pendingMigrations': all_files,
            'latestApplied': None,
        }

    applied_files = [row['filename'] for row in applied_rows]
    pending = [name for name in all_files if name not in set(applied_files)]

    latest = applied_rows[-1] if applied_rows else None
    latest_applied = None
    if latest:
        latest_applied = {
            'filename': latest['filename'],
            'executedAt': latest['executed_at'].isoformat() if hasattr(latest['executed_at'], 'isoformat') else latest['executed_at'],
            'checksum': latest.get('checksum'),
        }

    return {
        'ok': len(pending) == 0,
        'status': 'up_to_date' if len(pending) == 0 else 'pending_migrations',
        'availableMigrations': all_files,
        'appliedCount': len(applied_files),
        'appliedMigrations': applied_files,
        'pendingCount': len(pending),
        'pendingMigrations': pending,
        'latestApplied': latest_applied,
    }
