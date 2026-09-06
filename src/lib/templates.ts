import type { DailyPlanBlock, RoutineTemplate } from "@/src/types";

const seedTime = "2026-08-29T00:00:00.000Z";

export const TEMPLATE_IDS = {
  openEvening: "00000000-0000-4000-8000-000000000201",
  eveningDojo: "00000000-0000-4000-8000-000000000202",
  earlyDojo: "00000000-0000-4000-8000-000000000203",
  morningDojo: "00000000-0000-4000-8000-000000000204",
};

export const defaultTemplates: RoutineTemplate[] = [];

const emptyTemplate: RoutineTemplate = {
  id: "00000000-0000-4000-8000-000000000000",
  name: "No routine",
  description: "Create a routine in Library first.",
  dayRules: [],
  createdAt: seedTime,
  updatedAt: seedTime,
  blocks: [],
};

export const builtInTemplateIds = defaultTemplates.map((template) => template.id);
export const templates = Object.fromEntries(defaultTemplates.map((template) => [template.id, template]));

export function templateForDate(allTemplates: RoutineTemplate[], dateKey: string) {
  const day = new Date(`${dateKey}T00:00:00`).getDay();
  return allTemplates.find((template) => template.dayRules.includes(day)) ?? allTemplates[0] ?? emptyTemplate;
}

export function templateTypeForDate(dateKey: string) {
  return templateForDate(defaultTemplates, dateKey).id;
}

export function getTemplates(customTemplates?: Partial<Record<string, RoutineTemplate>>) {
  return { ...templates, ...customTemplates } as Record<string, RoutineTemplate>;
}

export function getTemplateIds(customTemplates?: Partial<Record<string, RoutineTemplate>>) {
  return [...builtInTemplateIds, ...Object.keys(customTemplates ?? {}).filter((id) => !builtInTemplateIds.includes(id))];
}

export function blocksFromTemplate(date: string, template: RoutineTemplate, targets: Record<string, Partial<DailyPlanBlock>> = {}): DailyPlanBlock[] {
  return template.blocks.map((block) => {
    const previous = targets[block.id] ?? {};
    const goal = previous.goal?.trim() || block.label;
    return {
      id: `${date}-${block.id}`,
      templateBlockId: block.id,
      categoryId: previous.categoryId ?? block.categoryId,
      start: previous.start ?? block.start,
      end: previous.end ?? block.end,
      title: previous.title?.trim() || block.label,
      goal,
      notes: previous.notes ?? "",
      resourceItemIds: previous.resourceItemIds ?? [],
      status: previous.status ?? "pending",
      doneAt: previous.doneAt,
      savedSeconds: previous.savedSeconds,
    };
  });
}

export function planBlockTargets(blocks: DailyPlanBlock[]) {
  return Object.fromEntries(blocks.map((block) => [block.templateBlockId ?? block.id, block]));
}
