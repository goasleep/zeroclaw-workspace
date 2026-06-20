// Workspace shell — page-level state, deep links, and native menu commands.

import { useCallback, useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useWorkspace } from "@/app/workspace-context";
import { useConnections } from "@/app/connection-context";
import { isLocalWorkspaceConnection, validateWorkspaceRoot } from "@/api/workspace";
import { apiQuickstartState } from "@/api/quickstart";
import { ChatWorkspace } from "./workspace-shell/ChatWorkspace";
import { WorkspaceSidebar } from "./workspace-shell/WorkspaceSidebar";
import { SettingsPage } from "./workspace-shell/SettingsPage";
import { settingsSectionForConfigTarget } from "./workspace-shell/settings-routing";
import { isSettingsSection } from "./workspace-shell/settings-sections";
import { useThreads } from "./workspace-shell/use-threads";
import { useWorkspaceCommands } from "./workspace-shell/use-workspace-commands";
import type { SettingsSection, WorkspacePage } from "./workspace-shell/types";
import type { NormalizedSession } from "@/features/chat/use-chat";

export function WorkspaceShell() {
  const { root, addFiles, setRoot, connectionId } = useWorkspace();
  const { active } = useConnections();
  const [page, setPage] = useState<WorkspacePage>("chat");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("app");
  const [configFocusSection, setConfigFocusSection] = useState<string | null>(null);
  const [agentWorkspaceFocusAlias, setAgentWorkspaceFocusAlias] = useState<string | null>(null);
  const [agents, setAgents] = useState<string[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [chatScopeRoot, setChatScopeRoot] = useState<string | null | undefined>(undefined);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const threads = useThreads();
  const activeChatWorkspaceRoot = chatScopeRoot === undefined ? root : chatScopeRoot;

  const loadAgents = useCallback(() => {
    if (!connectionId) {
      setAgents([]);
      setActiveAgent(null);
      return;
    }
    void apiQuickstartState()
      .then((s) => {
        const aliases = s.agents ?? [];
        setAgents(aliases);
        setActiveAgent((current) =>
          current && aliases.includes(current) ? current : (aliases[0] ?? null),
        );
      })
      .catch(() => {
        setAgents([]);
        setActiveAgent(null);
      });
  }, [connectionId]);

  const focusComposer = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("zeroclaw://quick-invoke"));
    });
  }, []);

  const pickProject = useCallback(async () => {
    if (active && !isLocalWorkspaceConnection(active)) {
      const chosen = window.prompt("Remote working directory", root ?? "");
      if (typeof chosen === "string" && chosen.trim()) {
        const canonical = await validateWorkspaceRoot(active, chosen.trim());
        await setRoot(canonical);
        setChatScopeRoot(canonical);
        setActiveThreadId(null);
      }
      return;
    }
    const chosen = await openDialog({ directory: true, multiple: false });
    if (typeof chosen === "string") {
      await setRoot(chosen);
      setChatScopeRoot(chosen);
      setActiveThreadId(null);
    }
  }, [active, root, setRoot]);

  const openProjectRoot = useCallback(
    async (path: string) => {
      await setRoot(path);
      setChatScopeRoot(path);
      setActiveThreadId(null);
      setPage("chat");
      focusComposer();
    },
    [focusComposer, setRoot],
  );

  const openSettings = useCallback((section: string) => {
    setSettingsSection(isSettingsSection(section) ? section : "app");
    setConfigFocusSection(null);
    setAgentWorkspaceFocusAlias(null);
    setPage("settings");
  }, []);

  const openConfigTarget = useCallback((target: string) => {
    const clean = target.trim();
    if (!clean) return;
    setConfigFocusSection(clean);
    setAgentWorkspaceFocusAlias(null);
    setSettingsSection(settingsSectionForConfigTarget(clean));
    setPage("settings");
  }, []);

  const openAgentWorkspace = useCallback((alias: string) => {
    const clean = alias.trim();
    setConfigFocusSection(null);
    setAgentWorkspaceFocusAlias(clean || null);
    if (clean) setActiveAgent(clean);
    setSettingsSection("agent-workspace");
    setPage("settings");
  }, []);

  const selectAgent = useCallback(
    (agent: string) => {
      setActiveAgent(agent);
      setAgentWorkspaceFocusAlias(null);
      setActiveThreadId(null);
      setPendingSessionId(null);
      setPage("chat");
      focusComposer();
    },
    [focusComposer],
  );

  const openThread = useCallback(
    async (thread: NormalizedSession, workspaceRoot: string | null) => {
      const agent = thread.agent_alias || activeAgent || agents[0];
      if (agent) setActiveAgent(agent);
      if (workspaceRoot) {
        await setRoot(workspaceRoot);
      }
      setChatScopeRoot(workspaceRoot);
      setActiveThreadId(thread.session_id);
      setPendingSessionId(thread.session_id);
      setPage("chat");
    },
    [activeAgent, agents, setRoot],
  );

  const newThread = useCallback(
    async (workspaceRoot: string | null) => {
      if (workspaceRoot) {
        await setRoot(workspaceRoot);
      }
      setChatScopeRoot(workspaceRoot);
      setActiveThreadId(null);
      setPage("chat");
      window.requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent("zeroclaw://new-session"));
        focusComposer();
      });
    },
    [focusComposer, setRoot],
  );

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    setChatScopeRoot(undefined);
    setActiveThreadId(null);
    setPendingSessionId(null);
  }, [connectionId]);

  useEffect(() => {
    if (!pendingSessionId || page !== "chat") return;
    const sessionId = pendingSessionId;
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("zeroclaw://select-session", { detail: sessionId }));
      focusComposer();
    });
    setPendingSessionId(null);
  }, [activeAgent, focusComposer, page, pendingSessionId]);

  useWorkspaceCommands({
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
  });

  return (
    <div className="h-full min-h-0 overflow-hidden text-slate-100">
      {page === "chat" || page === "code" ? (
        <div className="grid h-full min-h-0 grid-cols-[280px_minmax(420px,1fr)] overflow-hidden">
          <WorkspaceSidebar
            page={page}
            threads={threads.threads}
            workspaceMap={threads.workspaceMap}
            activeThreadId={activeThreadId}
            activeWorkspaceRoot={activeChatWorkspaceRoot}
            threadsLoading={threads.loading}
            threadError={threads.error}
            onPage={setPage}
            onProject={openProjectRoot}
            onThread={openThread}
            onNewThread={newThread}
            onRefreshThreads={() => void threads.refresh()}
            onRenameThread={(id, name) => void threads.rename(id, name)}
            onDeleteThread={(id) => void threads.remove(id)}
            onPickRoot={() => void pickProject()}
          />
          <ChatWorkspace
            key={connectionId ?? "no-connection"}
            connectionId={connectionId}
            mode={page === "code" ? "acp" : "chat"}
            workspaceRoot={activeChatWorkspaceRoot}
            onWorkspaceRoot={setChatScopeRoot}
            agents={agents}
            activeAgent={activeAgent}
            onAgentChange={selectAgent}
            onAgentCreated={loadAgents}
          />
        </div>
      ) : (
        <SettingsPage
          key={connectionId ?? "no-connection"}
          section={settingsSection}
          onSection={setSettingsSection}
          onBackToChat={() => setPage("chat")}
          configFocusSection={configFocusSection}
          onConfigFocusSection={setConfigFocusSection}
          agentWorkspaceFocusAlias={agentWorkspaceFocusAlias}
        />
      )}
    </div>
  );
}
