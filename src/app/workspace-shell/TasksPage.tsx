import { Bot, FolderOpen, ListTodo, MessageSquare, TerminalSquare } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useLingui } from "@lingui/react/macro";
import type { StudioTask } from "@/features/tasks/task-model";
import { taskActivityTime, taskStatusClass, taskStatusLabel } from "@/features/tasks/task-model";

interface TasksPageProps {
  tasks: StudioTask[];
  loading: boolean;
  error: string | null;
  currentRoot: string | null;
  renderCreateControl: () => ReactNode;
  onTask: (task: StudioTask) => void;
}

type Scope = "all" | "current" | "general";

export function TasksPage({
  tasks,
  loading,
  error,
  currentRoot,
  renderCreateControl,
  onTask,
}: TasksPageProps) {
  const { t } = useLingui();
  const [scope, setScope] = useState<Scope>("all");
  const sorted = useMemo(
    () => [...tasks].sort((a, b) => taskActivityTime(b).localeCompare(taskActivityTime(a))),
    [tasks],
  );

  const filtered = useMemo(() => {
    if (scope === "general") return sorted.filter((task) => !task.workspace_root);
    if (scope === "current" && currentRoot) {
      return sorted.filter((task) => task.workspace_root === currentRoot);
    }
    return sorted;
  }, [currentRoot, scope, sorted]);

  const groups = useMemo(() => groupTasks(filtered, currentRoot), [currentRoot, filtered]);
  const currentCount = currentRoot
    ? sorted.filter((task) => task.workspace_root === currentRoot).length
    : 0;
  const generalCount = sorted.filter((task) => !task.workspace_root).length;

  return (
    <main className="h-full min-h-0 overflow-auto bg-[#020818]/70 p-5 zc-scrollbar">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-neutral-100">{t`Tasks`}</h1>
            <p className="mt-1 text-xs text-neutral-500">
              {t`Tasks stay grouped by project when a workspace is attached.`}
            </p>
          </div>
          <div className="shrink-0">{renderCreateControl()}</div>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          <ScopeButton active={scope === "all"} onClick={() => setScope("all")}>
            {t`All`} <Count>{sorted.length}</Count>
          </ScopeButton>
          <ScopeButton
            active={scope === "current"}
            disabled={!currentRoot}
            onClick={() => setScope("current")}
          >
            {t`Current project`} <Count>{currentCount}</Count>
          </ScopeButton>
          <ScopeButton active={scope === "general"} onClick={() => setScope("general")}>
            {t`General`} <Count>{generalCount}</Count>
          </ScopeButton>
        </div>

        {loading && <MutedRow>{t`Loading tasks...`}</MutedRow>}
        {error && <MutedRow tone="error">{error}</MutedRow>}
        {!loading && !error && groups.length === 0 && (
          <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.025] p-8 text-center">
            <div>
              <ListTodo size={28} className="mx-auto mb-3 text-neutral-600" />
              <h2 className="text-sm font-semibold text-neutral-100">{t`No tasks here yet`}</h2>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-500">
                {scope === "current"
                  ? t`Create a task for the current project to keep its work together.`
                  : t`Create a task and choose whether it belongs to a project or general work.`}
              </p>
              <div className="mt-4 flex justify-center">{renderCreateControl()}</div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {groups.map((group) => (
            <section
              key={group.key}
              className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]"
            >
              <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <FolderOpen size={14} className="shrink-0 text-cyan-300" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-neutral-100">{group.label}</h2>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-neutral-500">
                    {group.path ?? t`No workspace bound`}
                  </p>
                </div>
                <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-neutral-400">
                  {t`${group.tasks.length} tasks`}
                </span>
              </header>
              <div className="divide-y divide-white/10">
                {group.tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onTask(task)}
                    className="grid w-full gap-3 px-4 py-3 text-left hover:bg-white/[0.04] md:grid-cols-[minmax(0,1fr)_160px_120px]"
                  >
                    <span className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
                        <Bot size={14} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-neutral-100">
                          {task.title}
                        </span>
                        <span className="mt-0.5 line-clamp-1 text-xs text-neutral-500">
                          {task.goal ?? t`No requirement captured`}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                      {task.mode === "acp" ? (
                        <TerminalSquare size={13} />
                      ) : (
                        <MessageSquare size={13} />
                      )}
                      {task.mode === "acp" ? t`Code` : t`Chat`}
                      {task.agent_alias && <span className="truncate">/ {task.agent_alias}</span>}
                    </span>
                    <span
                      className={`w-fit rounded border px-1.5 py-0.5 text-[10px] ${taskStatusClass(
                        task.status,
                      )}`}
                    >
                      {taskStatusLabel(task.status)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function groupTasks(tasks: StudioTask[], currentRoot: string | null) {
  const groups = new Map<
    string,
    { key: string; label: string; path: string | null; tasks: StudioTask[] }
  >();
  for (const task of tasks) {
    const key = task.workspace_root ?? "__general__";
    const label = task.workspace_root
      ? task.workspace_root === currentRoot
        ? "Current project"
        : projectName(task.workspace_root)
      : "General tasks";
    const existing = groups.get(key);
    if (existing) {
      existing.tasks.push(task);
    } else {
      groups.set(key, { key, label, path: task.workspace_root ?? null, tasks: [task] });
    }
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (a.path === currentRoot) return -1;
    if (b.path === currentRoot) return 1;
    if (!a.path) return 1;
    if (!b.path) return -1;
    return a.label.localeCompare(b.label);
  });
}

function projectName(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}

function ScopeButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
          : "border-white/10 text-neutral-300 hover:border-cyan-400 hover:text-cyan-300"
      }`}
    >
      {children}
    </button>
  );
}

function Count({ children }: { children: ReactNode }) {
  return <span className="text-[10px] text-neutral-500">{children}</span>;
}

function MutedRow({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "error" }) {
  return (
    <div
      className={`rounded-lg border p-3 text-xs ${
        tone === "error"
          ? "border-red-500/40 bg-red-500/10 text-red-200"
          : "border-white/10 bg-white/[0.025] text-neutral-500"
      }`}
    >
      {children}
    </div>
  );
}
