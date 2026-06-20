import { useEffect, type Dispatch, type SetStateAction } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  APP_COMMAND_EVENT,
  APP_COMMANDS,
  SETTINGS_COMMAND_SECTIONS,
  appCommandFromEvent,
  appCommandFromPayload,
  type AppCommandId,
} from "@/app/commands/commands";
import type { WorkspacePage } from "./types";

interface WorkspaceCommandHandlers {
  activeChatWorkspaceRoot: string | null;
  addFiles: (paths: string[]) => void;
  focusComposer: () => void;
  newThread: (workspaceRoot: string | null) => Promise<void>;
  openAgentWorkspace: (alias: string) => void;
  openConfigTarget: (target: string) => void;
  openSettings: (section: string) => void;
  pickProject: () => Promise<void>;
  selectAgent: (agent: string) => void;
  setActiveAgent: Dispatch<SetStateAction<string | null>>;
  setActiveThreadId: Dispatch<SetStateAction<string | null>>;
  setPage: Dispatch<SetStateAction<WorkspacePage>>;
  setPendingSessionId: Dispatch<SetStateAction<string | null>>;
}

export function useWorkspaceCommands({
  activeChatWorkspaceRoot,
  addFiles,
  focusComposer,
  newThread,
  openAgentWorkspace,
  openConfigTarget,
  openSettings,
  pickProject,
  selectAgent,
  setActiveAgent,
  setActiveThreadId,
  setPage,
  setPendingSessionId,
}: WorkspaceCommandHandlers) {
  useEffect(() => {
    let disposed = false;
    let unlistenCommand: (() => void) | undefined;

    function runCommand(command: AppCommandId) {
      const settingsTarget = SETTINGS_COMMAND_SECTIONS[command];
      if (settingsTarget) {
        openSettings(settingsTarget);
        return;
      }

      switch (command) {
        case APP_COMMANDS.workspaceFocusChat.id:
          setPage("chat");
          focusComposer();
          break;
        case APP_COMMANDS.workspaceFocusCode.id:
          setPage("code");
          focusComposer();
          break;
        case APP_COMMANDS.workspaceOpenProject.id:
          void pickProject();
          break;
        case APP_COMMANDS.workspaceNewChat.id:
          void newThread(activeChatWorkspaceRoot);
          break;
        case APP_COMMANDS.workspaceRefreshChats.id:
          window.dispatchEvent(new CustomEvent("zeroclaw://refresh-sessions"));
          break;
        case APP_COMMANDS.workspaceRetryConnection.id:
          break;
      }
    }

    function onCommand(e: Event) {
      const command = appCommandFromEvent(e);
      if (command) runCommand(command);
    }

    function onOpenSettings(e: Event) {
      openSettings((e as CustomEvent<string>).detail);
    }

    function onOpenConfigTarget(e: Event) {
      const target = String((e as CustomEvent<string>).detail ?? "");
      openConfigTarget(target);
    }

    function onOpenAgentConfig(e: Event) {
      const alias = String((e as CustomEvent<string>).detail ?? "").trim();
      if (alias) openConfigTarget(`agents.${alias}`);
    }

    function onOpenAgentWorkspace(e: Event) {
      const alias = String((e as CustomEvent<string>).detail ?? "");
      openAgentWorkspace(alias);
    }

    function onSelectAgent(e: Event) {
      const alias = String((e as CustomEvent<string>).detail ?? "").trim();
      if (alias) selectAgent(alias);
    }

    function onDeepLink(e: Event) {
      const url = (e as CustomEvent<URL>).detail;
      const arg = firstPathArg(url);
      if (url.host === "agent" && arg) {
        setActiveAgent(arg);
        setPage("chat");
        focusComposer();
        return;
      }
      if (url.host === "session" && arg) {
        setActiveThreadId(arg);
        setPendingSessionId(arg);
        setPage("chat");
        focusComposer();
        return;
      }
      if (url.host === "file") {
        const path = decodeURIComponent(url.pathname || "");
        if (path) {
          addFiles([path]);
          setPage("chat");
          focusComposer();
        }
      }
    }

    function onOpenProject() {
      runCommand(APP_COMMANDS.workspaceOpenProject.id);
    }

    function onFocusChat() {
      runCommand(APP_COMMANDS.workspaceFocusChat.id);
    }

    function onFocusCode() {
      runCommand(APP_COMMANDS.workspaceFocusCode.id);
    }

    void listen(APP_COMMAND_EVENT, (event) => {
      const command = appCommandFromPayload(event.payload);
      if (command) runCommand(command);
    }).then((unlisten) => {
      if (disposed) {
        unlisten();
      } else {
        unlistenCommand = unlisten;
      }
    });
    window.addEventListener(APP_COMMAND_EVENT, onCommand);
    window.addEventListener("zeroclaw://open-settings", onOpenSettings);
    window.addEventListener("zeroclaw://open-config-target", onOpenConfigTarget);
    window.addEventListener("zeroclaw://open-agent-config", onOpenAgentConfig);
    window.addEventListener("zeroclaw://open-agent-workspace", onOpenAgentWorkspace);
    window.addEventListener("zeroclaw://select-agent", onSelectAgent);
    window.addEventListener("zeroclaw://deep-link", onDeepLink);
    window.addEventListener("zeroclaw://open-project", onOpenProject);
    window.addEventListener("zeroclaw://focus-chat", onFocusChat);
    window.addEventListener("zeroclaw://focus-code", onFocusCode);
    return () => {
      disposed = true;
      unlistenCommand?.();
      window.removeEventListener(APP_COMMAND_EVENT, onCommand);
      window.removeEventListener("zeroclaw://open-settings", onOpenSettings);
      window.removeEventListener("zeroclaw://open-config-target", onOpenConfigTarget);
      window.removeEventListener("zeroclaw://open-agent-config", onOpenAgentConfig);
      window.removeEventListener("zeroclaw://open-agent-workspace", onOpenAgentWorkspace);
      window.removeEventListener("zeroclaw://select-agent", onSelectAgent);
      window.removeEventListener("zeroclaw://deep-link", onDeepLink);
      window.removeEventListener("zeroclaw://open-project", onOpenProject);
      window.removeEventListener("zeroclaw://focus-chat", onFocusChat);
      window.removeEventListener("zeroclaw://focus-code", onFocusCode);
    };
  }, [
    activeChatWorkspaceRoot,
    addFiles,
    focusComposer,
    newThread,
    openAgentWorkspace,
    openConfigTarget,
    openSettings,
    pickProject,
    selectAgent,
    setActiveAgent,
    setActiveThreadId,
    setPage,
    setPendingSessionId,
  ]);
}

function firstPathArg(url: URL) {
  return decodeURIComponent(url.pathname.replace(/^\/+/, "")).trim();
}
