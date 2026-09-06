const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-typescript.cjs');

function storage() { const data = new Map(); return { data, getItem: async k => data.get(k) ?? null, setItem: async (k,v) => { data.set(k,v); }, removeItem: async k => { data.delete(k); } }; }
function reminders() {
  let handler, started = 0;
  const disk = storage(), sent = [];
  const place = { id: 'home', name: 'Home', latitude: 12, longitude: 77, radiusMeters: 150 };
  const state = { places: [place], tasks: [{ id: 'milk', title: 'Buy milk', placeId: 'home', completed: false }] };
  const store = { getState: () => state, persist: { hasHydrated: () => true } };
  const location = { GeofencingEventType: { Enter: 1, Exit: 2 }, Accuracy: { High: 4 },
    hasServicesEnabledAsync: async () => true, getForegroundPermissionsAsync: async () => ({ status: 'granted', granted: true }),
    getBackgroundPermissionsAsync: async () => ({ status: 'granted' }), hasStartedGeofencingAsync: async () => started > 0,
    startGeofencingAsync: async (_, regions) => { started++; assert.equal(regions[0].notifyOnExit, true); }, stopGeofencingAsync: async () => {},
    getCurrentPositionAsync: async () => ({ coords: { latitude: 12, longitude: 77, accuracy: 15 } }) };
  const load = loader({ '@react-native-async-storage/async-storage': disk, 'react-native': { Platform: { OS: 'android' }, Linking: {} },
    'expo-location': location, 'expo-task-manager': { isTaskDefined: () => false, defineTask: (_, fn) => { handler = fn; } },
    '@/src/store/taskStore': { useTaskStore: store }, '@/src/store/routineStore': { useRoutineStore: { getState: () => ({ settings: { soundEnabled: true } }), persist: store.persist } },
    '@/src/lib/notifications': { prepareNotifications: async () => ({ scheduleNotificationAsync: async n => { sent.push(n); } }) } });
  return { engine: load('src/lib/locationReminders.ts'), state, sent, enter: () => handler({ data: { region: { identifier: 'home' }, eventType: 1 } }), exit: () => handler({ data: { region: { identifier: 'home' }, eventType: 2 } }), registrations: () => started };
}
test('a reminder created at Home fires immediately without dates or network calls', async () => {
  const { engine, sent } = reminders(); await engine.checkNearbyReminders();
  assert.equal(sent.length, 1); assert.match(sent[0].content.body, /Buy milk/); assert.equal(sent[0].trigger.channelId, 'routine');
});
test('OS entry and nearby check do not duplicate; leaving rearms unfinished tasks', async () => {
  const r = reminders(); await Promise.all([r.enter(), r.engine.checkNearbyReminders()]); assert.equal(r.sent.length, 1);
  await r.exit(); await r.enter(); assert.equal(r.sent.length, 2);
  r.state.tasks[0].completed = true; await r.exit(); await r.enter(); assert.equal(r.sent.length, 2);
});
test('adding another task while already inside alerts only for the new task', async () => {
  const r = reminders(); await r.enter(); r.state.tasks.push({ id: 'bread', title: 'Bread', placeId: 'home', completed: false });
  await r.engine.checkNearbyReminders(); assert.equal(r.sent.length, 2); assert.equal(r.sent[1].content.body, 'Bread');
});
test('geofence registration is serialized and unchanged places are not restarted', async () => {
  const r = reminders(); await Promise.all([r.engine.syncPlaceGeofences(r.state.places), r.engine.syncPlaceGeofences(r.state.places)]);
  assert.equal(r.registrations(), 1);
});
test('real distance calculation handles inside, outside and identical coordinates', () => {
  const { distanceMeters } = loader()('src/features/tasks/locationMath.ts');
  assert.equal(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }), 0);
  assert.ok(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: .001, longitude: 0 }) < 150);
  assert.ok(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: .01, longitude: 0 }) > 1000);
});
test('deletion markers exclude old remote records, including a deleted whole plan', () => {
  const { recordDeletions, withoutDeleted } = loader()('src/lib/deletions.ts');
  const deleted = recordDeletions('daily_plans', [{ id: 'old' }], []);
  assert.deepEqual(withoutDeleted('daily_plans', [{ id: 'old' }, { id: 'new' }], deleted), [{ id: 'new' }]);
});
test('reminders stay in the real store until done or explicitly removed; deletion cascades', async () => {
  const disk = storage(); const { useTaskStore: store } = loader({ '@react-native-async-storage/async-storage': disk })('src/store/taskStore.ts');
  await store.persist.rehydrate(); const place = store.getState().addPlace({ name: 'Shop', latitude: 12, longitude: 77, radiusMeters: 150 });
  assert.equal(store.getState().addTask('Milk', place.id), true); assert.equal(store.getState().addTask('Bad', 'missing'), false);
  const task = store.getState().tasks[0]; assert.equal('dueDate' in task, false);
  store.getState().toggleTask(task.id); assert.equal(store.getState().tasks[0].completed, true);
  store.getState().removePlace(place.id); assert.equal(store.getState().tasks.length, 0);
  assert.deepEqual(store.getState().deletedRecords.map(d => d.table), ['saved_places', 'reminder_tasks']);
});
test('old reminder date fields are stripped during persistence migration', async () => {
  const disk = storage(); await disk.setItem('routineos-tasks', JSON.stringify({ version: 0, state: { places: [], tasks: [{ id: 'x', placeId: 'home', title: 'Milk', dueDate: '2099-01-01', completed: false }] } }));
  const { useTaskStore: store } = loader({ '@react-native-async-storage/async-storage': disk })('src/store/taskStore.ts');
  await store.persist.rehydrate(); assert.equal(store.getState().tasks.length, 1); assert.equal('dueDate' in store.getState().tasks[0], false);
});
