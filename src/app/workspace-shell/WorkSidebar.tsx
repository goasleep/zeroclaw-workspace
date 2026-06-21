import {
  Activity,
  Bot,
  CheckCircle2,
  Clock3,
  FolderOpen,
  Gauge,
  Inbox,
  ListTodo,
  Settings,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { useLingui } from "@lingui/react/macro";
import { useConnections } from "@/app/connection-context";
import { useWorkspace } from "@/app/workspace-context";
import type { StudioTask } from "@/features/tasks/task-model";
import { taskActivityTime, taskStatusClass, taskStatusLabel } from "@/features/tasks/task-model";
import type { WorkspacePage } from "./types";

interface WorkSidebarProps {
  page: WorkspacePage;
  tasks: StudioTask[];
  activeTaskId: string | null;
  approvalCount: number;
  automationCount: number;
  onPage: (page: WorkspacePage) => void;
  onTask: (task: StudioTask) => void;
  createControl: ReactNode;
  onProject: (path: string) => void;
  onPickRoot: () => void;
}

export function WorkSidebar({
  page,
  tasks,
  activeTaskId,
  approvalCount,
  automationCount,
  onPage,
  onTask,
  createControl,
  onProject,
  onPickRoot,
}: WorkSidebarProps) {
  const { t } = useLingui();
  const { active, health, activation } = useConnections();
  const { root, recentRoots, selectedFiles } = useWorkspace();
  const recentTasks = useMemo(
    () =>
      [...tasks]
        .sort((a, b) => {
          const aProjectRank = taskProjectRank(a, root);
          const bProjectRank = taskProjectRank(b, root);
          if (aProjectRank !== bProjectRank) return aProjectRank - bProjectRank;
          return taskActivityTime(b).localeCompare(taskActivityTime(a));
        })
        .slice(0, 8),
    [root, tasks],
  );

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-white/[0.08] bg-[#020818]/90">
      <header className="shrink-0 border-b border-white/[0.08] px-3 py-3">
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
          <Gauge size={13} className="text-cyan-300" />
          <span className="min-w-0 flex-1 truncate">{active?.name ?? t`No connection`}</span>
          <span
            className={`rounded border px-1.5 py-0.5 text-[10px] ${
              health?.healthy
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                : "border-neutral-500/25 bg-white/[0.04] text-neutral-400"
            }`}
          >
            {health ? (health.healthy ? t`online` : t`offline`) : (activation?.type ?? t`idle`)}
          </span>
        </div>
        <div className="mt-1 truncate font-mono text-[10px] text-neutral-600">
          {root ?? t`No workspace selected for this runtime.`}
        </div>
      </header>

      <div className="shrink-0 border-b border-white/[0.08] p-2">{createControl}</div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 zc-scrollbar">
        <NavGroup label={t`Work`}>
          <NavButton
            active={page === "dashboard"}
            icon={Activity}
            label={t`Dashboard`}
            onClick={() => onPage("dashboard")}
          />
          <NavButton
            active={page === "tasks" || page === "task"}
            icon={ListTodo}
            label={t`Tasks`}
            badge={tasks.length || undefined}
            onClick={() => onPage("tasks")}
          />
          <NavButton
            active={page === "approvals"}
            icon={Inbox}
            label={t`Approvals`}
            badge={approvalCount || undefined}
            onClick={() => onPage("approvals")}
          />
          <NavButton
            active={page === "automations"}
            icon={Clock3}
            label={t`Automations`}
            badge={automationCount || undefined}
            onClick={() => onPage("automations")}
          />
        </NavGroup>

        <NavGroup label={t`Workspace`}>
          {root ? (
            <button
              type="button"
              onClick={() => onProject(root)}
              className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-neutral-300 hover:bg-white/[0.05] hover:text-neutral-100"
            >
              <FolderOpen size={13} className="text-cyan-300" />
              <span className="min-w-0 flex-1 truncate">{root}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onPickRoot}
              className="mb-1 flex w-full items-center gap-2 rounded-md border border-dashed border-white/10 px-2 py-1.5 text-left text-xs text-neutral-500 hover:border-cyan-400/40 hover:text-cyan-300"
            >
              <FolderOpen size={13} />
              {t`Open project`}
            </button>
          )}
          {recentRoots
            .filter((path) => path !== root)
            .slice(0, 4)
            .map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => onProject(path)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] text-neutral-500 hover:bg-white/[0.05] hover:text-neutral-200"
              >
                <span className="min-w-0 flex-1 truncate font-mono">{path}</span>
              </button>
            ))}
          {selectedFiles.length > 0 && (
            <div className="mt-2 rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2 py-1.5 text-[11px] text-cyan-100">
              {t`${selectedFiles.length} selected`}
            </div>
          )}
        </NavGroup>

        <NavGroup label={t`Recent Tasks`}>
          {tasks.length === 0 ? (
            <div className="rounded-md border border-dashed border-white/10 p-2 text-xs text-neutral-600">
              {t`No tasks yet.`}
            </div>
          ) : (
            recentTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onTask(task)}
                className={`mb-1 flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition ${
                  activeTaskId === task.id
                    ? "bg-cyan-400/10 text-cyan-100"
                    : "text-neutral-300 hover:bg-white/[0.05] hover:text-neutral-100"
                }`}
              >
                <Bot size={13} className="mt-0.5 shrink-0 text-cyan-300" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{task.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1">
                    <span
                      className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] ${taskStatusClass(
                        task.status,
                      )}`}
                    >
                      {taskStatusLabel(task.status)}
                    </span>
                    <span className="max-w-full truncate text-[10px] text-neutral-500">
                      {taskProjectLabel(task, root)}
                    </span>
                  </span>
                </span>
              </button>
            ))
          )}
        </NavGroup>
      </div>

      <footer className="shrink-0 border-t border-white/10 p-2">
        <button
          type="button"
          onClick={() => onPage("runtime")}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
            page === "runtime" || page === "settings"
              ? "bg-cyan-400/10 text-cyan-100"
              : "text-neutral-300 hover:bg-white/[0.05] hover:text-neutral-100"
          }`}
        >
          <Settings size={14} />
          <span className="min-w-0 flex-1 truncate">{t`Runtime`}</span>
        </button>
      </footer>
    </aside>
  );
}

function taskProjectRank(task: StudioTask, root: string | null) {
  if (root && task.workspace_root === root) return 0;
  if (!task.workspace_root) return 2;
  return 1;
}

function taskProjectLabel(task: StudioTask, root: string | null) {
  if (root && task.workspace_root === root) return "Current project";
  if (!task.workspace_root) return "General";
  return task.workspace_root.split(/[\\/]/).filter(Boolean).at(-1) ?? task.workspace_root;
}

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 text-[10px] uppercase tracking-wide text-neutral-500">{label}</h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function NavButton({
  active,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: typeof CheckCircle2;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
        active ? "bg-cyan-400/10 text-cyan-100" : "text-neutral-300 hover:bg-white/[0.05]"
      }`}
    >
      <Icon size={13} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <span className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[10px] text-neutral-300">
          {badge}
        </span>
      )}
    </button>
  );
}
