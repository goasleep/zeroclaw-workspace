import { apiFetch } from "./base";

export interface StatusResponse {
  version: string;
  uptime_secs?: number;
  agents?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface ChannelInfo {
  name: string;
  type?: string;
  alias?: string;
  owning_agent?: string | null;
  enabled?: boolean;
  compiled?: boolean;
  status?: string;
  message_count?: number;
  last_message_at?: string | null;
  health?: string;
  readiness?: string;
  [k: string]: unknown;
}

export interface IntegrationInfo {
  name: string;
  description?: string;
  category?: "Chat" | "AiModel" | "ToolsAutomation" | "Platform" | string;
  status?: "Active" | "Available" | string;
  [k: string]: unknown;
}

export interface AgentWorkspaceEntry {
  name?: string;
  path: string;
  is_dir?: boolean;
  isDir?: boolean;
  [k: string]: unknown;
}

export type CronSchedule =
  | { kind: "cron"; expr: string; tz?: string | null }
  | { kind: "at"; at: string }
  | { kind: "every"; every_ms: number };

export interface CronJob {
  id: string;
  name?: string | null;
  prompt?: string | null;
  schedule?: CronSchedule | string | null;
  enabled?: boolean;
  next_run?: string | null;
  last_run?: string | null;
  last_status?: string | null;
  agent_alias?: string;
  [k: string]: unknown;
}

export interface CronRun {
  id: number;
  job_id: string;
  started_at: string;
  finished_at: string;
  status: string;
  output?: string | null;
  duration_ms?: number | null;
}

export interface CronTriggerResult {
  status: string;
  job_id: string;
  success: boolean;
  output: string;
  duration_ms: number;
  started_at: string;
  finished_at: string;
}

export interface CronJobPatch {
  agent: string;
  name?: string;
  schedule?: string;
  tz?: string;
  clear_tz?: boolean;
  command?: string;
  prompt?: string;
  enabled?: boolean;
}

export const apiStatus = () => apiFetch<StatusResponse>("/api/status");

export const apiHealth = () =>
  apiFetch<{ status: string; require_pairing?: boolean }>("/api/health");

export const apiMemory = () =>
  apiFetch<{ entries: Array<{ key: string; value: unknown }> }>("/api/memory");

export const apiTools = () =>
  apiFetch<{ tools: Array<{ name: string; [k: string]: unknown }> }>("/api/tools");

export const apiChannels = () => apiFetch<{ channels: ChannelInfo[] }>("/api/channels");

export const apiCron = () => apiFetch<{ jobs: CronJob[] }>("/api/cron");

export const apiCronPatch = (id: string, patch: CronJobPatch) =>
  apiFetch<CronJob | { status: string; job: CronJob }>(`/api/cron/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }).then(unwrapCronJob);

export const apiCronDelete = (id: string) =>
  apiFetch<{ status?: string }>(`/api/cron/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

export const apiCronRun = (id: string) =>
  apiFetch<CronTriggerResult>(`/api/cron/${encodeURIComponent(id)}/run`, {
    method: "POST",
  });

export const apiCronRuns = (jobId: string, limit = 20) =>
  apiFetch<{ runs: CronRun[] }>(
    `/api/cron/${encodeURIComponent(jobId)}/runs?limit=${encodeURIComponent(String(limit))}`,
  );

export const apiIntegrations = () =>
  apiFetch<{ integrations: IntegrationInfo[] }>("/api/integrations");

export const apiDoctor = () =>
  apiFetch<{ results: Array<{ severity: string; message: string }> }>("/api/doctor");

export const apiDevices = () =>
  apiFetch<{ devices: Array<{ id: string; name?: string }> }>("/api/devices");

export const apiAgentWorkspaceList = (alias: string, path?: string) =>
  apiFetch<{ entries: AgentWorkspaceEntry[] }>(
    `/api/agents/${encodeURIComponent(alias)}/workspace/list${
      path ? `?path=${encodeURIComponent(path)}` : ""
    }`,
  );

function unwrapCronJob(data: CronJob | { status: string; job: CronJob }): CronJob {
  return typeof (data as { job?: CronJob }).job === "object"
    ? (data as { job: CronJob }).job
    : (data as CronJob);
}
