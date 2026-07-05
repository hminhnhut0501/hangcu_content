alter table if exists content_campaigns
  add column if not exists last_target_post_id bigint not null default 0;
