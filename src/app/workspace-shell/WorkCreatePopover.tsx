import * as Popover from "@radix-ui/react-popover";
import { Bot, CalendarClock, ChevronLeft, Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLingui } from "@lingui/react/macro";
import { Select } from "@/ui/select";
import { SegmentedControl } from "@/ui/segmented-control";

type CreateKind = "task" | "automation";
type TaskMode = "chat" | "acp";

interface CreateTaskInput {
  title: string;
  goal: string | null;
  mode: TaskMode;
  agentAlias: string;
  workspaceRoot: string | null;
}

interface CreateAutomationInput {
  name: string;
  prompt: string;
  agentAlias: string;
  schedule: string;
}

interface WorkCreatePopoverProps {
  children: ReactNode;
  defaultKind?: CreateKind;
  side?: "top" | "right" | "bottom" | "left";
  agents: string[];
  activeAgent: string | null;
  root: string | null;
  recentRoots: string[];
  onCreateTask: (input: CreateTaskInput) => Promise<void>;
  onCreateAutomation: (input: CreateAutomationInput) => Promise<void>;
  onOpenAgentSetup: () => void;
  onOpenSetupCenter: () => void;
  onChooseWorkspace: () => Promise<string | null>;
}

const GENERAL_WORKSPACE = "__general__";

