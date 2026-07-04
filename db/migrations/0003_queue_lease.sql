alter table if exists queue_jobs
add column if not exists lock_expires_at timestamptz;

alter table if exists queue_jobs
add column if not exists next_retry_at timestamptz;

