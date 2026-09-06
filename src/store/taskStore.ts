import { recordDeletions, type DeletedRecord } from "@/src/lib/deletions";
import type { ReminderTask, SavedPlace } from "@/src/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

function id() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === "x" ? value : (value & 0x3) | 0x8).toString(16);
  });
}

type TaskState = {
  deletedRecords: DeletedRecord[];
  places: SavedPlace[];
  tasks: ReminderTask[];
  addPlace: (place: Omit<SavedPlace, "id" | "createdAt" | "updatedAt">) => SavedPlace;
  setHomePlace: (placeId: string) => void;
  removePlace: (placeId: string) => void;
  addTask: (title: string, placeId: string) => boolean;
  updateTask: (taskId: string, patch: { title?: string; placeId?: string }) => boolean;
  toggleTask: (taskId: string) => void;
  removeTask: (taskId: string) => void;
  pendingPush: boolean;
  lastSyncedAt?: string;
  markSynced: () => void;
  markPendingPush: () => void;
  restoreFromBackup: (places: SavedPlace[], tasks: ReminderTask[], lastSyncedAt?: string, deletedRecords?: DeletedRecord[]) => void;
  resetLocalData: () => void;
};

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      deletedRecords: [],
      places: [],
      tasks: [],
      pendingPush: false,
      lastSyncedAt: undefined,
      addPlace: (place) => {
        if (!place.name.trim() || !Number.isFinite(place.latitude) || Math.abs(place.latitude) > 90 || !Number.isFinite(place.longitude) || Math.abs(place.longitude) > 180 || !Number.isFinite(place.radiusMeters) || place.radiusMeters < 100) {
          throw new Error("Choose a valid location and a radius of at least 100 metres.");
        }
        const now = new Date().toISOString();
        const savedPlace = { ...place, id: id(), createdAt: now, updatedAt: now };
        set((state) => ({ places: [...state.places, savedPlace], pendingPush: true }));
        return savedPlace;
      },
      setHomePlace: (placeId) => set((state) => ({ places: state.places.map((place) => ({ ...place, isHome: place.id === placeId, updatedAt: new Date().toISOString() })), pendingPush: true })),
      removePlace: (placeId) => set((state) => ({ places: state.places.filter((place) => place.id !== placeId), tasks: state.tasks.filter((task) => task.placeId !== placeId), deletedRecords: [...state.deletedRecords, ...recordDeletions("saved_places", state.places, state.places.filter((p) => p.id !== placeId)), ...recordDeletions("reminder_tasks", state.tasks, state.tasks.filter((t) => t.placeId !== placeId))], pendingPush: true })),
      addTask: (title, placeId) => {
        if (!title.trim() || !get().places.some((place) => place.id === placeId)) return false;
        const now = new Date().toISOString();
        set((state) => ({ tasks: [...state.tasks, { id: id(), title: title.trim(), placeId, completed: false, createdAt: now, updatedAt: now }], pendingPush: true }));
        return true;
      },
      updateTask: (taskId, patch) => {
        if (!get().tasks.some((task) => task.id === taskId)) return false;
        if (patch.placeId && !get().places.some((place) => place.id === patch.placeId)) return false;
        if (patch.title !== undefined && !patch.title.trim()) return false;
        set((state) => ({ tasks: state.tasks.map((task) => task.id === taskId ? { ...task, ...patch, title: patch.title?.trim() ?? task.title, updatedAt: new Date().toISOString() } : task), pendingPush: true }));
        return true;
      },
      toggleTask: (taskId) => set((state) => ({ tasks: state.tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : undefined, updatedAt: new Date().toISOString() } : task), pendingPush: true })),
      removeTask: (taskId) => set((state) => ({ tasks: state.tasks.filter((task) => task.id !== taskId), deletedRecords: [...state.deletedRecords, ...recordDeletions("reminder_tasks", state.tasks, state.tasks.filter((task) => task.id !== taskId))], pendingPush: true })),
      markSynced: () => set({ pendingPush: false, lastSyncedAt: new Date().toISOString() }),
      markPendingPush: () => set({ pendingPush: true }),
      restoreFromBackup: (places, tasks, lastSyncedAt, deletedRecords = []) => set({ places, tasks, deletedRecords, pendingPush: false, lastSyncedAt }),
      resetLocalData: () => set({ places: [], tasks: [], deletedRecords: [], pendingPush: false, lastSyncedAt: undefined }),
    }),
    {
      name: "routineos-tasks", storage: createJSONStorage(() => AsyncStorage), version: 1,
      migrate: (persisted) => persisted as TaskState,
      merge: (persisted, current) => {
        const data = persisted as Partial<TaskState> | undefined;
        return {
          ...current, ...data, tasks: (data?.tasks ?? []).map((task) => ({
            id: task.id, title: task.title, placeId: task.placeId, completed: task.completed,
            createdAt: task.createdAt, updatedAt: task.updatedAt, completedAt: task.completedAt,
          }))
        };
      },
    },
  ),
);