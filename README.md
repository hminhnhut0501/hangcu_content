# Content Hub OS

Backend foundation for a Telegram content hub and channel growth tool.

## Stack

- FastAPI
- Supabase Postgres
- Render deployment

## Local dev

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

Optional:

- `APP_NAME`
- `APP_ENV`
- `APP_TIMEZONE`
- `PORT`
- `TG_API_ID`
- `TG_API_HASH`
- `TG_STRING_SESSION`

