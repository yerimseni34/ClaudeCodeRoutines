import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { CloudConfig } from "../lib/types";

// Bulut yapılandırması cihazda (localStorage) saklanır; uygulama kodu sabit anahtar içermez.
const CFG_KEY = "fitlog.cloud";

export function getCloudConfig(): CloudConfig | null {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    return raw ? (JSON.parse(raw) as CloudConfig) : null;
  } catch {
    return null;
  }
}

export function setCloudConfig(cfg: CloudConfig | null) {
  if (cfg) localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  else localStorage.removeItem(CFG_KEY);
  _client = null; // istemciyi sıfırla
}

let _client: SupabaseClient | null = null;

export function getClient(): SupabaseClient | null {
  if (_client) return _client;
  const cfg = getCloudConfig();
  if (!cfg?.url || !cfg?.anonKey) return null;
  _client = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "fitlog.auth" },
  });
  return _client;
}

export async function getUser(): Promise<User | null> {
  const c = getClient();
  if (!c) return null;
  const { data } = await c.auth.getUser();
  return data.user ?? null;
}

export async function signIn(email: string, password: string) {
  const c = getClient();
  if (!c) throw new Error("Önce bulut adresi ve anahtarını girin.");
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string) {
  const c = getClient();
  if (!c) throw new Error("Önce bulut adresi ve anahtarını girin.");
  const { error } = await c.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const c = getClient();
  if (c) await c.auth.signOut();
}
