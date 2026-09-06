import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Category,
  DailyPlan,
  DailyPlanBlock,
  ExecutionEvent,
  PlanResourceItemSnapshot,
  PlanBlockStatus,
  Resource,
  ResourceItem,
  ResourceType,
  RoutineTemplate,
  Settings,
  SyncState,
  TemplateBlock,
} from "@/src/types";
import { CATEGORY_IDS, categoryIdFromLabel, defaultCategories } from "@/src/lib/categories";
import { blockEndDate, dateFromOffset, nowMinutes, timeToMinutes } from "@/src/lib/date";
import { blocksFromTemplate, defaultTemplates, planBlockTargets, templateForDate, TEMPLATE_IDS } from "@/src/lib/templates";
import { flattenResourceItems } from "@/src/lib/resourceItems";

const seedTime = "2026-08-29T00:00:00.000Z";

const defaultSettings: Settings = {
  displayName: "",
  avatarUrl: undefined,
  localAvatarUri: undefined,
  themeMode: "dark",
  soundEnabled: true,
  startReminderMinutes: 10,
  endReminderMinutes: 5,
  reminderRetentionMinutes: 30,
  onboardingCompleted: false,
};

const defaultSync: SyncState = {
  online: true,
  lastSyncedAt: undefined,
  pendingPush: false,
  lastError: undefined,
};

const defaultResources: Resource[] = [];

type RoutineSnapshot = {
  settings: Settings;
  categories: Category[];
  templates: RoutineTemplate[];
  resources: Resource[];
  plans: Record<string, DailyPlan>;
  executionEvents: ExecutionEvent[];
  sync: SyncState;
};

type RoutineState = RoutineSnapshot & {
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

type LegacyGoal = {
  id?: string;
  title?: string;
  category?: string;
  playlistUrl?: string;
  playlistItems?: (Partial<ResourceItem> & { assignedBlockId?: string; duration?: string })[];
};

type LegacyTemplate = Partial<RoutineTemplate> & {
  id?: string;
  blocks?: (Partial<TemplateBlock> & { category?: string })[];
};

type LegacyPlanBlock = Partial<DailyPlanBlock> & { category?: string; target?: string; label?: string; status?: string };

type LegacyPlan = Partial<DailyPlan> & {
  locked?: boolean;
  templateId?: string;
  sourceText?: string;
  blocks?: LegacyPlanBlock[];
  didText?: string;
  missedText?: string;
  tomorrowText?: string;
};

type PersistedData = Partial<Omit<RoutineSnapshot, "sync">> & {
  sync?: Partial<SyncState>;
  goals?: LegacyGoal[];
  customTemplates?: Record<string, LegacyTemplate>;
  lastSyncedAt?: string;
};

function uuidFromText(text: string) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  return `00000000-0000-4000-8000-${hash.toString(16).padStart(12, "0").slice(-12)}`;
}

function isUuid(value: string | undefined) {
  return Boolean(value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}

function safeUuid(value: string | undefined, fallback: string) {
  return isUuid(value) ? value! : uuidFromText(value || fallback);
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === "x" ? value : (value & 0x3) | 0x8).toString(16);
  });
}

function nowIso() {
  return new Date().toISOString();
}

function localWrite(state: RoutineState, patch: Partial<RoutineState>): Partial<RoutineState> {
  return {
    ...patch,
    sync: {
      ...state.sync,
      pendingPush: true,
      lastError: undefined,
    },
  };
}

function categoryIdFromAny(value: unknown, categories: Category[]) {
  if (typeof value !== "string") return CATEGORY_IDS.other;
  return categories.find((category) => category.id === value)?.id ?? categoryIdFromLabel(value, categories);
}

function templateIdFromLegacy(id: string | undefined, name = "") {
  const key = `${id ?? ""} ${name}`.toLowerCase();
  if (key.includes("open_evening") || key.includes("mon / thu / fri")) return TEMPLATE_IDS.openEvening;
  if (key.includes("evening_dojo") || key.includes("tue / sat")) return TEMPLATE_IDS.eveningDojo;
  if (key.includes("early_dojo") || key.includes("wed")) return TEMPLATE_IDS.earlyDojo;
  if (key.includes("morning_dojo") || key.includes("sunday")) return TEMPLATE_IDS.morningDojo;
  return safeUuid(id, name || "template");
}

