import type { StudioTask, TaskBackfillSession, TaskMode, TaskPatch, TaskStatus } from "@/api/tauri";
import type { NormalizedSession } from "@/features/chat/use-chat";

export type { StudioTask, TaskBackfillSession, TaskMode, TaskPatch, TaskStatus };

export function nowIso() {
  return new Date().toISOString();
}

export function createDraftTask({
  connectionId,
  title,
  goal,
  workspaceRoot,
  agentAlias,
  mode,
}: {
  connectionId: string;
  title: string;
  goal?: string | null;
  workspaceRoot?: string | null;
  agentAlias?: string | null;
  mode: TaskMode;
}): StudioTask {
  const timestamp = nowIso();
  return {
    id: crypto.randomUUID(),
    connection_id: connectionId,
    title: title.trim() || "Untitled task",
    goal: goal?.trim() || null,
    session_id: null,
    cron_job_id: null,
    workspace_root: workspaceRoot ?? null,
    agent_alias: agentAlias ?? null,
    mode,
    status: "draft",
    tags: [],
    pinned_result: null,
    created_at: timestamp,
    updated_at: timestamp,
    last_activity_at: timestamp,
    archived_at: null,
  };
}

export function sessionToBackfillSession(session: NormalizedSession): TaskBackfillSession {
  return {
    session_id: session.session_id,
    name: session.name,
    agent_alias: session.agent_alias ?? null,
    created_at: session.created_at ?? null,
    updated_at: session.updated_at ?? null,
    last_message_at: session.last_message_at ?? null,
    message_count: session.message_count ?? null,
  };
}

export function taskActivityTime(task: StudioTask) {
  return task.last_activity_at ?? task.updated_at ?? task.created_at;
}

export function visibleTasks(tasks: StudioTask[]) {
  return tasks.filter((task) => task.status !== "archived");
}

export function taskMatchesSession(task: StudioTask, sessionId: string | null) {
  return Boolean(sessionId && task.session_id === sessionId);
}

export function taskStatusLabel(status: TaskStatus) {
  switch (status) {
    case "draft":
      return "Draft";
    case "running":
      return "Running";
    case "needs_approval":
      return "Needs approval";
    case "done":
      return "Done";
    case "failed":
      return "Failed";
    case "archived":
      return "Archived";
  }
}

export function taskStatusClass(status: TaskStatus) {
  switch (status) {
    case "running":
      return "border-sky-400/30 bg-sky-400/10 text-sky-200";
    case "needs_approval":
      return "border-amber-400/30 bg-amber-400/10 text-amber-200";
    case "failed":
      return "border-red-400/30 bg-red-400/10 text-red-200";
    case "done":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    case "archived":
      return "border-neutral-500/30 bg-neutral-500/10 text-neutral-300";
    case "draft":
      return "border-neutral-500/30 bg-white/[0.04] text-neutral-300";
  }
}
