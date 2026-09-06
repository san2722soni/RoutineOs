-- DESTRUCTIVE: clears RoutineOS test data and all auth users.
-- Use only in a dedicated test Supabase project.

begin;

delete from reminder_tasks;
delete from saved_places;
delete from device_sessions;
delete from execution_events;
delete from daily_plans;
delete from resources;
delete from routine_templates;
delete from categories;
delete from profiles;
delete from auth.users;

commit;