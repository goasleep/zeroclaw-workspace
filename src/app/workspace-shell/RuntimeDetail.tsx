import { Bug, Cpu, Gauge, HardDrive, Home, Settings, type LucideIcon } from "lucide-react";
import { Trans, useLingui } from "@lingui/react/macro";
import { useEffect, useState, type ReactNode } from "react";
import { apiCron, apiDoctor, apiStatus, apiTools } from "@/api/tools";
import { apiLogs } from "@/api/logs";
import { useConnections } from "@/app/connection-context";
import { LogsPanel } from "@/features/logs/LogsPanel";
import { DoctorPanel } from "@/features/doctor/DoctorPanel";
import { DevicesPanel } from "@/features/devices/DevicesPanel";
import { SettingsContent } from "./SettingsPage";
import { SETTINGS_SECTIONS } from "./settings-sections";
import { normalizeSettingsSection } from "./settings-routing";
import type { RuntimeTab, SettingsSection } from "./types";

const GATEWAY_CONFIG_GROUPS: Array<{
  label: "Gateway" | "Capabilities";
  sectionIds: SettingsSection[];
}> = [
  {
    label: "Gateway",
    sectionIds: [
      "setup-center",
      "gateway-overview",
      "models-providers",
      "agents",
      "runtime-safety",
      "channels",
    ],
  },
  {
    label: "Capabilities",
    sectionIds: ["memory", "tools-skills", "integrations"],
  },
];

export function RuntimeDetail({
  tab,
  onTab,
  onAutomations,
  settingsSection,
  configFocusSection,
  onSettingsSection,
  onConfigFocusSection,
  onBackToApp,
  agentWorkspaceFocusAlias,
}: {
  tab: RuntimeTab;
  onTab: (tab: RuntimeTab) => void;
  onAutomations: () => void;
  settingsSection: SettingsSection;
  configFocusSection: string | null;
  onSettingsSection: (section: SettingsSection) => void;
  onConfigFocusSection: (section: string | null) => void;
  onBackToApp: () => void;
  agentWorkspaceFocusAlias?: string | null;
}) {
  const { t } = useLingui();
  const { active, health, activation, retry } = useConnections();
  const activeId = active?.id ?? null;
  const effectiveSettingsSection = normalizeSettingsSection(settingsSection);
  const configSection =
    effectiveSettingsSection === "app" ? "gateway-overview" : effectiveSettingsSection;
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

  function openConfigSection(section: SettingsSection) {
    onConfigFocusSection(null);
    onSettingsSection(normalizeSettingsSection(section));
    onTab("config");
  }

  function configGroupLabel(label: "Gateway" | "Capabilities") {
    return label === "Gateway" ? t`Gateway` : t`Capabilities`;
  }

  return (
    <section className="grid h-full min-h-0 grid-cols-[280px_minmax(0,1fr)] overflow-hidden bg-[#020818]/70">
      <aside className="flex min-h-0 flex-col border-r border-white/10 bg-[#020818]/90">
        <header className="shrink-0 border-b border-white/10 p-3">
          <button
            type="button"
            onClick={onBackToApp}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-neutral-400 transition hover:bg-white/[0.05] hover:text-neutral-100"
          >
            <Home size={14} />
            <span className="min-w-0 flex-1 truncate">
              <Trans>Back to app</Trans>
            </span>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 zc-scrollbar">
          <h1 className="mb-3 px-1 text-sm font-semibold text-neutral-100">{t`Runtime`}</h1>
          <NavGroup label={t`Runtime`}>
            <TabButton
              active={tab === "overview"}
              icon={Gauge}
              label={t`Overview`}
              onClick={() => onTab("overview")}
            />
            <TabButton
              active={tab === "logs"}
              icon={HardDrive}
              label={t`Logs`}
              onClick={() => onTab("logs")}
            />
            <TabButton
              active={tab === "doctor"}
              icon={Bug}
              label={t`Doctor`}
              onClick={() => onTab("doctor")}
            />
            <TabButton
              active={tab === "devices"}
              icon={Cpu}
              label={t`Devices`}
              onClick={() => onTab("devices")}
            />
          </NavGroup>

          {GATEWAY_CONFIG_GROUPS.map((group) => (
            <NavGroup key={group.label} label={configGroupLabel(group.label)}>
              {group.sectionIds.map((sectionId) => {
                const section = SETTINGS_SECTIONS.find((item) => item.id === sectionId);
                if (!section) return null;
                return (
                  <TabButton
                    key={section.id}
                    active={tab === "config" && configSection === section.id}
                    icon={section.icon}
                    label={t(section.label)}
                    onClick={() => openConfigSection(section.id)}
                  />
                );
              })}
            </NavGroup>
          ))}
        </div>
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
                  {t`Status and diagnostics for the selected runtime.`}
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
                <Metric label={t`Runtime version`} value={summary.version || t`Unknown`} />
                <Metric label={t`Tools available`} value={String(summary.tools)} />
                <Metric
                  label={t`Active automations`}
                  value={String(summary.cron)}
                  onClick={onAutomations}
                />
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
                    onClick={() => openConfigSection("gateway-overview")}
                    className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:border-cyan-400 hover:text-cyan-300"
                  >
                    <Settings size={12} className="mr-1.5 inline" />
                    {t`Open gateway config`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === "logs" && <LogsPanel />}
        {tab === "doctor" && <DoctorPanel />}
        {tab === "devices" && <DevicesPanel />}
        {tab === "config" && (
          <SettingsContent
            section={configSection}
            configFocusSection={configFocusSection}
            onSection={onSettingsSection}
            onConfigFocusSection={onConfigFocusSection}
            agentWorkspaceFocusAlias={agentWorkspaceFocusAlias}
          />
        )}
      </main>
    </section>
  );
}

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 px-1 text-[10px] uppercase tracking-wide text-neutral-500">{label}</h2>
      <div className="space-y-1">{children}</div>
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
  icon: LucideIcon;
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

function Metric({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  const className =
    "rounded-lg border border-white/10 bg-white/[0.035] p-4 text-left" +
    (onClick ? " transition hover:border-cyan-400/40 hover:bg-white/[0.055]" : "");
  const content = (
    <>
      <div className="mb-2 text-xs text-neutral-500">{label}</div>
      <div className="truncate text-xl font-semibold text-neutral-100">{value}</div>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}
