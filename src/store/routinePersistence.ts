import { CATEGORY_IDS, categoryIdFromLabel, defaultCategories } from "@/src/lib/categories";
import { recordDeletions, type DeletedRecord } from "@/src/lib/deletions";
import { blocksFromTemplate, defaultTemplates, planBlockTargets, TEMPLATE_IDS, templateForDate } from "@/src/lib/templates";
import type {
  Category,
  DailyPlan,
  DailyPlanBlock,
  ExecutionEvent,
  PlanBlockStatus,
  PlanResourceItemSnapshot,
  Resource,
  ResourceItem,
  ResourceType,
  RoutineTemplate,
  Settings,
  SyncState,
  TemplateBlock,
} from "@/src/types";

export const seedTime = "2026-08-29T00:00:00.000Z";

export const defaultSettings: Settings = {
  displayName: "",
  avatarUrl: undefined,
  localAvatarUri: undefined,
  themeMode: "dark",
  soundEnabled: true,
  startReminderMinutes: 10,
  endReminderMinutes: 5,
  onboardingCompleted: false,
};

export const defaultSync: SyncState = {
  online: true,
  lastSyncedAt: undefined,
  pendingPush: false,
  lastError: undefined,
};

export const defaultResources: Resource[] = [];

export type RoutineSnapshot = {
  deletedRecords: DeletedRecord[];
  settings: Settings;
  categories: Category[];
  templates: RoutineTemplate[];
  resources: Resource[];
  plans: Record<string, DailyPlan>;
  executionEvents: ExecutionEvent[];
  sync: SyncState;
};

export type RoutineState = RoutineSnapshot & {
  resourceItems: ResourceItem[];
  ensureDraftPlan: (date: string) => DailyPlan;
  setPlanTemplate: (date: string, templateId: string) => DailyPlan | undefined;
  updatePlanBlock: (date: string, blockId: string, patch: Partial<DailyPlanBlock>) => void;
  deletePlanBlock: (date: string, blockId: string) => void;
  clearPlan: (date: string) => void;
  togglePlanResourceItem: (date: string, blockId: string, resourceItemId: string) => void;
  lockPlan: (date: string) => DailyPlan | undefined;
  lockTodayFromTemplate: (date: string) => DailyPlan;
  setBlockStatus: (date: string, blockId: string, status: PlanBlockStatus) => void;
  markExpiredBlocksNotDone: (date?: string) => DailyPlanBlock[];
  toggleResourceItem: (resourceItemId: string, date?: string, blockId?: string) => void;
  createCategory: () => Category;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  createTemplate: () => RoutineTemplate;
  saveTemplate: (template: RoutineTemplate) => void;
  deleteTemplate: (id: string) => void;
  updateTemplateBlock: (templateId: string, blockId: string, patch: Partial<TemplateBlock>) => void;
  addTemplateBlock: (templateId: string) => void;
  deleteTemplateBlock: (templateId: string, blockId: string) => void;
  createResource: (title: string, categoryId: string, type: ResourceType) => Resource;
  updateResource: (id: string, patch: Partial<Resource>) => void;
  deleteResource: (id: string) => void;
  setResourceItems: (resourceId: string, url: string, items: ResourceItem[]) => void;
  clearResourceItems: (resourceId: string) => void;
  markSynced: () => void;
  markPendingPush: (error?: string) => void;
  updateSync: (patch: Partial<SyncState>) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  resetLocalData: () => void;
  restoreFromBackup: (snapshot: Partial<Omit<RoutineSnapshot, "sync">>) => void;
};

export type LegacyGoal = {
  id?: string;
  title?: string;
  category?: string;
  playlistUrl?: string;
  playlistItems?: (Partial<ResourceItem> & { assignedBlockId?: string; duration?: string })[];
};

export type LegacyTemplate = Partial<RoutineTemplate> & {
  id?: string;
  blocks?: (Partial<TemplateBlock> & { category?: string })[];
};

export type LegacyPlanBlock = Partial<DailyPlanBlock> & { category?: string; target?: string; label?: string; status?: string };

export type LegacyPlan = Partial<DailyPlan> & {
  locked?: boolean;
  templateId?: string;
  sourceText?: string;
  blocks?: LegacyPlanBlock[];
  didText?: string;
  missedText?: string;
  tomorrowText?: string;
};

export type PersistedData = Partial<Omit<RoutineSnapshot, "sync">> & {
  sync?: Partial<SyncState>;
  goals?: LegacyGoal[];
  customTemplates?: Record<string, LegacyTemplate>;
  lastSyncedAt?: string;
};

export function uuidFromText(text: string) {
  let hash = 0;
  for (let index = 0;index < text.length;index += 1) hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  return `00000000-0000-4000-8000-${hash.toString(16).padStart(12, "0").slice(-12)}`;
}

