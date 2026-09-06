-- RoutineOS destructive reset.
-- Removes the complete app schema, avatar bucket data, and every auth account.
-- Supabase system tables remain because the platform requires them.

begin;

drop function if exists public.routineos_push_snapshot(text, jsonb);
drop function if exists public.routineos_cleanup_stale_devices(integer);
drop function if exists public.routineos_is_active_device(text);
drop function if exists public.routineos_delete_device(text);
drop function if exists public.routineos_activate_device(text);

drop table if exists public.reminder_tasks cascade;
drop table if exists public.saved_places cascade;
drop table if exists public.execution_events cascade;
drop table if exists public.daily_plans cascade;
drop table if exists public.resources cascade;
drop table if exists public.routine_templates cascade;
drop table if exists public.categories cascade;
drop table if exists public.deleted_records cascade;
drop table if exists public.device_sessions cascade;
drop table if exists public.profiles cascade;

-- Supabase cascades this to identities, sessions, refresh tokens, MFA records,
-- and other authentication records owned by each account.
delete from auth.users;

commit;

select pg_notify('pgrst', 'reload schema');
