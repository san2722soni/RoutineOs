export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return String(record.message ?? record.error_description ?? record.error ?? JSON.stringify(record));
  }
  return String(error);
}

export function errorDetails(error: unknown) {
  if (!error || typeof error !== "object") return error;
  const record = error as Record<string, unknown>;
  return {
    message: record.message,
    code: record.code,
    details: record.details,
    hint: record.hint,
    status: record.status,
    name: record.name,
  };
}

export function logActionStart(action: string, details?: Record<string, unknown>) {
  console.log(`[RoutineOS] start ${action}`, details ?? "");
}

export function logActionSuccess(action: string, details?: Record<string, unknown>) {
  console.log(`[RoutineOS] success ${action}`, details ?? "");
}

export function logActionError(action: string, error: unknown, details?: Record<string, unknown>) {
  console.log(`[RoutineOS] failed ${action}`, errorMessage(error), errorDetails(error), details ?? "");
}
