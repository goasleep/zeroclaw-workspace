import { describe, expect, it } from "vitest";

import { formatCronDateTime, formatCronRunDuration, formatCronSchedule } from "./format";

describe("formatCronSchedule", () => {
  it("formats structured cron schedules", () => {
    expect(formatCronSchedule({ kind: "cron", expr: "*/30 * * * *", tz: "Asia/Shanghai" })).toBe(
      "*/30 * * * * (Asia/Shanghai)",
    );
  });

  it("formats one-shot schedules", () => {
    expect(formatCronSchedule({ kind: "at", at: "2026-06-20T08:00:00Z" })).toBe(
      "at 2026-06-20T08:00:00Z",
    );
  });

  it("formats interval schedules", () => {
    expect(formatCronSchedule({ kind: "every", every_ms: 1_800_000 })).toBe("every 30m");
  });

  it("does not render plain objects as [object Object]", () => {
    expect(formatCronSchedule({ custom: true })).toBe('{"custom":true}');
  });
});

describe("formatCronDateTime", () => {
  it("formats RFC3339 timestamps", () => {
    expect(formatCronDateTime("2026-06-20T08:00:00Z", "en-US", { timeZone: "UTC" })).toBe(
      "06/20/2026, 08:00",
    );
  });

  it("keeps invalid strings inspectable", () => {
    expect(formatCronDateTime("not-a-date")).toBe("not-a-date");
  });
});

describe("formatCronRunDuration", () => {
  it("formats run durations", () => {
    expect(formatCronRunDuration(1_500)).toBe("1500ms");
    expect(formatCronRunDuration(120_000)).toBe("2m");
  });
});
