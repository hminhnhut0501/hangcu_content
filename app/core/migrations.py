from pathlib import Path

from app.core.db import get_supabase_client, load_sql_file, run_sql_script


MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "db" / "migrations"


def list_migration_files() -> list[Path]:
    return sorted(p for p in MIGRATIONS_DIR.glob("*.sql") if p.is_file())


def get_applied_versions() -> set[str]:
    client = get_supabase_client()
    rows = client.table("schema_migrations").select("version").execute().data or []
    return {row["version"] for row in rows}


def mark_migration_applied(version: str):
    client = get_supabase_client()
    client.table("schema_migrations").upsert({"version": version}).execute()


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

