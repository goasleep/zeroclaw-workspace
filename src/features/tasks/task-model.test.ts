import { describe, expect, it } from "vitest";
import {
  createDraftTask,
  sessionToBackfillSession,
  taskStatusLabel,
  visibleTasks,
} from "./task-model";

describe("task model", () => {
  it("creates Studio-owned draft metadata", () => {
    const task = createDraftTask({
      connectionId: "conn",
      title: "  Ship report  ",
      goal: "  summarize  ",
      workspaceRoot: "/repo",
      agentAlias: "default",
      mode: "chat",
    });

    expect(task.title).toBe("Ship report");
    expect(task.goal).toBe("summarize");
    expect(task.connection_id).toBe("conn");
    expect(task.workspace_root).toBe("/repo");
    expect(task.status).toBe("draft");
    expect(task.session_id).toBeNull();
  });

  it("hides archived tasks by default", () => {
    const active = createDraftTask({ connectionId: "conn", title: "Active", mode: "chat" });
    const archived = { ...active, id: "archived", status: "archived" as const };
    expect(visibleTasks([active, archived]).map((task) => task.id)).toEqual([active.id]);
  });

  it("maps sessions to backfill payloads", () => {
    expect(
      sessionToBackfillSession({
        session_id: "s1",
        name: "Session",
        agent_alias: "agent",
        message_count: 2,
      }),
    ).toMatchObject({
      session_id: "s1",
      name: "Session",
      agent_alias: "agent",
      message_count: 2,
    });
  });

  it("labels statuses", () => {
    expect(taskStatusLabel("needs_approval")).toBe("Needs approval");
  });
});
