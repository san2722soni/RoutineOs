export type DeletedRecord = { table: string; id: string; deletedAt: string };

export function recordDeletions(table: string, before: { id: string }[], after: { id: string }[]) {
  const kept = new Set(after.map((item) => item.id));
  return before.filter((item) => !kept.has(item.id)).map((item) => ({ table, id: item.id, deletedAt: new Date().toISOString() }));
}

export function mergeDeletions(...lists: DeletedRecord[][]) {
  return [...new Map(lists.flat().map((item) => [`${item.table}:${item.id}`, item])).values()];
}

export function withoutDeleted<T extends { id: string }>(table: string, rows: T[], deleted: DeletedRecord[]) {
  const ids = new Set(deleted.filter((item) => item.table === table).map((item) => item.id));
  return rows.filter((row) => !ids.has(row.id));
}
