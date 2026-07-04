import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "Content Hub OS")
    app_env: str = os.getenv("APP_ENV", "development")
    app_timezone: str = os.getenv("APP_TIMEZONE", "Asia/Ho_Chi_Minh")
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    supabase_db_url: str = os.getenv("SUPABASE_DB_URL", "")
    bootstrap_owner_email: str = os.getenv("BOOTSTRAP_OWNER_EMAIL", "")
    bootstrap_owner_password: str = os.getenv("BOOTSTRAP_OWNER_PASSWORD", "")


settings = Settings()
