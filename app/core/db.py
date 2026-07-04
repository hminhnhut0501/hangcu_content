from functools import lru_cache
from pathlib import Path
from typing import Any

from supabase import Client, create_client
import psycopg

from app.core.config import settings


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase is not configured")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def load_sql_file(path: str | Path) -> str:
    return Path(path).read_text(encoding="utf-8")


def run_sql_script(client: Client, sql: str) -> Any:
    """
    Execute raw SQL against the Supabase Postgres connection string when available.
    Falls back to a no-op instruction if no direct DB URL is configured.
    """
    db_url = getattr(settings, "supabase_db_url", "") or ""
    if not db_url:
        return {"sql": sql, "note": "set SUPABASE_DB_URL to run migrations automatically"}
    statements = [part.strip() for part in sql.split(";") if part.strip()]
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            for statement in statements:
                cur.execute(statement)
        conn.commit()
    return {"ok": True}
