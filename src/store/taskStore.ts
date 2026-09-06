import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ReminderTask, SavedPlace } from "@/src/types";

function id() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === "x" ? value : (value & 0x3) | 0x8).toString(16);
  });
}

type TaskState = {
  places: SavedPlace[];
  tasks: ReminderTask[];
  addPlace: (place: Omit<SavedPlace, "id" | "createdAt" | "updatedAt">) => SavedPlace;
  setHomePlace: (placeId: string) => void;
  removePlace: (placeId: string) => void;
  addTask: (title: string, placeId: string, dueDate: string) => boolean;
  updateTask: (taskId: string, patch: { title?: string; placeId?: string; dueDate?: string }) => boolean;
  toggleTask: (taskId: string) => void;
  removeTask: (taskId: string) => void;
  removeExpiredTasks: (retentionMinutes: number) => void;
  pendingPush: boolean;
  lastSyncedAt?: string;
  markSynced: () => void;
  markPendingPush: () => void;
  restoreFromBackup: (places: SavedPlace[], tasks: ReminderTask[], lastSyncedAt?: string) => void;
  resetLocalData: () => void;
};

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      places: [],
      tasks: [],
      pendingPush: false,
      lastSyncedAt: undefined,
      addPlace: (place) => {
        const now = new Date().toISOString();
        const savedPlace = { ...place, id: id(), createdAt: now, updatedAt: now };
        set((state) => ({ places: [...state.places, savedPlace], pendingPush: true }));
        return savedPlace;
      },
      setHomePlace: (placeId) => set((state) => ({ places: state.places.map((place) => ({ ...place, isHome: place.id === placeId, updatedAt: place.id === placeId ? new Date().toISOString() : place.updatedAt })), pendingPush: true })),
      removePlace: (placeId) => set((state) => ({ places: state.places.filter((place) => place.id !== placeId), tasks: state.tasks.filter((task) => task.placeId !== placeId), pendingPush: true })),
      addTask: (title, placeId, dueDate) => {
        if (!title.trim() || !placeId) return false;
        const now = new Date().toISOString();
        set((state) => ({ tasks: [...state.tasks, { id: id(), title: title.trim(), placeId, dueDate, completed: false, createdAt: now, updatedAt: now }], pendingPush: true }));
        return true;
      },
      updateTask: (taskId, patch) => {
        if (patch.title !== undefined && !patch.title.trim()) return false;
        set((state) => ({ tasks: state.tasks.map((task) => task.id === taskId ? { ...task, ...patch, title: patch.title?.trim() ?? task.title, updatedAt: new Date().toISOString() } : task), pendingPush: true }));
        return true;
      },
      toggleTask: (taskId) => set((state) => ({ tasks: state.tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : undefined, updatedAt: new Date().toISOString() } : task), pendingPush: true })),
      removeTask: (taskId) => set((state) => ({ tasks: state.tasks.filter((task) => task.id !== taskId), pendingPush: true })),
      removeExpiredTasks: (retentionMinutes) => set((state) => {
        const cutoff = Date.now() - retentionMinutes * 60 * 1000;
        const tasks = state.tasks.filter((task) => !task.completed || !task.completedAt || new Date(task.completedAt).getTime() > cutoff);
        return tasks.length === state.tasks.length ? state : { tasks, pendingPush: true };
      }),
      markSynced: () => set({ pendingPush: false, lastSyncedAt: new Date().toISOString() }),
      markPendingPush: () => set({ pendingPush: true }),
      restoreFromBackup: (places, tasks, lastSyncedAt) => set({ places, tasks, pendingPush: false, lastSyncedAt }),
      resetLocalData: () => set({ places: [], tasks: [], pendingPush: false, lastSyncedAt: undefined }),
    }),
    { name: "routineos-tasks", storage: createJSONStorage(() => AsyncStorage) },
  ),
);