function normalizeSettings(settings?: Partial<Settings> & { notificationOffsetMinutes?: number; endNotificationOffsetMinutes?: number }): Settings {
  return {
    displayName: settings?.displayName ?? defaultSettings.displayName,
    avatarUrl: settings?.avatarUrl,
    localAvatarUri: settings?.localAvatarUri,
    themeMode: settings?.themeMode === "light" ? "light" : "dark",
    soundEnabled: settings?.soundEnabled ?? defaultSettings.soundEnabled,
    startReminderMinutes: settings?.startReminderMinutes ?? settings?.notificationOffsetMinutes ?? defaultSettings.startReminderMinutes,
    endReminderMinutes: settings?.endReminderMinutes ?? settings?.endNotificationOffsetMinutes ?? defaultSettings.endReminderMinutes,
    reminderRetentionMinutes: settings?.reminderRetentionMinutes ?? defaultSettings.reminderRetentionMinutes,
    onboardingCompleted: settings?.onboardingCompleted ?? defaultSettings.onboardingCompleted,
  };
}

function normalizeSync(sync?: Partial<SyncState>, lastSyncedAt?: string): SyncState {
  return {
    online: sync?.online ?? defaultSync.online,
    lastSyncedAt: sync?.lastSyncedAt ?? lastSyncedAt,
    pendingPush: Boolean(sync?.pendingPush),
    lastError: sync?.lastError,
  };
}

