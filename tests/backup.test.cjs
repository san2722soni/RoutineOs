const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-typescript.cjs');
const blank = () => ({ settings: {}, categories: [], templates: [], resources: [], plans: {}, executionEvents: [], places: [], tasks: [], deletedRecords: [] });

test('backup excludes deleted cloud tasks and uses one atomic database call', async () => {
  const calls = [];
  const remote = { ...blank(), tasks: [{ id: 'removed', title: 'Old task', placeId: 'shop', updatedAt: '2026-01-01T00:00:00Z' }] };
  const load = loader({ './pullSnapshot': { pullSnapshot: async () => remote }, './userId': { userId: async () => 'user' },
    '@/src/lib/deviceSession': { getDeviceId: async () => 'device' }, '@/src/lib/supabase': { supabase: { rpc: async (name, payload) => { calls.push({ name, payload }); return {}; } } } });
  const { pushSnapshot } = load('src/lib/sync/pushSnapshot.ts');
  const result = await pushSnapshot({ ...blank(), deletedRecords: [{ table: 'reminder_tasks', id: 'removed', deletedAt: '2026-09-07T00:00:00Z' }] });
  assert.equal(calls.length, 1); assert.equal(calls[0].name, 'routineos_push_snapshot');
  assert.deepEqual(calls[0].payload.p_snapshot.reminder_tasks, []); assert.deepEqual(result.tasks, []);
  assert.equal('reminder_retention_minutes' in calls[0].payload.p_snapshot.profiles, false);
});
test('backup failure propagates and cannot be reported as a completed upload', async () => {
  const { pushSnapshot } = loader({ './pullSnapshot': { pullSnapshot: async () => null }, './userId': { userId: async () => 'user' },
    '@/src/lib/deviceSession': { getDeviceId: async () => 'device' }, '@/src/lib/supabase': { supabase: { rpc: async () => ({ error: { message: 'inactive-device' } }) } } })('src/lib/sync/pushSnapshot.ts');
  await assert.rejects(() => pushSnapshot(blank()), /inactive-device/);
});
test('edits during upload remain pending and are not overwritten by the captured snapshot', async () => {
  let finish, pending = false, marked = false;
  let routine = { ...blank(), sync: {}, markSynced: () => { marked = true; }, markPendingPush: () => { pending = true; } };
  const task = { places: [], tasks: [], deletedRecords: [], markPendingPush: () => {}, markSynced: () => {} };
  const { pushLocalSnapshot } = loader({
    '@/src/lib/deviceSession': { assertActiveDevice: async () => {} }, '@/src/lib/logger': { logActionStart() {}, logActionError() {}, logActionSuccess() {} },
    '@/src/lib/supabase': { supabase: {} }, '@/src/lib/supabaseSync': { pushSnapshot: () => new Promise(resolve => { finish = resolve; }) },
    '@/src/store/routineStore': { useRoutineStore: { getState: () => routine } }, '@/src/store/taskStore': { useTaskStore: { getState: () => task } },
    '@react-native-async-storage/async-storage': {},
  })('src/lib/pushLocalSnapshot.ts');
  const upload = pushLocalSnapshot(); await new Promise(resolve => setImmediate(resolve));
  const second = pushLocalSnapshot(); assert.equal(upload, second);
  routine = { ...routine, categories: [{ id: 'new-category' }] }; finish(blank()); await upload;
  assert.equal(pending, true); assert.equal(marked, false); assert.equal(routine.categories[0].id, 'new-category');
});
test('sign out refuses to clear unsynced data when backup fails', async () => {
  let signedOut = false, reset = false;
  const { signOut } = loader({
    '@react-native-async-storage/async-storage': {}, 'expo-linking': {}, 'expo-web-browser': { maybeCompleteAuthSession() {} },
    '@/src/lib/supabase': { supabase: { auth: { signOut: async () => { signedOut = true; return {}; } } } },
    '@/src/lib/pushLocalSnapshot': { pushLocalSnapshot: async () => false },
    '@/src/store/routineStore': { useRoutineStore: { getState: () => ({ sync: { pendingPush: true }, resetLocalData: () => { reset = true; } }) } },
    '@/src/store/taskStore': { useTaskStore: { getState: () => ({ pendingPush: false }) } },
  })('src/lib/auth.ts');
  await assert.rejects(() => signOut(), /finish backup/); assert.equal(signedOut, false); assert.equal(reset, false);
});
test('plan and category deletions are tracked by the real persisted routine store', async () => {
  const disk = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };
  const { useRoutineStore: store } = loader({ '@react-native-async-storage/async-storage': disk })('src/store/routineStore.ts');
  await store.persist.rehydrate(); const category = store.getState().createCategory(); store.getState().deleteCategory(category.id);
  assert.ok(store.getState().deletedRecords.some(d => d.id === category.id && d.table === 'categories'));
  assert.equal('reminderRetentionMinutes' in store.getState().settings, false);
});
