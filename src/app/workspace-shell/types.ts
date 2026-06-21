export type WorkspacePage =
  | "dashboard"
  | "compose"
  | "task"
  | "tasks"
  | "approvals"
  | "automations"
  | "runtime"
  | "settings";

export type RuntimeTab = "overview" | "tools" | "memory" | "automations" | "logs" | "doctor" | "devices";

export type SettingsSection =
  | "app"
  | "setup-center"
  | "gateway-overview"
  | "gateway-config"
  | "models-providers"
  | "agents"
  | "agent-workspace"
  | "runtime-safety"
  | "channels"
  | "memory"
  | "tools-skills"
  | "tools"
  | "automations"
  | "cron"
  | "integrations"
  | "logs"
  | "doctor"
  | "devices";
