-- Demo data for the unified Group -> Topic -> Campaign -> Run -> Queue flow.
-- Run manually in Supabase SQL Editor when you want disposable test data.

do $$
declare
  group_id uuid;
  topic_id uuid;
  campaign_id uuid;
  run_id uuid;
begin
  insert into content_groups (
    name,
    source_key,
    source_link,
    target_link,
    auto_enabled,
    auto_slots,
    auto_pick_count,
    auto_strategy,
    status
  )
  values (
    'Demo Nuoi Kenh',
    'demo-nuoi-kenh',
    'https://t.me/source_demo',
    'https://t.me/target_demo',
    true,
    '09:00,13:30,20:00',
    1,
    'round_robin',
    'active'
  )
  returning id into group_id;

  insert into content_topics (
    group_id,
    name,
    source_topic_id,
    target_topic_id,
    target_link_seed,
    sort_order,
    status
  )
  values (
    group_id,
    'Demo Topic Campaign Con',
    101,
    202,
    'https://t.me/c/1234567890/202',
    10,
    'active'
  )
  returning id into topic_id;

  insert into content_campaigns (
    group_id,
    topic_id,
    title,
    source_start_link,
    source_end_link,
    follow_latest,
    target_link,
    caption,
    group_mode,
    order_mode,
    batch_size,
    delay_min,
    delay_max,
    enabled,
    status,
    schedule_enabled,
    schedule_slots,
    next_run_at
  )
  values (
    group_id,
    topic_id,
    'Demo Campaign Auto Schedule',
    'https://t.me/c/1234567890/100',
    'https://t.me/c/1234567890/120',
    true,
    'https://t.me/target_demo',
    'Demo caption tu Content Hub OS',
    'keep',
    'auto',
    1,
    1,
    7,
    true,
    'scheduled',
    true,
    '09:00,13:30,20:00',
    now() + interval '15 minutes'
  )
  returning id into campaign_id;

  insert into campaign_runs (
    campaign_id,
    slot_key,
    scheduled_at,
    status,
    selected_topic_ids,
    queued_items
  )
  values (
    campaign_id,
    'demo-seed',
    now(),
    'queued',
    jsonb_build_array(topic_id),
    1
  )
  returning id into run_id;

  insert into queue_jobs (
    job_type,
    group_id,
    topic_id,
    campaign_id,
    priority,
    status,
    scheduled_at,
    payload
  )
  values (
    'run_campaign',
    group_id,
    topic_id,
    campaign_id,
    100,
    'pending',
    now(),
    jsonb_build_object('campaign_id', campaign_id, 'campaign_run_id', run_id, 'seed', true)
  );

  insert into content_events (
    group_id,
    topic_id,
    campaign_id,
    level,
    code,
    message,
    payload
  )
  values (
    group_id,
    topic_id,
    campaign_id,
    'info',
    'demo_seed_created',
    'Demo unified content flow was seeded',
    jsonb_build_object('run_id', run_id)
  );
end $$;
