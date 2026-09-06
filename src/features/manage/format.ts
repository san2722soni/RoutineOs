export function daysLabel(dayRules: number[]) {
  if (!dayRules.length) return "Manual";
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return dayRules.map((day) => names[day]).filter(Boolean).join(", ");
}

export function normalizeColor(color: string) {
  const value = color.trim();
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#38BDF8";
}
