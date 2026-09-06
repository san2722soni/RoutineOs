export type ThemePreference = "light" | "dark";

export type Settings = {
  displayName: string;
  avatarUrl?: string;
  localAvatarUri?: string;
  themeMode: ThemePreference;
  soundEnabled: boolean;
  startReminderMinutes: number;
  endReminderMinutes: number;
  onboardingCompleted: boolean;
};

export type Category = {
  id: string;
  label: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type GoalCategory = string;
export type CategoryDefinition = Category;

export type TemplateBlock = {
  id: string;
  start: string;
  end: string;
  categoryId: string;
  label: string;
};

export type RoutineTemplate = {
  id: string;
  name: string;
  description?: string;
  dayRules: number[];
  blocks: TemplateBlock[];
  createdAt: string;
  updatedAt: string;
};

export type ResourceType = "youtube-playlist" | "youtube-video";

export type ResourceItem = {
  id: string;
  resourceId: string;
  title: string;
  url?: string;
  durationSeconds: number;
  order: number;
  completed: boolean;
  completedAt?: string;
};

export type Resource = {
  id: string;
  categoryId: string;
  title: string;
  type: ResourceType;
  url?: string;
  chunkMinutes?: number;
  items: ResourceItem[];
  createdAt: string;
  updatedAt: string;
};

export type PlanBlockStatus = "pending" | "done" | "not-done";
export type BlockStatus = PlanBlockStatus;

export type PlanResourceItemSnapshot = {
  id: string;
  resourceId: string;
  resourceTitle: string;
  categoryId: string;
  title: string;
  url?: string;
  durationSeconds: number;
  order: number;
};

export type DailyPlanBlock = {
  id: string;
  templateBlockId?: string;
  categoryId: string;
  start: string;
  end: string;
  title: string;
  goal: string;
  notes?: string;
  resourceItemIds: string[];
  resourceItems?: PlanResourceItemSnapshot[];
  status: PlanBlockStatus;
  doneAt?: string;
  savedSeconds?: number;
};

export type DailyPlan = {
  id: string;
  date: string;
  templateId?: string;
  status: "draft" | "locked";
  blocks: DailyPlanBlock[];
  lockedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ExecutionEvent = {
  id: string;
  date: string;
  blockId: string;
  resourceItemId?: string;
  type: "done" | "not-done" | "resource-done" | "resource-undone";
  happenedAt: string;
};

export type SyncState = {
  online: boolean;
  lastSyncedAt?: string;
  pendingPush: boolean;
  lastError?: string;
};

export type SavedPlace = {
  id: string;
  name: string;
  address?: string;
  providerId?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isHome?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReminderTask = {
  id: string;
  title: string;
  placeId: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
};
