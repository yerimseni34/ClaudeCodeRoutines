import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { runSync, pendingCount, type SyncStatus } from "../sync/sync";
import { getCloudConfig } from "../sync/supabase";

interface SyncCtx {
  status: SyncStatus;
  lastResult?: { pushed: number; pulled: number; error?: string; at: number };
  pending: number;
  online: boolean;
  cloudEnabled: boolean;
  sync: () => void;
  refreshPending: () => void;
}

const Ctx = createContext<SyncCtx>(null as any);
export const useSync = () => useContext(Ctx);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastResult, setLastResult] = useState<SyncCtx["lastResult"]>();
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [cloudEnabled, setCloudEnabled] = useState(!!getCloudConfig());
  const busy = useRef(false);

  const refreshPending = useCallback(() => {
    pendingCount().then(setPending).catch(() => {});
  }, []);

  const sync = useCallback(async () => {
    setCloudEnabled(!!getCloudConfig());
    if (busy.current) return;
    busy.current = true;
    setStatus("syncing");
    const res = await runSync();
    setStatus(res.status);
    if (res.status === "ok") {
      setLastResult({ pushed: res.pushed, pulled: res.pulled, at: Date.now() });
    } else if (res.status === "error") {
      setLastResult({ pushed: 0, pulled: 0, error: res.error, at: Date.now() });
    }
    refreshPending();
    busy.current = false;
  }, [refreshPending]);

  useEffect(() => {
    refreshPending();
    sync();
    const onOnline = () => { setOnline(true); sync(); };
    const onOffline = () => { setOnline(false); setStatus("offline"); };
    const onFocus = () => sync();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("focus", onFocus);
    // Bekleyen değişiklik olursa periyodik dene (30 sn).
    const iv = setInterval(() => { if (navigator.onLine) sync(); }, 30000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("focus", onFocus);
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Ctx.Provider value={{ status, lastResult, pending, online, cloudEnabled, sync, refreshPending }}>
      {children}
    </Ctx.Provider>
  );
}
