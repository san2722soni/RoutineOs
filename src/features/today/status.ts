import type { DailyPlanBlock } from "@/src/types";
export function statusCopy(status: DailyPlanBlock["status"]) {
  if (status === "done") return "Marked as done";
  if (status === "not-done") return "Skipped";
  return "Ready to mark";
}

export function statusColor(status: DailyPlanBlock["status"], fallback: string) {
  if (status === "done") return "#22C55E";
  if (status === "not-done") return "#F59E0B";
  return fallback;
}
