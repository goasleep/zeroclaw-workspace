export function formatCronSchedule(schedule: unknown): string {
  if (schedule == null) return "";
  if (typeof schedule === "string") return schedule;
  if (typeof schedule !== "object") return String(schedule);

  const record = schedule as Record<string, unknown>;
  switch (record.kind) {
    case "cron": {
      const expr = typeof record.expr === "string" ? record.expr : "";
      const tz = typeof record.tz === "string" && record.tz.length > 0 ? record.tz : null;
      return tz ? `${expr} (${tz})` : expr;
    }
    case "at":
      return typeof record.at === "string" ? `at ${record.at}` : stringifySchedule(record);
    case "every":
      return typeof record.every_ms === "number"
        ? `every ${formatDuration(record.every_ms)}`
        : stringifySchedule(record);
    default:
      return stringifySchedule(record);
  }
}

export function formatCronDateTime(
  value: unknown,
  locale?: string,
  options: { timeZone?: string } = {},
): string {
  if (value == null || value === "") return "";
  if (typeof value !== "string") return String(value);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: options.timeZone,
  }).format(date);
}

export function formatCronRunDuration(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value !== "number") return String(value);
  return formatDuration(value);
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) return String(ms);
  if (ms > 0 && ms % 3_600_000 === 0) return `${ms / 3_600_000}h`;
  if (ms > 0 && ms % 60_000 === 0) return `${ms / 60_000}m`;
  if (ms > 0 && ms % 1_000 === 0) return `${ms / 1_000}s`;
  return `${ms}ms`;
}

function stringifySchedule(schedule: Record<string, unknown>): string {
  try {
    return JSON.stringify(schedule);
  } catch {
    return "";
  }
}
