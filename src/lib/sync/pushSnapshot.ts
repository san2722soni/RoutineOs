import { mergeDeletions, withoutDeleted } from "@/src/lib/deletions";
import { getDeviceId } from "@/src/lib/deviceSession";
import { supabase } from "@/src/lib/supabase";
import type { DailyPlan } from "@/src/types";
import { pullSnapshot } from "./pullSnapshot";
import type { Snapshot } from "./types";
import { userId } from "./userId";
function uniqueBy<T>(items: T[], key: (item: T) => string) {
  return [...new Map(items.map((item) => [key(item), item])).values()];
}
function newer<T extends { id: string; updatedAt: string }>(local: T[], remote: T[] = []) {
  const rows = new Map(remote.map((item) => [item.id, item]));
  for (const item of local) {
    const existing = rows.get(item.id);
    if (!existing || Date.parse(item.updatedAt) >= Date.parse(existing.updatedAt)) rows.set(item.id, item);
  }
  return [...rows.values()];
}
function newerPlans(local: Record<string, DailyPlan>, remote: Record<string, DailyPlan> = {}) {
  const plans = { ...remote };
  for (const [date, plan] of Object.entries(local)) {
    if (!plans[date] || Date.parse(plan.updatedAt) >= Date.parse(plans[date].updatedAt)) plans[date] = plan;
  }
  return plans;
}
export async function pushSnapshot(snapshot: Snapshot) {
  const id = await userId();
  const now = new Date().toISOString();
  const remote = await pullSnapshot();
  const merged = remote
    ? {
      ...snapshot,
      categories: newer(snapshot.categories, remote.categories),
      templates: newer(snapshot.templates, remote.templates),
      resources: newer(snapshot.resources, remote.resources),
      plans: newerPlans(snapshot.plans, remote.plans),
      executionEvents: uniqueBy([...remote.executionEvents, ...snapshot.executionEvents], (event) => event.id),
      places: newer(snapshot.places, remote.places),
      tasks: newer(snapshot.tasks, remote.tasks),
    }
    : snapshot;
  const deleted = mergeDeletions(snapshot.deletedRecords ?? [], remote?.deletedRecords ?? []);
  merged.categories = withoutDeleted("categories", merged.categories, deleted);
  merged.templates = withoutDeleted("routine_templates", merged.templates, deleted);
  merged.resources = withoutDeleted("resources", merged.resources, deleted);
  merged.plans = Object.fromEntries(withoutDeleted("daily_plans", Object.values(merged.plans), deleted).map((plan) => [plan.date, plan]));
  merged.places = withoutDeleted("saved_places", merged.places, deleted);
  merged.tasks = withoutDeleted("reminder_tasks", merged.tasks, deleted);
  const payload: Record<string, unknown> = {};
  const upsertRows = async (table: string, rows: Record<string, unknown>[]) => {
    payload[table] = withoutDeleted(table, rows as ({ id: string } & Record<string, unknown>)[], deleted);
  };

  {
    payload.profiles = {
      id,
      display_name: snapshot.settings.displayName?.trim() || "RoutineOS",
      avatar_url: snapshot.settings.avatarUrl ?? null,
      theme_mode: snapshot.settings.themeMode,
      sound_enabled: snapshot.settings.soundEnabled,
      start_reminder_minutes: snapshot.settings.startReminderMinutes,
      end_reminder_minutes: snapshot.settings.endReminderMinutes,
      onboarding_completed: snapshot.settings.onboardingCompleted,
      updated_at: now,
    };
  }

  await upsertRows(
    "categories",
    uniqueBy(merged.categories, (category) => category.label.trim().toLowerCase()).map((category) => ({
      id: category.id,
      user_id: id,
      label: category.label,
      color: category.color,
      created_at: category.createdAt,
      updated_at: category.updatedAt,
    })),
  );

  await upsertRows(
    "routine_templates",
    merged.templates.map((template) => ({
      id: template.id,
      user_id: id,
      name: template.name,
      description: template.description ?? null,
      day_rules: template.dayRules,
      blocks: template.blocks,
      created_at: template.createdAt,
      updated_at: template.updatedAt,
    })),
  );

  await upsertRows(
    "resources",
    uniqueBy(merged.resources, (resource) => `${resource.categoryId}:${resource.type}`).map((resource) => ({
      id: resource.id,
      user_id: id,
      category_id: resource.categoryId,
      title: resource.title,
      type: resource.type,
      url: resource.url ?? null,
      chunk_minutes: resource.chunkMinutes ?? null,
      items: resource.items,
      created_at: resource.createdAt,
      updated_at: resource.updatedAt,
    })),
  );

  await upsertRows(
    "daily_plans",
    Object.values(merged.plans).map((plan) => ({
      id: plan.id,
      user_id: id,
      date_key: plan.date,
      template_id: plan.templateId ?? null,
      status: plan.status,
      blocks: plan.blocks,
      locked_at: plan.lockedAt ?? null,
      created_at: plan.createdAt,
      updated_at: plan.updatedAt,
    })),
  );

  await upsertRows(
    "execution_events",
    merged.executionEvents.map((event) => ({
      id: event.id,
      user_id: id,
      date_key: event.date,
      block_id: event.blockId,
      resource_item_id: event.resourceItemId ?? null,
      type: event.type,
      happened_at: event.happenedAt,
    })),
  );

  await upsertRows("saved_places", merged.places.map((place) => ({
    id: place.id,
    user_id: id,
    name: place.name,
    address: place.address ?? null,
    provider_id: place.providerId ?? null,
    latitude: place.latitude,
    longitude: place.longitude,
    radius_meters: place.radiusMeters,
    is_home: place.isHome ?? false,
    created_at: place.createdAt,
    updated_at: place.updatedAt,
  })));

  await upsertRows("reminder_tasks", merged.tasks.map((task) => ({
    id: task.id,
    user_id: id,
    title: task.title,
    place_id: task.placeId,
    completed: task.completed,
    created_at: task.createdAt,
    completed_at: task.completedAt ?? null,
    updated_at: task.updatedAt,
  })));
  payload.deleted_records = deleted.map((row) => ({ user_id: id, table_name: row.table, record_id: row.id, deleted_at: row.deletedAt }));
  const { error } = await supabase.rpc("routineos_push_snapshot", { p_device_id: await getDeviceId(), p_snapshot: payload });
  if (error) throw new Error(error.message);
  return { ...merged, deletedRecords: deleted };

}
