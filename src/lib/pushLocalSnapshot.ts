import { pushSnapshot } from "@/src/lib/supabaseSync";
import { assertActiveDevice } from "@/src/lib/deviceSession";
import { useRoutineStore } from "@/src/store/routineStore";
import { useTaskStore } from "@/src/store/taskStore";
import { logActionError, logActionStart, logActionSuccess } from "@/src/lib/logger";

export async function pushLocalSnapshot(action = "push local snapshot") {
  const startedWith = useRoutineStore.getState();
  const { settings, categories, templates, resources, plans, executionEvents, sync, markSynced, markPendingPush } = startedWith;
  const taskState = useTaskStore.getState();
  const details = { categories: categories.length, templates: templates.length, resources: resources.length, plans: Object.keys(plans).length, events: executionEvents.length, places: taskState.places.length, tasks: taskState.tasks.length };
  logActionStart(action, details);
  try {
    await assertActiveDevice();
    await pushSnapshot({ settings, categories, templates, resources, plans, executionEvents, places: taskState.places, tasks: taskState.tasks, lastSyncedAt: sync.lastSyncedAt });
    const current = useRoutineStore.getState();
    const currentTasks = useTaskStore.getState();
    if (
      current.settings === settings &&
      current.categories === categories &&
      current.templates === templates &&
      current.resources === resources &&
      current.plans === plans &&
      current.executionEvents === executionEvents &&
      currentTasks.places === taskState.places &&
      currentTasks.tasks === taskState.tasks
    ) {
      markSynced();
      useTaskStore.getState().markSynced();
    } else {
      markPendingPush();
      useTaskStore.getState().markPendingPush();
    }
    logActionSuccess(action, details);
    return true;
  } catch (error) {
    markPendingPush("Backup couldn’t finish. We’ll try again later.");
    useTaskStore.getState().markPendingPush();
    logActionError(action, error, details);
    return false;
  }
}