function normalizeCategories(categories?: Partial<Category>[]) {
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

function normalizeTemplates(data: PersistedData, categories: Category[]) {
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

function normalizeResources(data: PersistedData, categories: Category[]): Resource[] {
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

function normalizeBlock(block: LegacyPlanBlock, index: number, date: string, categories: Category[]): DailyPlanBlock {
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

function resourceSnapshotsForBlock(block: DailyPlanBlock, resources: Resource[]): PlanResourceItemSnapshot[] {
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

function snapshotBlocks(blocks: DailyPlanBlock[], resources: Resource[]) {
  return blocks.map((block) => ({ ...block, resourceItems: resourceSnapshotsForBlock(block, resources) }));
}

function normalizePlans(plans: PersistedData["plans"], categories: Category[]) {
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

function makeDraftPlan(date: string, templates: RoutineTemplate[], previous?: DailyPlan): DailyPlan {
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

export const useRoutineStore = create<RoutineState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      categories: defaultCategories,
      templates: defaultTemplates,
      resources: defaultResources,
      resourceItems: flattenResourceItems(defaultResources),
      plans: {},
      executionEvents: [],
      sync: defaultSync,
      ensureDraftPlan: (date) => {
        const existing = get().plans[date];
        if (existing?.blocks.length) return existing;
        const plan = makeDraftPlan(date, get().templates);
        if (!plan.blocks.length) return plan;
        set((state) => localWrite(state, { plans: { ...state.plans, [date]: plan } }));
        return plan;
      },
      setPlanTemplate: (date, templateId) => {
        const template = get().templates.find((item) => item.id === templateId);
        if (!template) return undefined;
        const previous = get().plans[date];
        if (previous?.status === "locked") return previous;
        const timestamp = nowIso();
        const plan: DailyPlan = {
          id: previous?.id ?? uuid(),
          date,
          templateId: template.id,
          status: "draft",
          blocks: blocksFromTemplate(date, template, planBlockTargets(previous?.blocks ?? [])),
          createdAt: previous?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
        set((state) => localWrite(state, { plans: { ...state.plans, [date]: plan } }));
        return plan;
      },
      updatePlanBlock: (date, blockId, patch) => {
        set((state) => {
          const plan = state.plans[date];
          if (!plan || plan.status === "locked") return {};
          return localWrite(state, {
            plans: {
              ...state.plans,
              [date]: {
                ...plan,
                blocks: plan.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
                updatedAt: nowIso(),
              },
            },
          });
        });
      },
      deletePlanBlock: (date, blockId) => {
        set((state) => {
          const plan = state.plans[date];
          if (!plan || plan.status === "locked") return {};
          return localWrite(state, {
            plans: {
              ...state.plans,
              [date]: {
                ...plan,
                blocks: plan.blocks.filter((block) => block.id !== blockId),
                updatedAt: nowIso(),
              },
            },
          });
        });
      },
      clearPlan: (date) => {
        set((state) => {
          if (!state.plans[date]) return {};
          const plans = { ...state.plans };
          delete plans[date];
          return localWrite(state, { plans });
        });
      },
      togglePlanResourceItem: (date, blockId, resourceItemId) => {
        set((state) => {
          const plan = state.plans[date];
          if (!plan || plan.status === "locked") return {};
          return localWrite(state, {
            plans: {
              ...state.plans,
              [date]: {
                ...plan,
                blocks: plan.blocks.map((block) => {
                  if (block.id !== blockId) return block;
                  const selected = block.resourceItemIds.includes(resourceItemId);
                  return { ...block, resourceItemIds: selected ? block.resourceItemIds.filter((id) => id !== resourceItemId) : [...block.resourceItemIds, resourceItemId] };
                }),
                updatedAt: nowIso(),
              },
            },
          });
        });
      },
      lockPlan: (date) => {
        const plan = get().plans[date];
        if (!plan) return undefined;
        const timestamp = nowIso();
        const locked = { ...plan, blocks: snapshotBlocks(plan.blocks, get().resources), status: "locked" as const, lockedAt: plan.lockedAt ?? timestamp, updatedAt: timestamp };
        set((state) => localWrite(state, { plans: { ...state.plans, [date]: locked } }));
        return locked;
      },
      lockTodayFromTemplate: (date) => {
        const existing = get().plans[date];
        const draft = existing?.blocks.length ? existing : makeDraftPlan(date, get().templates);
        if (!draft.blocks.length) return draft;
        const currentMinutes = nowMinutes();
        const futureBlocks = date === dateFromOffset(0) ? draft.blocks.filter((block) => timeToMinutes(block.end) > currentMinutes) : draft.blocks;
        const timestamp = nowIso();
        const locked: DailyPlan = {
          ...draft,
          blocks: snapshotBlocks(futureBlocks.length ? futureBlocks : draft.blocks.slice(-1), get().resources),
          status: "locked",
          lockedAt: timestamp,
          updatedAt: timestamp,
        };
        set((state) => localWrite(state, { plans: { ...state.plans, [date]: locked } }));
        return locked;
      },
      setBlockStatus: (date, blockId, status) => {
        set((state) => {
          const plan = state.plans[date];
          if (!plan) return {};
          const happenedAt = nowIso();
          const block = plan.blocks.find((item) => item.id === blockId);
          const resourceIds = block?.resourceItemIds ?? [];
          const events: ExecutionEvent[] = [
            ...state.executionEvents,
            { id: uuid(), date, blockId, type: status === "done" ? "done" : "not-done", happenedAt },
            ...resourceIds
              .map((resourceItemId) => ({ id: uuid(), date, blockId, resourceItemId, type: status === "done" ? ("resource-done" as const) : ("resource-undone" as const), happenedAt })),
          ];
          return localWrite(state, {
            executionEvents: events,
            plans: {
              ...state.plans,
              [date]: {
                ...plan,
                blocks: plan.blocks.map((item) =>
                  item.id === blockId
                    ? {
                        ...item,
                        status,
                        doneAt: status === "done" ? happenedAt : undefined,
                        savedSeconds: status === "done" ? Math.max(0, Math.floor((blockEndDate({ date, end: item.end }).getTime() - Date.now()) / 1000)) : undefined,
                      }
                    : item,
                ),
                updatedAt: happenedAt,
              },
            },
          });
        });
      },
      markExpiredBlocksNotDone: (date = dateFromOffset(0)) => {
        let changed: DailyPlanBlock[] = [];
        set((state) => {
          const plan = state.plans[date];
          if (!plan || plan.status !== "locked") return {};
          const minute = date === dateFromOffset(0) ? nowMinutes() : 24 * 60;
          const happenedAt = nowIso();
          const expiredBlocks = plan.blocks.filter((block) => block.status === "pending" && timeToMinutes(block.end) <= minute);
          changed = expiredBlocks;
          if (!changed.length) return {};
          const expiredIds = new Set(expiredBlocks.map((block) => block.id));
          return localWrite(state, {
            executionEvents: [
              ...state.executionEvents,
              ...expiredBlocks.map((block) => ({ id: uuid(), date, blockId: block.id, type: "not-done" as const, happenedAt })),
            ],
            plans: {
              ...state.plans,
              [date]: {
                ...plan,
                blocks: plan.blocks.map((block) => (expiredIds.has(block.id) ? { ...block, status: "not-done" as const } : block)),
                updatedAt: happenedAt,
              },
            },
          });
        });
        return changed;
      },
      toggleResourceItem: (resourceItemId, date = dateFromOffset(0), blockId) => {
        set((state) => {
          const happenedAt = nowIso();
          const previous = [...state.executionEvents]
            .reverse()
            .find((event) => event.date === date && event.blockId === (blockId ?? "resource") && event.resourceItemId === resourceItemId && (event.type === "resource-done" || event.type === "resource-undone"));
          const completed = previous?.type !== "resource-done";
          return localWrite(state, {
            executionEvents: [
              ...state.executionEvents,
              {
                id: uuid(),
                date,
                blockId: blockId ?? "resource",
                resourceItemId,
                type: completed ? "resource-done" : "resource-undone",
                happenedAt,
              },
            ],
          });
        });
      },
      createCategory: () => {
        const timestamp = nowIso();
        const category = { id: uuid(), label: "Custom", color: "#38BDF8", createdAt: timestamp, updatedAt: timestamp };
        set((state) => localWrite(state, { categories: [...state.categories, category] }));
        return category;
      },
      updateCategory: (id, patch) => {
        set((state) =>
          localWrite(state, {
            categories: state.categories.map((category) => (category.id === id ? { ...category, ...patch, updatedAt: nowIso() } : category)),
          }),
        );
      },
      deleteCategory: (id) => {
        set((state) => {
          const categories = state.categories.filter((category) => category.id !== id);
          const fallbackId = categories[0]?.id ?? CATEGORY_IDS.other;
          return localWrite(state, {
            categories,
            templates: state.templates.map((template) => ({ ...template, blocks: template.blocks.map((block) => (block.categoryId === id ? { ...block, categoryId: fallbackId } : block)) })),
            resources: state.resources.map((resource) => (resource.categoryId === id ? { ...resource, categoryId: fallbackId } : resource)),
            plans: Object.fromEntries(
              Object.entries(state.plans).map(([date, plan]) => [date, { ...plan, blocks: plan.blocks.map((block) => (block.categoryId === id ? { ...block, categoryId: fallbackId } : block)) }]),
            ),
          });
        });
      },
      createTemplate: () => {
        const timestamp = nowIso();
        const template: RoutineTemplate = {
          id: uuid(),
          name: "New Routine",
          description: "",
          dayRules: [],
          createdAt: timestamp,
          updatedAt: timestamp,
          blocks: [{ id: "block-1", start: "06:00", end: "08:00", categoryId: get().categories[0]?.id ?? CATEGORY_IDS.dsa, label: "New block" }],
        };
        set((state) => localWrite(state, { templates: [...state.templates, template] }));
        return template;
      },
      saveTemplate: (template) => {
        const updated = { ...template, updatedAt: nowIso() };
        set((state) => localWrite(state, { templates: state.templates.map((item) => (item.id === template.id ? updated : item)) }));
      },
      deleteTemplate: (id) => {
        set((state) => localWrite(state, { templates: state.templates.filter((template) => template.id !== id) }));
      },
      updateTemplateBlock: (templateId, blockId, patch) => {
        set((state) =>
          localWrite(state, {
            templates: state.templates.map((template) =>
              template.id === templateId ? { ...template, blocks: template.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)), updatedAt: nowIso() } : template,
            ),
          }),
        );
      },
      addTemplateBlock: (templateId) => {
        set((state) =>
          localWrite(state, {
            templates: state.templates.map((template) =>
              template.id === templateId
                ? {
                    ...template,
                    blocks: [
                      ...template.blocks,
                      { id: `block-${template.blocks.length + 1}`, start: "21:00", end: "21:30", categoryId: state.categories[0]?.id ?? CATEGORY_IDS.dsa, label: "New block" },
                    ],
                    updatedAt: nowIso(),
                  }
                : template,
            ),
          }),
        );
      },
      deleteTemplateBlock: (templateId, blockId) => {
        set((state) =>
          localWrite(state, {
            templates: state.templates.map((template) =>
              template.id === templateId && template.blocks.length > 1 ? { ...template, blocks: template.blocks.filter((block) => block.id !== blockId), updatedAt: nowIso() } : template,
            ),
          }),
        );
      },
      createResource: (title, categoryId, type) => {
        const timestamp = nowIso();
        const resource: Resource = { id: uuid(), title: title.trim() || "Untitled Resource", categoryId, type, items: [], chunkMinutes: type === "youtube-video" ? 30 : undefined, createdAt: timestamp, updatedAt: timestamp };
        set((state) => localWrite(state, { resources: [...state.resources, resource], resourceItems: flattenResourceItems([...state.resources, resource]) }));
        return resource;
      },
      updateResource: (id, patch) => {
        set((state) => {
          const resources = state.resources.map((resource) => (resource.id === id ? { ...resource, ...patch, updatedAt: nowIso() } : resource));
          return localWrite(state, { resources, resourceItems: flattenResourceItems(resources) });
        });
      },
      deleteResource: (id) => {
        set((state) => {
          const removedIds = new Set(state.resources.find((resource) => resource.id === id)?.items.map((item) => item.id) ?? []);
          const resources = state.resources.filter((resource) => resource.id !== id);
          return localWrite(state, {
            resources,
            resourceItems: flattenResourceItems(resources),
            plans: Object.fromEntries(
              Object.entries(state.plans).map(([date, plan]) => [
                date,
                {
                  ...plan,
                  blocks: plan.blocks.map((block) => ({ ...block, resourceItemIds: block.resourceItemIds.filter((itemId) => !removedIds.has(itemId)) })),
                },
              ]),
            ),
          });
        });
      },
      setResourceItems: (resourceId, url, items) => {
        set((state) => {
          const resources = state.resources.map((resource) => {
            if (resource.id !== resourceId) return resource;
            const previous = new Map(resource.items.map((item) => [item.id, item]));
            return {
              ...resource,
              url,
              items: items.map((item, index) => ({
                ...item,
                resourceId,
                order: index,
                completed: previous.get(item.id)?.completed ?? item.completed,
                completedAt: previous.get(item.id)?.completedAt ?? item.completedAt,
              })),
              updatedAt: nowIso(),
            };
          });
          return localWrite(state, { resources, resourceItems: flattenResourceItems(resources) });
        });
      },
      clearResourceItems: (resourceId) => {
        set((state) => {
          const oldIds = new Set(state.resources.find((resource) => resource.id === resourceId)?.items.map((item) => item.id) ?? []);
          const resources = state.resources.map((resource) => (resource.id === resourceId ? { ...resource, url: undefined, items: [], updatedAt: nowIso() } : resource));
          return localWrite(state, {
            resources,
            resourceItems: flattenResourceItems(resources),
            plans: Object.fromEntries(
              Object.entries(state.plans).map(([date, plan]) => [date, { ...plan, blocks: plan.blocks.map((block) => ({ ...block, resourceItemIds: block.resourceItemIds.filter((id) => !oldIds.has(id)) })) }]),
            ),
          });
        });
      },
      markSynced: () => {
        set((state) => ({ sync: { ...state.sync, lastSyncedAt: nowIso(), pendingPush: false, lastError: undefined } }));
      },
      markPendingPush: (error) => {
        set((state) => ({ sync: { ...state.sync, pendingPush: true, lastError: error } }));
      },
      updateSync: (patch) => {
        set((state) => ({ sync: { ...state.sync, ...patch } }));
      },
      updateSettings: (settings) => {
        set((state) => localWrite(state, { settings: normalizeSettings({ ...state.settings, ...settings }) }));
      },
      resetLocalData: () => {
        set({
          settings: defaultSettings,
          categories: defaultCategories,
          templates: defaultTemplates,
          resources: defaultResources,
          resourceItems: flattenResourceItems(defaultResources),
          plans: {},
          executionEvents: [],
          sync: defaultSync,
        });
      },
      restoreFromBackup: (snapshot) => {
        set((state) => {
          const data = snapshot as PersistedData;
          const categories = normalizeCategories(data.categories);
          const templates = normalizeTemplates(data, categories);
          const resources = normalizeResources(data, categories);
          return {
            settings: normalizeSettings({ ...state.settings, ...data.settings }),
            categories,
            templates,
            resources,
            resourceItems: flattenResourceItems(resources),
            plans: normalizePlans(data.plans, categories),
            executionEvents: (data.executionEvents ?? []).map((event) => ({ ...event, id: safeUuid(event.id, `${event.date}-${event.blockId}-${event.happenedAt}`) })),
            sync: { ...state.sync, pendingPush: false, lastSyncedAt: nowIso(), lastError: undefined },
          };
        });
      },
    }),
    {
      name: "routineos-store",
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (persisted) => persisted as RoutineState,
      merge: (persisted, current) => {
        const data = persisted as PersistedData | undefined;
        const categories = normalizeCategories(data?.categories);
        const templates = data ? normalizeTemplates(data, categories) : [];
        const resources = data ? normalizeResources(data, categories) : [];
        return {
          ...current,
          settings: normalizeSettings(data?.settings),
          categories,
          templates,
          resources,
          resourceItems: flattenResourceItems(resources),
          plans: normalizePlans(data?.plans, categories),
          executionEvents: (data?.executionEvents ?? []).map((event) => ({ ...event, id: safeUuid(event.id, `${event.date}-${event.blockId}-${event.happenedAt}`) })),
          sync: normalizeSync(data?.sync, data?.lastSyncedAt),
        };
      },
    },
  ),
);

export type { RoutineSnapshot, RoutineState };
