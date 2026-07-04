from pathlib import Path

import psycopg

from app.core.config import settings
from app.core.db import get_supabase_client, load_sql_file, run_sql_script


MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "db" / "migrations"


def list_migration_files() -> list[Path]:
    return sorted(p for p in MIGRATIONS_DIR.glob("*.sql") if p.is_file())


def get_applied_versions() -> set[str]:
    db_url = settings.supabase_db_url
    if not db_url:
        return set()
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select column_name
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'schema_migrations'
                order by ordinal_position
                """
            )
            columns = [row[0] for row in cur.fetchall()]
            if "version" not in columns:
                cur.execute(
                    """
                    create table if not exists schema_migrations (
                      version text primary key,
                      applied_at timestamptz not null default now()
                    )
                    """
                )
                conn.commit()
                return set()
            cur.execute("select version from schema_migrations")
            return {row[0] for row in cur.fetchall()}


def mark_migration_applied(version: str):
    db_url = settings.supabase_db_url
    if not db_url:
        return
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into schema_migrations (version, applied_at)
                values (%s, now())
                on conflict (version) do update
                  set applied_at = excluded.applied_at
                """,
                (version,),
            )
        conn.commit()


def migrate():
    client = get_supabase_client()
    applied = get_applied_versions()
    applied_now = []
    for path in list_migration_files():
        version = path.stem
        if version in applied:
            continue
        sql = load_sql_file(path)
        run_sql_script(client, sql)
        mark_migration_applied(version)
        applied_now.append(version)
    return applied_now
