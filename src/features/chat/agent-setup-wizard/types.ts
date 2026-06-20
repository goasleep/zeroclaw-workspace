export type WizardStatus = "loading" | "form" | "validating" | "applying" | "done" | "error";
export type StepId =
  | "provider"
  | "risk"
  | "runtime"
  | "memory"
  | "channels"
  | "agent"
  | "peer_groups";
export type ChoiceMode = "fresh" | "existing";
export type PersonalityMode = "template" | "scratch" | "skip";

export interface AgentSetupWizardProps {
  onAgentCreated?: () => void;
  onCancel?: () => void;
  surface?: "chat" | "config";
}

export interface ChannelDraft {
  id: string;
  mode: ChoiceMode;
  existingRef: string;
  channel_type: string;
  alias: string;
  token: string;
}

export interface PeerDraft {
  id: string;
  name: string;
  channel: string;
  external_peers: string;
  ignore: string;
}

export interface PersonalityDraft {
  mode: PersonalityMode;
  content: string;
}

export const REQUIRED_STEPS: StepId[] = [
  "provider",
  "risk",
  "runtime",
  "memory",
  "channels",
  "agent",
];
export const ALL_STEPS: StepId[] = [...REQUIRED_STEPS, "peer_groups"];
