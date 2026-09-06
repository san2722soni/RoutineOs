import { CATEGORY_IDS, defaultCategories } from "@/src/lib/categories";
import { blockEndDate, dateFromOffset, nowMinutes, timeToMinutes } from "@/src/lib/date";
import { flattenResourceItems } from "@/src/lib/resourceItems";
import { blocksFromTemplate, defaultTemplates, planBlockTargets } from "@/src/lib/templates";
import type {
  DailyPlan,
  DailyPlanBlock,
  ExecutionEvent,
  Resource,
  RoutineTemplate
} from "@/src/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultResources, defaultSettings, defaultSync, localWrite, makeDraftPlan, normalizeCategories, normalizePlans, normalizeResources, normalizeSettings, normalizeSync, normalizeTemplates, nowIso, PersistedData, RoutineSnapshot, RoutineState, safeUuid, snapshotBlocks, uuid } from "./routinePersistence";
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
      deletedRecords: [],
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
                    { id: uuid(), start: "21:00", end: "21:30", categoryId: state.categories[0]?.id ?? CATEGORY_IDS.dsa, label: "New block" },
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
          deletedRecords: [],
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
            deletedRecords: data.deletedRecords ?? [],
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
          deletedRecords: data?.deletedRecords ?? [],
          sync: normalizeSync(data?.sync, data?.lastSyncedAt),
        };
      },
    },
  ),
);

export type { RoutineSnapshot, RoutineState };
