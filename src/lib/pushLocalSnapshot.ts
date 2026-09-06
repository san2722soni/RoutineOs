import { assertActiveDevice } from "@/src/lib/deviceSession";
import { logActionError, logActionStart, logActionSuccess } from "@/src/lib/logger";
import { supabase } from "@/src/lib/supabase";
import { pushSnapshot } from "@/src/lib/supabaseSync";
import { useRoutineStore } from "@/src/store/routineStore";
import { useTaskStore } from "@/src/store/taskStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

let running: Promise<boolean> | undefined;
export function pushLocalSnapshot(action = "push local snapshot") {
  if (!running) running = performPush(action).finally(() => { running = undefined; });
  return running;
}

async function performPush(action: string) {
  const startedWith = useRoutineStore.getState();
  const { settings, categories, templates, resources, plans, executionEvents, sync, markSynced, markPendingPush } = startedWith;
  const taskState = useTaskStore.getState();
  const details = { categories: categories.length, templates: templates.length, resources: resources.length, plans: Object.keys(plans).length, events: executionEvents.length, places: taskState.places.length, tasks: taskState.tasks.length };
  logActionStart(action, details);
  try {
    await assertActiveDevice();
    const merged = await pushSnapshot({ settings, categories, templates, resources, plans, executionEvents, places: taskState.places, tasks: taskState.tasks, deletedRecords: [...startedWith.deletedRecords, ...taskState.deletedRecords], lastSyncedAt: sync.lastSyncedAt });
    const current = useRoutineStore.getState();
    const currentTasks = useTaskStore.getState();
    if (
      current.deletedRecords === startedWith.deletedRecords &&
      currentTasks.deletedRecords === taskState.deletedRecords &&
      current.settings === settings &&
      current.categories === categories &&
      current.templates === templates &&
      current.resources === resources &&
      current.plans === plans &&
      current.executionEvents === executionEvents &&
      currentTasks.places === taskState.places &&
      currentTasks.tasks === taskState.tasks
    ) {
      if (merged) {
        useRoutineStore.getState().restoreFromBackup(merged);
        useTaskStore.getState().restoreFromBackup(merged.places, merged.tasks, new Date().toISOString(), merged.deletedRecords);
      }
      markSynced();
      useTaskStore.getState().markSynced();
      const { data } = await supabase.auth.getSession();
      if (data.session) await AsyncStorage.removeItem(`routineos-recovery:${data.session.user.id}`);
    } else {
      markPendingPush();
      useTaskStore.getState().markPendingPush();
    }
    logActionSuccess(action, details);
    return true;
  } catch (error) {
    markPendingPush(error instanceof Error ? error.message : "Backup failed. Your changes remain on this phone.");
    useTaskStore.getState().markPendingPush();
    logActionError(action, error, details);
    return false;
  }
}