export function isUuid(value: string | undefined) {
  return Boolean(value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}

export function safeUuid(value: string | undefined, fallback: string) {
  return isUuid(value) ? value! : uuidFromText(value || fallback);
}

export function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === "x" ? value : (value & 0x3) | 0x8).toString(16);
  });
}

export function nowIso() {
  return new Date().toISOString();
}

export function localWrite(state: RoutineState, patch: Partial<RoutineState>): Partial<RoutineState> {
  const deletedRecords = [...state.deletedRecords];
  const tables = { categories: "categories", templates: "routine_templates", resources: "resources", plans: "daily_plans" } as const;
  for (const key of Object.keys(tables) as (keyof typeof tables)[]) {
    if (patch[key]) deletedRecords.push(...recordDeletions(tables[key], Object.values(state[key]), Object.values(patch[key]!)));
  }
  return { ...patch, deletedRecords, sync: { ...state.sync, pendingPush: true, lastError: undefined } };
}

export function categoryIdFromAny(value: unknown, categories: Category[]) {
  if (typeof value !== "string") return CATEGORY_IDS.other;
  return categories.find((category) => category.id === value)?.id ?? categoryIdFromLabel(value, categories);
}

export function templateIdFromLegacy(id: string | undefined, name = "") {
  const key = `${id ?? ""} ${name}`.toLowerCase();
  if (key.includes("open_evening") || key.includes("mon / thu / fri")) return TEMPLATE_IDS.openEvening;
  if (key.includes("evening_dojo") || key.includes("tue / sat")) return TEMPLATE_IDS.eveningDojo;
  if (key.includes("early_dojo") || key.includes("wed")) return TEMPLATE_IDS.earlyDojo;
  if (key.includes("morning_dojo") || key.includes("sunday")) return TEMPLATE_IDS.morningDojo;
  return safeUuid(id, name || "template");
}

export function normalizeSettings(settings?: Partial<Settings> & { notificationOffsetMinutes?: number; endNotificationOffsetMinutes?: number }): Settings {
  return {
    displayName: settings?.displayName ?? defaultSettings.displayName,
    avatarUrl: settings?.avatarUrl,
    localAvatarUri: settings?.localAvatarUri,
    themeMode: settings?.themeMode === "light" ? "light" : "dark",
    soundEnabled: settings?.soundEnabled ?? defaultSettings.soundEnabled,
    startReminderMinutes: settings?.startReminderMinutes ?? settings?.notificationOffsetMinutes ?? defaultSettings.startReminderMinutes,
    endReminderMinutes: settings?.endReminderMinutes ?? settings?.endNotificationOffsetMinutes ?? defaultSettings.endReminderMinutes,
    onboardingCompleted: settings?.onboardingCompleted ?? defaultSettings.onboardingCompleted,
  };
}

export function normalizeSync(sync?: Partial<SyncState>, lastSyncedAt?: string): SyncState {
  return {
    online: sync?.online ?? defaultSync.online,
    lastSyncedAt: sync?.lastSyncedAt ?? lastSyncedAt,
    pendingPush: Boolean(sync?.pendingPush),
    lastError: sync?.lastError,
  };
}

export function normalizeCategories(categories?: Partial<Category>[]) {
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();
  return (categories ?? defaultCategories).flatMap((category) => {
    const label = String(category.label ?? "Other");
    const defaultId = categoryIdFromLabel(label);
    const id = isUuid(category.id) ? category.id! : defaultId !== CATEGORY_IDS.other ? defaultId : uuidFromText(label);
    const labelKey = label.trim().toLowerCase();
    if (seenIds.has(id) || seenLabels.has(labelKey)) return [];
    seenIds.add(id);
    seenLabels.add(labelKey);
    return [{
      id,
      label: label.trim() || "Other",
      color: category.color || "#94A3B8",
      createdAt: category.createdAt ?? seedTime,
      updatedAt: category.updatedAt ?? seedTime,
    }];
  });
}

export function normalizeTemplates(data: PersistedData, categories: Category[]) {
  const source = data.templates ?? [];
  return source.map((template) => {
    const id = templateIdFromLegacy(template.id, template.name);
    const fallback = defaultTemplates.find((item) => item.id === id);
    return {
      id,
      name: template.name ?? fallback?.name ?? "Custom Template",
      description: template.description ?? fallback?.description,
      dayRules: template.dayRules ?? fallback?.dayRules ?? [],
      createdAt: template.createdAt ?? seedTime,
      updatedAt: template.updatedAt ?? seedTime,
      blocks: (template.blocks?.length ? template.blocks : fallback?.blocks ?? []).map((sourceBlock, index) => {
        const block = sourceBlock as Partial<TemplateBlock> & { category?: string };
        return {
          id: block.id ?? `block-${index + 1}`,
          start: block.start ?? "06:00",
          end: block.end ?? "07:00",
          categoryId: categoryIdFromAny(block.categoryId ?? block.category, categories),
          label: block.label ?? "Focus Block",
        };
      }),
    };
  });
}

