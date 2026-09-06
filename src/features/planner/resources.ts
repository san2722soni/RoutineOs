import { useRoutineStore } from "@/src/store/routineStore";
import type { DailyPlanBlock, ResourceItem } from "@/src/types";
export function resourcesForBlock(block: DailyPlanBlock, items: ResourceItem[]) {
  return items.filter((item) => item.completed === false || block.resourceItemIds.includes(item.id)).filter((item) => item.resourceId && itemMatchesCategory(item, block.categoryId));
}

export function itemMatchesCategory(item: ResourceItem, categoryId: string) {
  const resource = useRoutineStore.getState().resources.find((entry) => entry.id === item.resourceId);
  return resource?.categoryId === categoryId;
}
