import type { Category, DailyPlan, ExecutionEvent, ReminderTask, Resource, RoutineTemplate, SavedPlace, Settings } from "@/src/types";
import { missingSupabaseEnv } from "@/src/lib/env";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";

export type Snapshot = {
  settings: Settings;
  categories: Category[];
  templates: RoutineTemplate[];
  resources: Resource[];
  plans: Record<string, DailyPlan>;
  executionEvents: ExecutionEvent[];
  places: SavedPlace[];
  tasks: ReminderTask[];
  lastSyncedAt?: string;
};

async function userId() {
  if (!isSupabaseConfigured) throw new Error(`Missing ${missingSupabaseEnv().join(", ")} in .env.`);

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Sign in before syncing.");
  return data.user.id;
}

async function upsertRows(table: "categories" | "routine_templates" | "resources" | "daily_plans" | "execution_events" | "saved_places" | "reminder_tasks", rows: Record<string, unknown>[]) {
  const uniqueRows = [...new Map(rows.map((row) => [String(row.id), row])).values()];
  if (!uniqueRows.length) return;
  const upsert = await supabase.from(table).upsert(uniqueRows, { onConflict: "id" });
  if (upsert.error) throw new Error(`${table}: ${upsert.error.message}`);
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  return [...new Map(items.map((item) => [key(item), item])).values()];
}

function newer<T extends { id: string; updatedAt: string }>(local: T[], remote: T[] = []) {
  const rows = new Map(remote.map((item) => [item.id, item]));
  for (const item of local) {
    const existing = rows.get(item.id);
    if (!existing || item.updatedAt >= existing.updatedAt) rows.set(item.id, item);
  }
  return [...rows.values()];
}

function newerPlans(local: Record<string, DailyPlan>, remote: Record<string, DailyPlan> = {}) {
  const plans = { ...remote };
  for (const [date, plan] of Object.entries(local)) {
    if (!plans[date] || plan.updatedAt >= plans[date].updatedAt) plans[date] = plan;
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
  const keepRemoteProfile = Boolean(remote?.lastSyncedAt && snapshot.lastSyncedAt && remote.lastSyncedAt > snapshot.lastSyncedAt);

  if (!keepRemoteProfile) {
    const profile = await supabase.from("profiles").upsert({
      id,
      display_name: snapshot.settings.displayName?.trim() || "RoutineOS",
      avatar_url: snapshot.settings.avatarUrl ?? null,
      theme_mode: snapshot.settings.themeMode,
      sound_enabled: snapshot.settings.soundEnabled,
      start_reminder_minutes: snapshot.settings.startReminderMinutes,
      end_reminder_minutes: snapshot.settings.endReminderMinutes,
      reminder_retention_minutes: snapshot.settings.reminderRetentionMinutes,
      onboarding_completed: snapshot.settings.onboardingCompleted,
      updated_at: now,
    });
    if (profile.error) throw new Error(`profiles: ${profile.error.message}`);
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
    due_date: task.dueDate,
    completed: task.completed,
    created_at: task.createdAt,
    completed_at: task.completedAt ?? null,
    updated_at: task.updatedAt,
  })));
}

export async function pullSnapshot(): Promise<Snapshot | null> {
  const id = await userId();

  const [profile, categories, templates, resources, plans, events, places, tasks] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("*").eq("user_id", id).order("created_at"),
    supabase.from("routine_templates").select("*").eq("user_id", id).order("created_at"),
    supabase.from("resources").select("*").eq("user_id", id).order("created_at"),
    supabase.from("daily_plans").select("*").eq("user_id", id).order("date_key"),
    supabase.from("execution_events").select("*").eq("user_id", id).order("happened_at"),
    supabase.from("saved_places").select("*").eq("user_id", id).order("created_at"),
    supabase.from("reminder_tasks").select("*").eq("user_id", id).order("created_at"),
  ]);

  for (const result of [profile, categories, templates, resources, plans, events, places, tasks]) {
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
    reminderRetentionMinutes: profile.data?.reminder_retention_minutes ?? 30,
    onboardingCompleted: profile.data?.onboarding_completed ?? true,
  };

  return {
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
      dueDate: row.due_date ?? row.created_at.slice(0, 10),
      completed: row.completed ?? false,
      createdAt: row.created_at,
      completedAt: row.completed_at ?? undefined,
      updatedAt: row.updated_at ?? row.completed_at ?? row.created_at,
    })),
    lastSyncedAt: profile.data?.updated_at ?? undefined,
  };
}
