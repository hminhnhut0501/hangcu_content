# Render + Supabase Quickstart

Làm đúng theo thứ tự dưới đây.

## 1. Supabase

1. Vào [Supabase](https://supabase.com) và tạo project mới.
2. Chờ project provision xong.
3. Vào `Project Settings` -> `API`.
4. Copy:
   - `Project URL` -> dán vào `SUPABASE_URL`
   - `service_role` key -> dán vào `SUPABASE_SERVICE_ROLE_KEY`
5. Vào `Project Settings` -> `Database`.
6. Copy connection string -> dán vào `SUPABASE_DB_URL`.
7. Vào `SQL Editor`.
8. Chạy lần lượt các file:
   - `db/migrations/0001_init.sql`
   - `db/migrations/0002_seed_settings.sql`
   - `db/migrations/0003_queue_lease.sql`
   - `db/migrations/0004_auth_rbac.sql`
   - `db/migrations/0005_content_rls.sql`
   - `db/migrations/0006_aux_rls.sql`
   - `db/migrations/0007_fix_content_uuid_schema.sql`
   - `db/migrations/0008_anti_ban_guard.sql`
   - `db/migrations/0009_phase9_cleanup.sql`
9. Vào `Authentication` -> `Providers`.
10. Bật provider bạn muốn dùng.
11. Tạo user đầu tiên bằng `Authentication` -> `Users` hoặc set bootstrap env ở Render.

## 2. Render Web

1. Vào [Render](https://render.com).
2. Chọn `New` -> `Web Service`.
3. Kết nối repo `hminhnhut0501/hangcu_content`.
4. Chọn branch `main`.
5. Đặt:
   - `Build Command`: `pip install -r requirements.txt`
   - `Start Command`: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Thêm env vars:
   - `APP_NAME=Content Hub OS`
   - `APP_ENV=production`
   - `APP_TIMEZONE=Asia/Ho_Chi_Minh`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_DB_URL`
   - `BOOTSTRAP_OWNER_EMAIL` nếu cần
   - `BOOTSTRAP_OWNER_PASSWORD` nếu cần
7. Bấm `Create Web Service`.
8. Chờ deploy xong.
9. Mở URL web và kiểm tra trang login.

## 3. Render Worker

1. Vào Render.
2. Chọn `New` -> `Background Worker`.
3. Chọn cùng repo và branch `main`.
4. Đặt:
   - `Build Command`: `pip install -r requirements.txt`
   - `Start Command`: `python worker.py`
5. Copy toàn bộ env vars từ web service sang worker.
6. Bấm `Create Worker`.
7. Chờ worker lên xanh.

## 4. Login lần đầu

1. Mở URL web service.
2. Nếu chưa có owner, dùng khung bootstrap.
3. Nhập email/password owner.
4. Bấm `Sign in / Bootstrap`.
5. Kiểm tra thấy tab `Admin`.

## 5. Smoke test nhanh

1. Vào `Content Hub`.
2. Tạo 1 `Group`.
3. Tạo 1 `Topic`.
4. Tạo 1 `Campaign`.
5. Vào `Dashboard` và bấm `Run scheduler tick`.
6. Mở `Runs / Jobs`.
7. Vào `Admin` và thử invite 1 user.
