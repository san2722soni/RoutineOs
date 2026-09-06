import { type DeletedRecord } from "@/src/lib/deletions";
import type { Category, DailyPlan, ExecutionEvent, ReminderTask, Resource, RoutineTemplate, SavedPlace, Settings } from "@/src/types";
export type Snapshot = {
  deletedRecords?: DeletedRecord[];
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