export function normalizeResources(data: PersistedData, categories: Category[]): Resource[] {
  const seenResources = new Set<string>();
  return (data.resources ?? defaultResources).flatMap((resource) => {
    const resourceId = safeUuid(resource.id, resource.title);
    const type: ResourceType = resource.type === "youtube-video" ? "youtube-video" : "youtube-playlist";
    const categoryId = categoryIdFromAny(resource.categoryId, categories);
    const resourceKey = `${categoryId}:${type}`;
    if (seenResources.has(resourceId) || seenResources.has(resourceKey)) return [];
    seenResources.add(resourceId);
    seenResources.add(resourceKey);
    const seenItems = new Set<string>();
    return [{
      ...resource,
      id: resourceId,
      categoryId,
      type,
      items: (resource.items ?? []).flatMap((item, index) => {
        const id = item.id ?? uuidFromText(`${resourceId}-${item.title ?? index}`);
        if (seenItems.has(id)) return [];
        seenItems.add(id);
        return [{
          ...item,
          id,
          resourceId,
          order: item.order ?? index,
          completed: Boolean(item.completed),
          durationSeconds: Number(item.durationSeconds ?? 0),
        }];
      }),
      createdAt: resource.createdAt ?? seedTime,
      updatedAt: resource.updatedAt ?? seedTime,
    }];
  });
}

export function normalizeBlock(block: LegacyPlanBlock, index: number, date: string, categories: Category[]): DailyPlanBlock {
  const statusText = String(block.status ?? "");
  const status: PlanBlockStatus = statusText === "done" ? "done" : statusText === "not-done" || statusText === "skipped" ? "not-done" : "pending";
  return {
    id: block.id ?? `${date}-${index + 1}`,
    templateBlockId: block.templateBlockId,
    categoryId: categoryIdFromAny(block.categoryId ?? block.category, categories),
    start: block.start ?? "06:00",
    end: block.end ?? "07:00",
    title: block.title ?? block.label ?? "Focus Block",
    goal: block.goal ?? block.target ?? block.title ?? "",
    notes: block.notes ?? "",
    resourceItemIds: block.resourceItemIds ?? [],
    resourceItems: block.resourceItems ?? [],
    status,
    doneAt: block.doneAt,
    savedSeconds: block.savedSeconds,
  };
}

export function resourceSnapshotsForBlock(block: DailyPlanBlock, resources: Resource[]): PlanResourceItemSnapshot[] {
  const itemIds = new Set(block.resourceItemIds);
  return resources.flatMap((resource) =>
    resource.items
      .filter((item) => itemIds.has(item.id))
      .map((item) => ({
        id: item.id,
        resourceId: resource.id,
        resourceTitle: resource.title,
        categoryId: resource.categoryId,
        title: item.title,
        url: item.url,
        durationSeconds: item.durationSeconds,
        order: item.order,
      })),
  );
}

export function snapshotBlocks(blocks: DailyPlanBlock[], resources: Resource[]) {
  return blocks.map((block) => ({ ...block, resourceItems: resourceSnapshotsForBlock(block, resources) }));
}

export function normalizePlans(plans: PersistedData["plans"], categories: Category[]) {
  return Object.fromEntries(
    Object.entries(plans ?? {}).flatMap(([date, plan]) => {
      const legacy = plan as LegacyPlan;
      const id = safeUuid(legacy.id, `plan-${legacy.date ?? date}`);
      const blocks = (legacy.blocks ?? []).map((block, index) => normalizeBlock(block, index, legacy.date ?? date, categories));
      if (!blocks.length) return [];
      return [[date, {
        id,
        date: legacy.date ?? date,
        templateId: templateIdFromLegacy(legacy.templateId),
        status: legacy.status ?? (legacy.locked ? "locked" : "draft"),
        blocks,
        lockedAt: legacy.lockedAt,
        createdAt: legacy.createdAt ?? seedTime,
        updatedAt: legacy.updatedAt ?? nowIso(),
      } satisfies DailyPlan]];
    }),
  );
}

export function makeDraftPlan(date: string, templates: RoutineTemplate[], previous?: DailyPlan): DailyPlan {
  const template = previous?.templateId ? templates.find((item) => item.id === previous.templateId) ?? templateForDate(templates, date) : templateForDate(templates, date);
  const blocks = blocksFromTemplate(date, template, planBlockTargets(previous?.blocks ?? []));
  const timestamp = nowIso();
  return {
    id: previous?.id ?? uuid(),
    date,
    templateId: template.id,
    status: "draft",
    blocks,
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

