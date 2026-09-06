const pad = (value: number) => String(value).padStart(2, "0");

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dateFromOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function displayDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function fullDisplayDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function timeToMinutes(time: string) {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function nowMinutes() {
  const date = new Date();
  return date.getHours() * 60 + date.getMinutes();
}

export function blockDurationSeconds(block: Pick<{ start: string; end: string }, "start" | "end">) {
  return Math.max(0, timeToMinutes(block.end) - timeToMinutes(block.start)) * 60;
}

export function blockStartDate(block: { date?: string; start: string }, offsetMinutes = 0) {
  const [hour = 0, minute = 0] = block.start.split(":").map(Number);
  const date = new Date(`${block.date ?? dateFromOffset(0)}T00:00:00`);
  date.setHours(hour, minute - offsetMinutes, 0, 0);
  return date;
}

export function blockEndDate(block: { date?: string; end: string }, offsetMinutes = 0) {
  const [hour = 0, minute = 0] = block.end.split(":").map(Number);
  const date = new Date(`${block.date ?? dateFromOffset(0)}T00:00:00`);
  date.setHours(hour, minute - offsetMinutes, 0, 0);
  return date;
}

export function dateHasStarted(dateKey: string) {
  return Date.now() >= new Date(`${dateKey}T00:00:00`).getTime();
}

export function isToday(dateKey: string) {
  return dateKey === dateFromOffset(0);
}

export function formatTime(time: string) {
  const [rawHour = 0, minute = 0] = time.split(":").map(Number);
  const suffix = rawHour >= 12 ? "PM" : "AM";
  const hour = rawHour % 12 || 12;
  return `${hour}:${pad(minute)} ${suffix}`;
}

export function formatRange(block: Pick<{ start: string; end: string }, "start" | "end">) {
  return `${formatTime(block.start)} - ${formatTime(block.end)}`;
}
