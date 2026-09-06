import { supabase } from "@/src/lib/supabase";
import type { DailyPlan, ExecutionEvent, Settings } from "@/src/types";
import type { Snapshot } from "./types";
import { userId } from "./userId";
async function allRows(table: string, id: string, order: string) {
  const query = () => supabase.from(table).select("*").eq("user_id", id).order(order).order(table === "deleted_records" ? "table_name" : "id");
  const first = await query().range(0, 999);
  if (first.error) throw first.error;
  const rows = first.data ?? [];
  let count = rows.length;
  while (count === 1000) {
    const page = await query().range(rows.length, rows.length + 999);
    if (page.error) throw page.error;
    count = page.data?.length ?? 0;
    rows.push(...(page.data ?? []));
  }
  return { ...first, data: rows };
}

export async function pullSnapshot(): Promise<Snapshot | null> {
  const id = await userId();

  const [profile, categories, templates, resources, plans, events, places, tasks, deletions] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    allRows("categories", id, "created_at"),
    allRows("routine_templates", id, "created_at"),
    allRows("resources", id, "created_at"),
    allRows("daily_plans", id, "date_key"),
    allRows("execution_events", id, "happened_at"),
    allRows("saved_places", id, "created_at"),
    allRows("reminder_tasks", id, "created_at"),
    allRows("deleted_records", id, "record_id"),
  ]);

  for (const result of [profile, categories, templates, resources, plans, events, places, tasks, deletions]) {
    if (result.error) throw result.error;
  }

  const hasRows = Boolean(profile.data) || Boolean(categories.data?.length || templates.data?.length || resources.data?.length || plans.data?.length || events.data?.length || places.data?.length || tasks.data?.length);
  if (!hasRows) return null;

  const settings: Settings = {
    displayName: profile.data?.display_name ?? "",
    avatarUrl: profile.data?.avatar_url ?? undefined,
    localAvatarUri: undefined,
    themeMode: profile.data?.theme_mode === "light" ? "light" : "dark",
    soundEnabled: profile.data?.sound_enabled ?? true,
    startReminderMinutes: profile.data?.start_reminder_minutes ?? 10,
    endReminderMinutes: profile.data?.end_reminder_minutes ?? 5,
    onboardingCompleted: profile.data?.onboarding_completed ?? true,
  };

  return {
    deletedRecords: (deletions.data ?? []).map((row) => ({ table: row.table_name, id: row.record_id, deletedAt: row.deleted_at })),
    settings,
    categories: (categories.data ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      color: row.color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    templates: (templates.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      dayRules: row.day_rules ?? [],
      blocks: row.blocks ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    resources: (resources.data ?? []).map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      title: row.title,
      type: row.type === "youtube-video" ? "youtube-video" : "youtube-playlist",
      url: row.url ?? undefined,
      chunkMinutes: row.chunk_minutes ?? undefined,
      items: row.items ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    plans: Object.fromEntries(
      (plans.data ?? []).map((row) => [
        row.date_key,
        {
          id: row.id,
          date: row.date_key,
          templateId: row.template_id ?? undefined,
          status: row.status === "locked" ? "locked" : "draft",
          blocks: row.blocks ?? [],
          lockedAt: row.locked_at ?? undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        } satisfies DailyPlan,
      ]),
    ),
    executionEvents: (events.data ?? []).map((row) => ({
      id: row.id,
      date: row.date_key,
      blockId: row.block_id,
      resourceItemId: row.resource_item_id ?? undefined,
      type: row.type,
      happenedAt: row.happened_at,
    })) as ExecutionEvent[],
    places: (places.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address ?? undefined,
      providerId: row.provider_id ?? undefined,
      latitude: row.latitude,
      longitude: row.longitude,
      radiusMeters: row.radius_meters ?? 100,
      isHome: row.is_home ?? false,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? row.created_at,
    })),
    tasks: (tasks.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      placeId: row.place_id,
      completed: row.completed ?? false,
      createdAt: row.created_at,
      completedAt: row.completed_at ?? undefined,
      updatedAt: row.updated_at ?? row.completed_at ?? row.created_at,
    })),
    lastSyncedAt: profile.data?.updated_at ?? undefined,
  };
}
