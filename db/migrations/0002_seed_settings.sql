insert into settings (key, value)
values
  ('app_timezone', '"Asia/Ho_Chi_Minh"'::jsonb),
  ('default_concurrency', '1'::jsonb),
  ('default_retry_attempts', '3'::jsonb),
  ('default_delay_min', '1'::jsonb),
  ('default_delay_max', '7'::jsonb)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