export function WorkCreatePopover({
  children,
  defaultKind,
  side = "right",
  agents,
  activeAgent,
  root,
  recentRoots,
  onCreateTask,
  onCreateAutomation,
  onOpenAgentSetup,
  onOpenSetupCenter,
  onChooseWorkspace,
}: WorkCreatePopoverProps) {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CreateKind | null>(defaultKind ?? null);
  const [taskTitle, setTaskTitle] = useState(t`New task`);
  const [automationName, setAutomationName] = useState(t`New automation`);
  const [requirement, setRequirement] = useState("");
  const [taskMode, setTaskMode] = useState<TaskMode>("chat");
  const [agentAlias, setAgentAlias] = useState(activeAgent ?? agents[0] ?? "");
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(root);
  const [time, setTime] = useState(defaultTime());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKind(defaultKind ?? null);
    setTaskTitle(t`New task`);
    setAutomationName(t`New automation`);
    setRequirement("");
    setTaskMode("chat");
    setAgentAlias(activeAgent ?? agents[0] ?? "");
    setWorkspaceRoot(null);
    setTime(defaultTime());
    setBusy(false);
    setError(null);
  }, [activeAgent, agents, defaultKind, open, root, t]);

  const agentOptions = useMemo(
    () => agents.map((agent) => ({ value: agent, label: agent })),
    [agents],
  );
  const hourOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hour) => {
        const value = String(hour).padStart(2, "0");
        return { value, label: value };
      }),
    [],
  );
  const minuteOptions = useMemo(
    () =>
      Array.from({ length: 60 }, (_, minute) => {
        const value = String(minute).padStart(2, "0");
        return { value, label: value };
      }),
    [],
  );
  const workspaceOptions = useMemo(() => {
    const paths = Array.from(new Set([root, ...recentRoots].filter(Boolean) as string[]));
    return [
      { value: GENERAL_WORKSPACE, label: t`General chat` },
      ...paths.map((path) => ({ value: path, label: workspaceLabel(path, root) })),
    ];
  }, [recentRoots, root, t]);

  function close() {
    setOpen(false);
  }

  function openSetup(target: "agents" | "setup") {
    close();
    if (target === "agents") onOpenAgentSetup();
    else onOpenSetupCenter();
  }

  async function chooseWorkspace() {
    setError(null);
    try {
      const chosen = await onChooseWorkspace();
      if (chosen) setWorkspaceRoot(chosen);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function changeTaskMode(nextMode: TaskMode) {
    setTaskMode(nextMode);
    if (nextMode === "acp" && !workspaceRoot && root) {
      setWorkspaceRoot(root);
    }
  }

  function changeTimePart(part: "hour" | "minute", value: string) {
    const [hour, minute] = validTime(time) ? time.split(":") : defaultTime().split(":");
    setTime(part === "hour" ? `${value}:${minute}` : `${hour}:${value}`);
  }

  async function submitTask() {
    const title = taskTitle.trim();
    if (!title || !agentAlias || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onCreateTask({
        title,
        goal: requirement.trim() || null,
        mode: taskMode,
        agentAlias,
        workspaceRoot,
      });
      close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitAutomation() {
    const name = automationName.trim();
    const prompt = requirement.trim();
    if (!name || !prompt || !agentAlias || !validTime(time) || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onCreateAutomation({
        name,
        prompt,
        agentAlias,
        schedule: dailyCron(time),
      });
      close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const noAgents = agents.length === 0;
  const taskDisabled = !taskTitle.trim() || !agentAlias || busy;
  const automationDisabled =
    !automationName.trim() || !requirement.trim() || !agentAlias || !validTime(time) || busy;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          align="start"
          sideOffset={10}
          onInteractOutside={(event) => event.preventDefault()}
          className="z-50 w-[400px] max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-[#061126] p-3 text-sm text-neutral-100 shadow-2xl shadow-black/50 outline-none"
        >
          <div className="mb-3 flex items-center gap-2">
            {kind && (
              <button
                type="button"
                onClick={() => setKind(null)}
                className="rounded p-1 text-neutral-500 hover:bg-white/[0.06] hover:text-neutral-200"
                aria-label={t`Back`}
              >
                <ChevronLeft size={14} />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-neutral-100">
                {kind === "automation"
                  ? t`New automation`
                  : kind === "task"
                    ? t`New task`
                    : t`Create work`}
              </h2>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                {kind === "automation"
                  ? t`Schedule repeat work on this runtime.`
                  : kind === "task"
                    ? t`Start one piece of agent work.`
                    : t`Choose what kind of work to create.`}
              </p>
            </div>
            <Popover.Close asChild>
              <button
                type="button"
                className="rounded p-1 text-neutral-500 hover:bg-white/[0.06] hover:text-neutral-200"
                aria-label={t`Close`}
              >
                <X size={14} />
              </button>
            </Popover.Close>
          </div>

          {noAgents ? (
            <NoAgentState
              onAgentSetup={() => openSetup("agents")}
              onSetupCenter={() => openSetup("setup")}
            />
          ) : kind === null ? (
            <KindPicker onKind={setKind} />
          ) : (
            <div className="space-y-3">
              {kind === "task" ? (
                <>
                  <Field label={t`Name`} required>
                    <input
                      value={taskTitle}
                      onChange={(event) => setTaskTitle(event.target.value)}
                      maxLength={80}
                      className="w-full rounded-md border border-white/10 bg-[#020818]/90 px-2 py-1.5 text-xs text-neutral-100 outline-none focus:border-cyan-400"
                    />
                  </Field>
                  <Field label={t`Requirement`}>
                    <textarea
                      value={requirement}
                      onChange={(event) => setRequirement(event.target.value)}
                      rows={3}
                      placeholder={t`What should the agent do?`}
                      className="w-full resize-none rounded-md border border-white/10 bg-[#020818]/90 px-2 py-1.5 text-xs text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-cyan-400"
                    />
                  </Field>
                  <Field label={t`Type`} required>
                    <SegmentedControl
                      value={taskMode}
                      options={[
                        { key: "chat", label: t`Chat` },
                        { key: "acp", label: t`Code` },
                      ]}
                      onChange={changeTaskMode}
                    />
                  </Field>
                  <Field label={t`Agent`} required>
                    <Select
                      value={agentAlias}
                      options={agentOptions}
                      onValueChange={setAgentAlias}
                      className="w-full"
                    />
                  </Field>
                  <Field label={t`Context`}>
                    <div className="flex gap-2">
                      <Select
                        value={workspaceRoot ?? GENERAL_WORKSPACE}
                        options={workspaceOptions}
                        onValueChange={(value) =>
                          setWorkspaceRoot(value === GENERAL_WORKSPACE ? null : value)
                        }
                        className="min-w-0 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => void chooseWorkspace()}
                        className="rounded-md border border-white/10 px-2 py-1.5 text-xs text-neutral-300 hover:border-cyan-400 hover:text-cyan-300"
                      >
                        {t`Choose...`}
                      </button>
                    </div>
                    {taskMode === "acp" && !workspaceRoot && (
                      <p className="mt-1 text-[11px] text-amber-200">
                        {t`Code tasks work best with a project workspace.`}
                      </p>
                    )}
                  </Field>
                  <SubmitRow
                    busy={busy}
                    disabled={taskDisabled}
                    error={error}
                    label={t`Create task`}
                    onCancel={close}
                    onSubmit={() => void submitTask()}
                  />
                </>
              ) : (
                <>
                  <Field label={t`Name`} required>
                    <input
                      value={automationName}
                      onChange={(event) => setAutomationName(event.target.value)}
                      maxLength={80}
                      className="w-full rounded-md border border-white/10 bg-[#020818]/90 px-2 py-1.5 text-xs text-neutral-100 outline-none focus:border-cyan-400"
                    />
                  </Field>
                  <Field label={t`Requirement`} required>
                    <textarea
                      value={requirement}
                      onChange={(event) => setRequirement(event.target.value)}
                      rows={3}
                      placeholder={t`What should run every day?`}
                      className="w-full resize-none rounded-md border border-white/10 bg-[#020818]/90 px-2 py-1.5 text-xs text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-cyan-400"
                    />
                  </Field>
                  <Field label={t`Agent`} required>
                    <Select
                      value={agentAlias}
                      options={agentOptions}
                      onValueChange={setAgentAlias}
                      className="w-full"
                    />
                  </Field>
                  <Field label={t`Execution time`} required>
                    <div className="grid grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)] gap-2">
                      <div className="rounded-md border border-white/10 bg-[#020818]/90 px-2 py-1.5 text-xs text-neutral-400">
                        {t`Daily`}
                      </div>
                      <Select
                        value={timeHour(time)}
                        options={hourOptions}
                        onValueChange={(value) => changeTimePart("hour", value)}
                        className="w-full"
                      />
                      <Select
                        value={timeMinute(time)}
                        options={minuteOptions}
                        onValueChange={(value) => changeTimePart("minute", value)}
                        className="w-full"
                      />
                    </div>
                  </Field>
                  <SubmitRow
                    busy={busy}
                    disabled={automationDisabled}
                    error={error}
                    label={t`Create automation`}
                    onCancel={close}
                    onSubmit={() => void submitAutomation()}
                  />
                </>
              )}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function KindPicker({ onKind }: { onKind: (kind: CreateKind) => void }) {
  const { t } = useLingui();
  return (
    <div className="grid gap-2">
      <KindButton
        icon={<Sparkles size={15} />}
        title={t`Task`}
        body={t`Manual agent work you start now.`}
        onClick={() => onKind("task")}
      />
      <KindButton
        icon={<CalendarClock size={15} />}
        title={t`Automation`}
        body={t`Scheduled work that repeats daily.`}
        onClick={() => onKind("automation")}
      />
    </div>
  );
}

function KindButton({
  icon,
  title,
  body,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left hover:border-cyan-400/40 hover:bg-cyan-400/10"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-neutral-100">{title}</span>
        <span className="mt-1 block text-[11px] leading-relaxed text-neutral-500">{body}</span>
      </span>
    </button>
  );
}

function NoAgentState({
  onAgentSetup,
  onSetupCenter,
}: {
  onAgentSetup: () => void;
  onSetupCenter: () => void;
}) {
  const { t } = useLingui();
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.025] p-4 text-center">
      <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
        <Bot size={16} />
      </div>
      <h3 className="text-sm font-semibold text-neutral-100">{t`No agent configured`}</h3>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
        {t`Set up an agent before creating task work.`}
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <button
          type="button"
          onClick={onAgentSetup}
          className="rounded-md bg-sky-400 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-cyan-300"
        >
          {t`Set up agent`}
        </button>
        <button
          type="button"
          onClick={onSetupCenter}
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:border-cyan-400 hover:text-cyan-300"
        >
          {t`Open Setup Center`}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-neutral-400">
        {label}
        {required && <span className="ml-1 text-red-300">*</span>}
      </span>
      {children}
    </label>
  );
}

function SubmitRow({
  busy,
  disabled,
  error,
  label,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  disabled: boolean;
  error: string | null;
  label: string;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const { t } = useLingui();
  return (
    <>
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-200">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:border-white/20 hover:text-neutral-100 disabled:opacity-50"
        >
          {t`Cancel`}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-md bg-sky-400 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && <Loader2 size={13} className="animate-spin" />}
          {label}
        </button>
      </div>
    </>
  );
}

function workspaceLabel(path: string, currentRoot: string | null) {
  if (path === currentRoot) return `Current: ${filenameFromPath(path)}`;
  return filenameFromPath(path);
}

function filenameFromPath(path: string) {
  return path.split(/[\\/]/).filter(Boolean).pop() || path;
}

function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function timeHour(value: string) {
  return validTime(value) ? value.slice(0, 2) : "00";
}

function timeMinute(value: string) {
  return validTime(value) ? value.slice(3, 5) : "00";
}

function dailyCron(value: string) {
  const [hour, minute] = value.split(":").map((part) => Number(part));
  return `${minute} ${hour} * * *`;
}

function defaultTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 5);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(
    2,
    "0",
  )}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
