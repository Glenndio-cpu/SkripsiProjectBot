#!/usr/bin/env python3
"""Run explicit SQL migrations in backend/migrations."""

import hashlib
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
MIGRATIONS_DIR = BASE_DIR / 'migrations'

# Allow importing app package when script is run directly.
sys.path.insert(0, str(BASE_DIR))

from app.db import get_connection  # noqa: E402


def _checksum(content: str) -> str:
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def _split_sql_statements(sql_text: str) -> list[str]:
    statements = []
    buffer = []

    for raw_line in sql_text.splitlines():
        line = raw_line.strip()

        if not line or line.startswith('--'):
            continue

        buffer.append(raw_line)
        if line.endswith(';'):
            stmt = '\n'.join(buffer).strip()
            if stmt.endswith(';'):
                stmt = stmt[:-1]
            if stmt:
                statements.append(stmt)
            buffer = []

    if buffer:
        stmt = '\n'.join(buffer).strip()
        if stmt:
            statements.append(stmt)

    return statements


def _ensure_migration_table(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                checksum CHAR(64) NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """
        )


def _get_applied_migrations(conn) -> dict[str, str]:
    with conn.cursor() as cur:
        cur.execute('SELECT filename, checksum FROM schema_migrations ORDER BY id')
        rows = cur.fetchall()
        return {row['filename']: row['checksum'] for row in rows}


def run() -> int:
    if not MIGRATIONS_DIR.exists():
        print(f'No migration directory found: {MIGRATIONS_DIR}')
        return 1

    migration_files = sorted(MIGRATIONS_DIR.glob('*.sql'))
    if not migration_files:
        print('No SQL migrations found.')
        return 0

    conn = get_connection()
    try:
        _ensure_migration_table(conn)
        applied = _get_applied_migrations(conn)

        for migration_file in migration_files:
            filename = migration_file.name
            content = migration_file.read_text(encoding='utf-8')
            checksum = _checksum(content)

            if filename in applied:
                if applied[filename] != checksum:
                    print(f'ERROR: checksum mismatch for applied migration: {filename}')
                    return 2
                print(f'SKIP: {filename} (already applied)')
                continue

            statements = _split_sql_statements(content)
            if not statements:
                print(f'SKIP: {filename} (empty migration)')
                continue

            print(f'APPLY: {filename}')
            with conn.cursor() as cur:
                for stmt in statements:
                    cur.execute(stmt)
                cur.execute(
                    'INSERT INTO schema_migrations (filename, checksum) VALUES (%s, %s)',
                    (filename, checksum),
                )

        print('Migrations finished successfully.')
        return 0
    finally:
        conn.close()


if __name__ == '__main__':
    raise SystemExit(run())
