import { Activity, Bug, Cpu, Database, Gauge, HardDrive, Settings, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { useLingui } from "@lingui/react/macro";
import { apiCron, apiDoctor, apiStatus, apiTools } from "@/api/tools";
import { apiLogs } from "@/api/logs";
import { useConnections } from "@/app/connection-context";
import { ToolsPanel } from "@/features/tools/ToolsPanel";
import { MemoryPanel } from "@/features/memory/MemoryPanel";
import { LogsPanel } from "@/features/logs/LogsPanel";
import { DoctorPanel } from "@/features/doctor/DoctorPanel";
import { DevicesPanel } from "@/features/devices/DevicesPanel";
import { AutomationsPage } from "./AutomationsPage";

type RuntimeTab = "overview" | "tools" | "memory" | "automations" | "logs" | "doctor" | "devices";

export function RuntimeDetail({ onSettings }: { onSettings: () => void }) {
  const { t } = useLingui();
  const { active, health, activation, retry } = useConnections();
  const activeId = active?.id ?? null;
  const [tab, setTab] = useState<RuntimeTab>("overview");
  const [summary, setSummary] = useState({
    version: "",
    tools: 0,
    cron: 0,
    doctorIssues: 0,
    logErrors: 0,
  });

  useEffect(() => {
    if (!activeId) {
      setSummary({ version: "", tools: 0, cron: 0, doctorIssues: 0, logErrors: 0 });
      return;
    }
    let cancelled = false;
    void Promise.allSettled([apiStatus(), apiTools(), apiCron(), apiDoctor(), apiLogs()]).then(
      ([status, tools, cron, doctor, logs]) => {
        if (cancelled) return;
        setSummary({
          version: status.status === "fulfilled" ? status.value.version : "",
          tools: tools.status === "fulfilled" ? tools.value.tools.length : 0,
          cron:
            cron.status === "fulfilled"
              ? cron.value.jobs.filter((job) => job.enabled !== false).length
              : 0,
          doctorIssues:
            doctor.status === "fulfilled"
              ? doctor.value.results.filter((item) => item.severity !== "ok").length
              : 0,
          logErrors:
            logs.status === "fulfilled"
              ? logs.value.events.filter((event) => /error|warn/i.test(event.severity_text)).length
              : 0,
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  return (
    <section className="grid h-full min-h-0 grid-cols-[240px_minmax(0,1fr)] overflow-hidden bg-[#020818]/70">
      <aside className="min-h-0 overflow-y-auto border-r border-white/10 bg-[#020818]/90 p-3 zc-scrollbar">
        <h1 className="mb-3 px-1 text-sm font-semibold text-neutral-100">{t`Runtime`}</h1>
        <div className="space-y-1">
          <TabButton
            active={tab === "overview"}
            icon={Gauge}
            label={t`Overview`}
            onClick={() => setTab("overview")}
          />
          <TabButton
            active={tab === "tools"}
            icon={Wrench}
            label={t`Tools`}
            onClick={() => setTab("tools")}
          />
          <TabButton
            active={tab === "memory"}
            icon={Database}
            label={t`Memory`}
            onClick={() => setTab("memory")}
          />
          <TabButton
            active={tab === "automations"}
            icon={Activity}
            label={t`Automations`}
            onClick={() => setTab("automations")}
          />
          <TabButton
            active={tab === "logs"}
            icon={HardDrive}
            label={t`Logs`}
            onClick={() => setTab("logs")}
          />
          <TabButton
            active={tab === "doctor"}
            icon={Bug}
            label={t`Doctor`}
            onClick={() => setTab("doctor")}
          />
          <TabButton
            active={tab === "devices"}
            icon={Cpu}
            label={t`Devices`}
            onClick={() => setTab("devices")}
          />
        </div>
        <button
          type="button"
          onClick={onSettings}
          className="mt-4 flex w-full items-center gap-2 rounded-md border border-white/10 px-2 py-1.5 text-left text-xs text-neutral-300 hover:border-cyan-400 hover:text-cyan-300"
        >
          <Settings size={13} />
          {t`Advanced settings`}
        </button>
      </aside>
      <main className="min-h-0 min-w-0 overflow-hidden">
        {tab === "overview" && (
          <div className="h-full overflow-auto p-5 zc-scrollbar">
            <div className="mx-auto max-w-5xl">
              <header className="mb-4">
                <h2 className="text-lg font-semibold text-neutral-100">
                  {active?.name ?? t`No connection`}
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  {t`Runtime state comes from the selected ZeroClaw gateway.`}
                </p>
              </header>
              <div className="grid gap-3 md:grid-cols-3">
                <Metric
                  label={t`Health`}
                  value={
                    health
                      ? health.healthy
                        ? t`online`
                        : t`offline`
                      : (activation?.type ?? t`unknown`)
                  }
                />
                <Metric label={t`Gateway version`} value={summary.version || t`Unknown`} />
                <Metric label={t`Tools`} value={String(summary.tools)} />
                <Metric label={t`Active automations`} value={String(summary.cron)} />
                <Metric label={t`Doctor issues`} value={String(summary.doctorIssues)} />
                <Metric label={t`Recent log warnings`} value={String(summary.logErrors)} />
              </div>
              <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <h3 className="mb-3 text-sm font-semibold text-neutral-100">{t`Runtime actions`}</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void retry()}
                    className="rounded-md bg-sky-400 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-cyan-300"
                  >
                    {t`Retry activation`}
                  </button>
                  <button
                    type="button"
                    onClick={onSettings}
                    className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:border-cyan-400 hover:text-cyan-300"
                  >
                    {t`Open settings`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === "tools" && <ToolsPanel />}
        {tab === "memory" && <MemoryPanel />}
        {tab === "automations" && <AutomationsPage onRuntime={() => setTab("overview")} />}
        {tab === "logs" && <LogsPanel />}
        {tab === "doctor" && <DoctorPanel />}
        {tab === "devices" && <DevicesPanel />}
      </main>
    </section>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Gauge;
  label: string;
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
      <Icon size={13} />
      {label}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-2 text-xs text-neutral-500">{label}</div>
      <div className="truncate text-xl font-semibold text-neutral-100">{value}</div>
    </div>
  );
}
