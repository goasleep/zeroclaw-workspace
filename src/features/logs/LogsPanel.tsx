import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLingui } from "@lingui/react/macro";
import { Loader2, Pause, Play, RefreshCw } from "lucide-react";
import { queryKeys } from "@/api/query";
import { apiLogs, type LogEvent } from "@/api/logs";
import { appLogTail, type AppLogEntry } from "@/api/tauri";
import { useConnections } from "@/app/connection-context";

type LogSource = "all" | "gateway" | "backend";

interface DisplayLogEvent {
  id: string;
  source: Exclude<LogSource, "all">;
  timestamp: string;
  severityText: string;
  target?: string;
  message: string;
  order: number;
}

export function LogsPanel() {
  const { t } = useLingui();
  const { active } = useConnections();
  const [paused, setPaused] = useState(false);
  const [source, setSource] = useState<LogSource>("all");
  const gatewayLogsQuery = useQuery({
    queryKey: queryKeys.gateway.logs(active?.id ?? null, paused),
    queryFn: () => apiLogs(),
    refetchInterval: paused ? false : 3000,
  });
  const appLogsQuery = useQuery({
    queryKey: queryKeys.app.logs(paused),
    queryFn: () => appLogTail(200),
    refetchInterval: paused ? false : 3000,
  });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const events: DisplayLogEvent[] = useMemo(
    () => [
      ...toGatewayEvents(gatewayLogsQuery.data?.events ?? []),
      ...toBackendEvents(appLogsQuery.data?.entries ?? []),
    ],
    [appLogsQuery.data?.entries, gatewayLogsQuery.data?.events],
  );
  const visibleEvents = useMemo(
    () =>
      events
        .filter((event) => source === "all" || event.source === source)
        .sort((a, b) => eventTime(a) - eventTime(b) || a.order - b.order),
    [events, source],
  );

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    scrollEl.scrollTop = scrollEl.scrollHeight;
  }, [visibleEvents]);

  function refresh() {
    void gatewayLogsQuery.refetch();
    void appLogsQuery.refetch();
  }

  const isFetching = gatewayLogsQuery.isFetching || appLogsQuery.isFetching;
  const gatewayError = gatewayLogsQuery.isError ? String(gatewayLogsQuery.error) : null;
  const appError = appLogsQuery.isError ? String(appLogsQuery.error) : null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5 text-xs">
        <div className="flex rounded-md border border-white/10 bg-[#020818] p-0.5">
          {(
            [
              ["all", t`All`],
              ["gateway", t`Gateway`],
              ["backend", t`Backend`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSource(value)}
              className={`rounded px-2 py-0.5 text-[10px] uppercase ${
                source === value
                  ? "bg-cyan-400/15 text-cyan-200"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-neutral-400">{t`${visibleEvents.length} lines`}</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="flex items-center gap-1 rounded border border-white/15 px-2 py-0.5 text-[10px] text-neutral-300 hover:border-cyan-400"
        >
          {paused ? <Play size={10} /> : <Pause size={10} />}
          {paused ? t`Resume` : t`Pause`}
        </button>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-1 rounded border border-white/15 px-2 py-0.5 text-[10px] text-neutral-300 hover:border-cyan-400"
        >
          {isFetching ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
          {t`Refresh`}
        </button>
      </header>
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-[#020818]/90 px-3 py-2 font-mono text-[11px] zc-scrollbar"
      >
        {gatewayError && source !== "backend" && <p className="text-red-300">{gatewayError}</p>}
        {appError && source !== "gateway" && <p className="text-red-300">{appError}</p>}
        {!gatewayError && !appError && visibleEvents.length === 0 ? (
          <p className="text-neutral-500">{t`No log lines.`}</p>
        ) : (
          visibleEvents.map((event) => (
            <div key={event.id} className="leading-relaxed">
              <span
                className={`mr-1 rounded border px-1 py-px font-sans text-[9px] uppercase ${
                  event.source === "gateway"
                    ? "border-cyan-400/20 text-cyan-300"
                    : "border-violet-300/20 text-violet-300"
                }`}
              >
                {event.source}
              </span>
              <span className="text-neutral-600">{formatTimestamp(event.timestamp)}</span>{" "}
              <span
                className={
                  event.severityText === "ERROR"
                    ? "text-red-400"
                    : event.severityText === "WARN"
                      ? "text-amber-300"
                      : "text-neutral-500"
                }
              >
                [{event.severityText}]
              </span>{" "}
              {event.target && <span className="text-neutral-500">[{event.target}] </span>}
              <span className="text-neutral-300">{event.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function toGatewayEvents(events: LogEvent[]): DisplayLogEvent[] {
  return events.map((event, index) => ({
    id: `gateway-${event["@timestamp"]}-${index}-${event.message}`,
    source: "gateway",
    timestamp: event["@timestamp"],
    severityText: event.severity_text,
    message: event.message,
    order: index,
  }));
}

function toBackendEvents(events: AppLogEntry[]): DisplayLogEvent[] {
  return events.map((event, index) => ({
    id: `backend-${event.timestamp}-${index}-${event.message}`,
    source: "backend",
    timestamp: event.timestamp,
    severityText: event.severity_text,
    target: event.target,
    message: event.message,
    order: 10_000 + index,
  }));
}

function eventTime(event: DisplayLogEvent): number {
  const time = Date.parse(event.timestamp);
  return Number.isNaN(time) ? 0 : time;
}

function formatTimestamp(timestamp: string): string {
  return timestamp ? timestamp.replace("T", " ").slice(0, 19) : "unknown time";
}
