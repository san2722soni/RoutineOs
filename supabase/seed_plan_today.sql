-- RoutineOS Planner + Today test seed.
-- Run schema.sql first, sign in once, then run this file.
-- Change target_email to the email used by the test device.
-- This replaces only that user's planning data and keeps the auth account.

do $$
declare
  target_email text := 'invictusasw7@gmail.com';
  uid uuid;
  category_study uuid := '51000000-0000-4000-8000-000000000001';
  category_work uuid := '51000000-0000-4000-8000-000000000002';
  category_recovery uuid := '51000000-0000-4000-8000-000000000003';
  category_fitness uuid := '51000000-0000-4000-8000-000000000004';
  template_id uuid := '52000000-0000-4000-8000-000000000001';
  today_date date := current_date;
  tomorrow_date date := current_date + 1;
begin
  select id into uid
  from auth.users
  where lower(email) = lower(target_email)
  order by created_at desc
  limit 1;

  if uid is null then
    raise exception 'No auth user found for %. Sign in once, then run this seed.', target_email;
  end if;

  delete from execution_events where user_id = uid;
  delete from daily_plans where user_id = uid;
  delete from resources where user_id = uid;
  delete from routine_templates where user_id = uid;
  delete from categories where user_id = uid;

  insert into profiles (
    id, display_name, theme_mode, sound_enabled, start_reminder_minutes,
    end_reminder_minutes, reminder_retention_minutes, onboarding_completed, updated_at
  ) values (
    uid, 'RoutineOS Tester', 'dark', true, 10, 5, 30, true, now()
  ) on conflict (id) do update set
    display_name = excluded.display_name,
    theme_mode = excluded.theme_mode,
    sound_enabled = excluded.sound_enabled,
    start_reminder_minutes = excluded.start_reminder_minutes,
    end_reminder_minutes = excluded.end_reminder_minutes,
    reminder_retention_minutes = excluded.reminder_retention_minutes,
    onboarding_completed = true,
    updated_at = now();

  insert into categories (id, user_id, label, color, created_at, updated_at)
  values
    (category_study, uid, 'Study', '#38BDF8', now(), now()),
    (category_work, uid, 'Work', '#F59E0B', now(), now()),
    (category_recovery, uid, 'Recovery', '#A78BFA', now(), now()),
    (category_fitness, uid, 'Fitness', '#34D399', now(), now());

  insert into resources (id, user_id, category_id, title, type, url, chunk_minutes, items, created_at, updated_at)
  values
    ('53000000-0000-4000-8000-000000000001', uid, category_study, 'Planner test videos', 'youtube-playlist', 'https://www.youtube.com/playlist?list=PLtest', 30,
      '[{"id":"seed-plan-video-1","title":"Planning and prioritization","url":"https://www.youtube.com/watch?v=seed-plan-video-1","durationSeconds":1800,"order":0,"completed":false},{"id":"seed-plan-video-2","title":"Focus and execution","url":"https://www.youtube.com/watch?v=seed-plan-video-2","durationSeconds":2100,"order":1,"completed":false}]'::jsonb, now(), now());

  insert into routine_templates (id, user_id, name, description, day_rules, blocks, created_at, updated_at)
  values (
    template_id, uid, 'Planner and Today test routine', 'Small current-date routine for testing Planner and Today.', array[0,1,2,3,4,5,6],
    format('[
      {"id":"seed-morning","start":"06:00","end":"08:00","categoryId":"%s","label":"Morning study"},
      {"id":"seed-work","start":"09:00","end":"11:00","categoryId":"%s","label":"Work sprint"},
      {"id":"seed-recovery","start":"12:00","end":"13:00","categoryId":"%s","label":"Lunch and recovery"},
      {"id":"seed-fitness","start":"17:00","end":"18:00","categoryId":"%s","label":"Fitness"}
    ]', category_study, category_work, category_recovery, category_fitness)::jsonb,
    now(), now()
  );

  insert into daily_plans (id, user_id, date_key, template_id, status, blocks, locked_at, created_at, updated_at)
  values
    (
      gen_random_uuid(), uid, today_date, template_id, 'locked',
      format('[
        {"id":"%s-morning","templateBlockId":"seed-morning","categoryId":"%s","start":"06:00","end":"08:00","title":"Morning study","goal":"Complete one focused study session.","notes":"Open Today and mark this done or skipped.","resourceItemIds":["seed-plan-video-1"],"status":"pending"},
        {"id":"%s-work","templateBlockId":"seed-work","categoryId":"%s","start":"09:00","end":"11:00","title":"Work sprint","goal":"Finish one meaningful piece of work.","notes":"Test the active block and timeline.","resourceItemIds":[],"status":"pending"},
        {"id":"%s-recovery","templateBlockId":"seed-recovery","categoryId":"%s","start":"12:00","end":"13:00","title":"Lunch and recovery","goal":"Eat, hydrate, and take a real break.","notes":"Test a completed daily block.","resourceItemIds":[],"status":"done"},
        {"id":"%s-fitness","templateBlockId":"seed-fitness","categoryId":"%s","start":"17:00","end":"18:00","title":"Fitness","goal":"Complete a short workout.","notes":"This block is later in Today.","resourceItemIds":[],"status":"pending"}
      ]', today_date, category_study, today_date, category_work, today_date, category_recovery, today_date, category_fitness)::jsonb,
      now(), now(), now()
    ),
    (
      gen_random_uuid(), uid, tomorrow_date, template_id, 'draft',
      format('[
        {"id":"%s-morning","templateBlockId":"seed-morning","categoryId":"%s","start":"06:00","end":"08:00","title":"Morning study","goal":"Complete one focused study session.","notes":"Edit this block in Planner.","resourceItemIds":["seed-plan-video-1"],"status":"pending"},
        {"id":"%s-work","templateBlockId":"seed-work","categoryId":"%s","start":"09:00","end":"11:00","title":"Work sprint","goal":"Finish one meaningful piece of work.","notes":"Edit and finalize this block.","resourceItemIds":[],"status":"pending"},
        {"id":"%s-recovery","templateBlockId":"seed-recovery","categoryId":"%s","start":"12:00","end":"13:00","title":"Lunch and recovery","goal":"Eat, hydrate, and take a real break.","notes":"Edit this block in Planner.","resourceItemIds":[],"status":"pending"},
        {"id":"%s-fitness","templateBlockId":"seed-fitness","categoryId":"%s","start":"17:00","end":"18:00","title":"Fitness","goal":"Complete a short workout.","notes":"Edit this block in Planner.","resourceItemIds":[],"status":"pending"}
      ]', tomorrow_date, category_study, tomorrow_date, category_work, tomorrow_date, category_recovery, tomorrow_date, category_fitness)::jsonb,
      now(), now(), now()
    );

  perform pg_notify('pgrst', 'reload schema');
end $$;