// Welcome screen shown when there are no connections yet.
//
// First-run screen shown when there are no runtimes yet.
//
// The default path is usage-led: start locally, then open a project and chat.
// Remote and existing local runtime paths remain available for users who
// already know where their work should run.

import { Cable, Cloud, HardDrive, Sparkles } from "lucide-react";
import { Trans, useLingui } from "@lingui/react/macro";

interface Props {
  onChoose: (path: "remote" | "local-attach" | "local-install") => void;
}

const cards = [
  {
    id: "local-install" as const,
    icon: Sparkles,
  },
  {
    id: "local-attach" as const,
    icon: HardDrive,
  },
  {
    id: "remote" as const,
    icon: Cloud,
  },
];

export function WelcomeScreen({ onChoose }: Props) {
  const { t } = useLingui();
  const copy = {
    remote: {
      title: t`Connect another machine`,
      body: t`Use a homelab, cloud VM, workstation, or Raspberry Pi through a direct URL or SSH tunnel.`,
      cta: t`Connect remote`,
    },
    "local-attach": {
      title: t`Use existing local runtime`,
      body: t`Attach to a ZeroClaw runtime you already installed or started on this machine.`,
      cta: t`Use existing`,
    },
    "local-install": {
      title: t`Start locally`,
      body: t`Begin on this computer, then open a project and start a chat. ZeroClaw Studio will manage the local runtime for you.`,
      cta: t`Start local`,
    },
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-8 py-12 text-slate-100">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="zc-glow-border rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-300">
          <Cable size={28} />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          <Trans>Welcome to ZeroClaw Studio</Trans>
        </h1>
        <p className="max-w-lg text-sm text-slate-400">
          <Trans>
            Start with a local runtime for the shortest path to work, or connect a runtime you
            already manage.
          </Trans>
        </p>
      </div>

      <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        {cards.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChoose(id)}
            className="zc-panel group flex flex-col gap-3 rounded-2xl p-5 text-left transition hover:border-cyan-400/50 hover:bg-white/[0.07]"
          >
            <div className="rounded-lg bg-white/[0.08] p-2 text-cyan-300 group-hover:bg-cyan-400/10">
              <Icon size={20} />
            </div>
            <h2 className="text-base font-medium text-slate-100">{copy[id].title}</h2>
            <p className="text-xs leading-relaxed text-slate-400">{copy[id].body}</p>
            <span className="mt-auto text-xs font-medium uppercase tracking-wide text-cyan-300 opacity-0 group-hover:opacity-100">
              {copy[id].cta} →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
