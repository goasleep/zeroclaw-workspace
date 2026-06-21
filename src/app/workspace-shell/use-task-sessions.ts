import { useCallback, useEffect, useMemo, useState } from "react";
import { apiSessionDelete, apiSessionRename, apiSessions } from "@/api/sessions";
import {
  isVisibleSession,
  normalizeSession,
  sessionSort,
  type NormalizedSession,
} from "@/features/chat/use-chat";
import { loadSessionWorkspaceMap } from "@/features/chat/chat-local-state";
import { useConnections } from "../connection-context";

export function useTaskSessions() {
  const { active } = useConnections();
  const connectionId = active?.id ?? null;
  const [sessions, setSessions] = useState<NormalizedSession[]>([]);
  const [workspaceMap, setWorkspaceMap] = useState<Map<string, string>>(() => new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!connectionId) {
      setSessions([]);
      setWorkspaceMap(new Map());
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [data, workspaceMap] = await Promise.all([
        apiSessions(),
        loadSessionWorkspaceMap(connectionId),
      ]);
      setWorkspaceMap(workspaceMap);
      setSessions(
        data.sessions
          .map(normalizeSession)
          .filter((session): session is NormalizedSession => session !== null)
          .filter(isVisibleSession)
          .sort(sessionSort),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onRefresh() {
      void refresh();
    }

    window.addEventListener("zeroclaw://chat-done", onRefresh);
    window.addEventListener("zeroclaw://refresh-sessions", onRefresh);
    return () => {
      window.removeEventListener("zeroclaw://chat-done", onRefresh);
      window.removeEventListener("zeroclaw://refresh-sessions", onRefresh);
    };
  }, [refresh]);

  const rename = useCallback(
    async (sessionId: string, name: string) => {
      await apiSessionRename(sessionId, name);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (sessionId: string) => {
      await apiSessionDelete(sessionId);
      await refresh();
    },
    [refresh],
  );

  return useMemo(
    () => ({ sessions, workspaceMap, loading, error, refresh, rename, remove }),
    [sessions, workspaceMap, loading, error, refresh, rename, remove],
  );
}
