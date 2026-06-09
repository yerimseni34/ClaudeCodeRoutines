import { db, SYNC_TABLES, type SyncTableName } from "../db/db";
import { getClient, getUser } from "./supabase";

// Bulut tarafında tek bir genel tablo kullanılır: fitlog_records
//   (user_id uuid, kind text, id text, updated_at bigint, deleted int, data jsonb)
//   PK: (user_id, kind, id) — kurulum SQL'i README/Ayarlar ekranında.

const TABLE = "fitlog_records";
const LAST_PULL_KEY = "fitlog.lastPull";

function lastPull(): number {
  return Number(localStorage.getItem(LAST_PULL_KEY) || "0");
}
function setLastPull(v: number) {
  localStorage.setItem(LAST_PULL_KEY, String(v));
}

function tableOf(kind: SyncTableName) {
  return (db as any)[kind] as import("dexie").Table<any, string>;
}

export type SyncStatus = "idle" | "syncing" | "ok" | "offline" | "no-cloud" | "no-auth" | "error";

let syncing = false;

export async function runSync(): Promise<{ status: SyncStatus; pushed: number; pulled: number; error?: string }> {
  if (syncing) return { status: "syncing", pushed: 0, pulled: 0 };
  const client = getClient();
  if (!client) return { status: "no-cloud", pushed: 0, pulled: 0 };
  if (!navigator.onLine) return { status: "offline", pushed: 0, pulled: 0 };

  const user = await getUser();
  if (!user) return { status: "no-auth", pushed: 0, pulled: 0 };

  syncing = true;
  try {
    let pushed = 0;
    // 1) PUSH — yereldeki kirli (senkronlanmamış) kayıtları buluta yükle.
    for (const kind of SYNC_TABLES) {
      const table = tableOf(kind);
      const dirty = await table.where("_dirty").equals(1).toArray();
      if (dirty.length === 0) continue;
      const rows = dirty.map((rec) => {
        const data = { ...rec };
        delete (data as any)._dirty;
        return {
          user_id: user.id,
          kind,
          id: rec.id,
          updated_at: rec.updatedAt,
          deleted: rec.deleted ? 1 : 0,
          data,
        };
      });
      const { error } = await client.from(TABLE).upsert(rows, { onConflict: "user_id,kind,id" });
      if (error) throw error;
      // Başarılı yükleme sonrası kirli bayrağını temizle.
      await db.transaction("rw", table, async () => {
        for (const rec of dirty) {
          const fresh = await table.get(rec.id);
          if (fresh && fresh.updatedAt === rec.updatedAt) {
            fresh._dirty = 0;
            await table.put(fresh);
          }
        }
      });
      pushed += rows.length;
    }

    // 2) PULL — bulutta lastPull'dan sonra güncellenenleri çek (last-write-wins).
    let pulled = 0;
    const since = lastPull();
    let maxSeen = since;
    const pageSize = 500;
    let from = 0;
    while (true) {
      const { data, error } = await client
        .from(TABLE)
        .select("kind,id,updated_at,deleted,data")
        .eq("user_id", user.id)
        .gt("updated_at", since)
        .order("updated_at", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const row of data as any[]) {
        const kind = row.kind as SyncTableName;
        if (!SYNC_TABLES.includes(kind)) continue;
        const table = tableOf(kind);
        const local = await table.get(row.id);
        // Yerel sürüm daha yeniyse dokunma.
        if (local && local.updatedAt > row.updated_at) continue;
        const rec = { ...row.data, updatedAt: row.updated_at, deleted: row.deleted, _dirty: 0 };
        await table.put(rec);
        pulled++;
        if (row.updated_at > maxSeen) maxSeen = row.updated_at;
      }
      if (data.length < pageSize) break;
      from += pageSize;
    }
    if (maxSeen > since) setLastPull(maxSeen);

    return { status: "ok", pushed, pulled };
  } catch (e: any) {
    return { status: "error", pushed: 0, pulled: 0, error: e?.message || String(e) };
  } finally {
    syncing = false;
  }
}

export async function pendingCount(): Promise<number> {
  let n = 0;
  for (const kind of SYNC_TABLES) {
    n += await tableOf(kind).where("_dirty").equals(1).count();
  }
  return n;
}

// Tam yeniden çekme (örn. yeni cihazda) — lastPull sıfırlanır.
export function resetPullCursor() {
  localStorage.removeItem(LAST_PULL_KEY);
}
