# Render + Supabase Checklist

## Supabase

- [ ] Create the project
- [ ] Save `SUPABASE_URL`
- [ ] Save `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Save `SUPABASE_DB_URL`
- [ ] Run migrations `0001` through `0007`
- [ ] Enable Auth provider
- [ ] Bootstrap the first owner

## Render Web

- [ ] Create web service from repo
- [ ] Set `Build Command` to `pip install -r requirements.txt`
- [ ] Set `Start Command` to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] Set `APP_ENV=production`
- [ ] Set `APP_TIMEZONE=Asia/Ho_Chi_Minh`
- [ ] Set all Supabase env vars
- [ ] Set bootstrap env vars if needed
- [ ] Deploy and verify login

## Render Worker

- [ ] Create worker service from same repo
- [ ] Set `Build Command` to `pip install -r requirements.txt`
- [ ] Set `Start Command` to `python worker.py`
- [ ] Use same env vars as web
- [ ] Verify worker is healthy

## Smoke Test

- [ ] Login works
- [ ] Admin tab visible for owner/admin
- [ ] Invite user works
- [ ] Role update works
- [ ] Create group/topic/campaign works
- [ ] Scheduler tick queues jobs
- [ ] Runs/Jobs view opens
