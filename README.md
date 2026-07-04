# Content Hub OS

Backend foundation for a Telegram content hub and channel growth tool.

## Stack

- FastAPI
- Supabase Postgres
- Render deployment

## Local Dev

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Environment

Required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

Optional:

- `APP_NAME`
- `APP_ENV`
- `APP_TIMEZONE`
- `PORT`
- `ADMIN_UI_URL`
- `BOOTSTRAP_OWNER_EMAIL`
- `BOOTSTRAP_OWNER_PASSWORD`
- `TG_API_ID`
- `TG_API_HASH`
- `TG_STRING_SESSION`

## Deploy Checklist

### Supabase

1. Create a Supabase project.
2. Copy the project URL into `SUPABASE_URL`.
3. Copy the service role key into `SUPABASE_SERVICE_ROLE_KEY`.
4. Copy the Postgres connection string into `SUPABASE_DB_URL`.
5. Run the SQL migrations in this order:
   1. `db/migrations/0001_init.sql`
   2. `db/migrations/0002_seed_settings.sql`
   3. `db/migrations/0003_queue_lease.sql`
   4. `db/migrations/0004_auth_rbac.sql`
   5. `db/migrations/0005_content_rls.sql`
   6. `db/migrations/0006_aux_rls.sql`
   7. `db/migrations/0007_fix_content_uuid_schema.sql`
   8. `db/migrations/0008_anti_ban_guard.sql`
6. Enable the auth provider you want to use.
7. Create the first user or set bootstrap env vars for auto-owner creation.

### Render Web

1. Create a new Render web service from GitHub repo `hminhnhut0501/hangcu_content`.
2. Set:
   - `Build Command`: `pip install -r requirements.txt`
   - `Start Command`: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Set env vars:
   - `APP_NAME=Content Hub OS`
   - `APP_ENV=production`
   - `APP_TIMEZONE=Asia/Ho_Chi_Minh`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_DB_URL`
   - `ADMIN_UI_URL` nếu admin-ui deploy tách riêng
   - `BOOTSTRAP_OWNER_EMAIL` if needed
   - `BOOTSTRAP_OWNER_PASSWORD` if needed
4. Deploy and confirm `/` loads.

### Render Worker

1. Create a second Render service of type `worker`.
2. Use the same repo and same env vars as web.
3. Set:
   - `Build Command`: `pip install -r requirements.txt`
   - `Start Command`: `python worker.py`
4. Deploy and confirm the worker starts cleanly.

### First Login

1. Open the Render web URL.
2. If there is no owner, use the bootstrap login card.
3. Sign in with the bootstrap owner account.
4. Confirm the `Admin` tab appears.
5. Invite a second user and check role changes work.

### Smoke Test

1. Create a group.
2. Create a topic.
3. Create a campaign.
4. Run scheduler tick.
5. Open Runs / Jobs drawer.
6. Check Logs and Admin tabs.
