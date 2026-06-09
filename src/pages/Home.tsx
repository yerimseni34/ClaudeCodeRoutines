import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { db, getSettings } from "../db/db";
import { todayKey, prettyDate } from "../lib/date";
import { sumDayMacros, workoutStats } from "../lib/calc";
import { TopBar, Bar } from "../components/ui";
import { useSync } from "../state/SyncProvider";

export default function Home() {
  const today = todayKey();
  const settings = useLiveQuery(() => getSettings(), []);
  const foods = useLiveQuery(() => db.foodLog.where("date").equals(today).filter((e) => !e.deleted).toArray(), [today]);
  const workouts = useLiveQuery(() => db.workouts.where("date").equals(today).filter((w) => !w.deleted).toArray(), [today]);
  const weights = useLiveQuery(() => db.bodyLog.filter((b) => !b.deleted).toArray(), []);
  const { status, pending, online, cloudEnabled } = useSync();

  if (!settings) return null;
  const m = sumDayMacros(foods || []);
  const remaining = settings.kcalGoal - m.kcal;
  const latestWeight = (weights || []).sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <>
      <TopBar
        title={`Merhaba, ${settings.name} 👋`}
        sub={prettyDate(today)}
        right={<Link to="/profile" className="iconbtn">⚙️</Link>}
      />
      <div className="page">
        <SyncLine status={status} pending={pending} online={online} cloudEnabled={cloudEnabled} />

        {/* Beslenme özeti */}
        <Link to="/nutrition" style={{ color: "inherit" }}>
          <div className="card">
            <div className="row between">
              <span className="section-title" style={{ margin: 0 }}>Bugünün Kalorisi</span>
              <span className="pill accent">Hedef {settings.kcalGoal}</span>
            </div>
            <div className="row between" style={{ alignItems: "flex-end", margin: "8px 0 14px" }}>
              <div>
                <div className="kcalbig">{m.kcal}</div>
                <div className="small muted">alınan kcal</div>
              </div>
              <div className="center">
                <div className="bold" style={{ fontSize: 22, color: remaining < 0 ? "var(--red)" : "var(--green)" }}>
                  {remaining < 0 ? `+${-remaining}` : remaining}
                </div>
                <div className="small muted">{remaining < 0 ? "fazla" : "kalan"}</div>
              </div>
            </div>
            <MacroRow label="Protein" v={m.protein} g={settings.proteinGoal} variant="green" />
            <MacroRow label="Karbonhidrat" v={m.carb} g={settings.carbGoal} variant="amber" />
            <MacroRow label="Yağ" v={m.fat} g={settings.fatGoal} variant="pink" />
          </div>
        </Link>

        {/* Antrenman özeti */}
        <span className="section-title">Bugünün Antrenmanı</span>
        {workouts && workouts.length > 0 ? (
          workouts.map((w) => {
            const st = workoutStats(w);
            return (
              <Link key={w.id} to={`/history/${w.id}`} style={{ color: "inherit" }}>
                <div className="card">
                  <div className="row between">
                    <b>{w.name}</b>
                    <span className="pill">✓ Tamamlandı</span>
                  </div>
                  <div className="small muted" style={{ marginTop: 6 }}>
                    {st.exercises} egzersiz · {st.sets} set · {st.volume.toLocaleString("tr-TR")} kg hacim
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="card center">
            <div className="muted small" style={{ marginBottom: 10 }}>Bugün henüz antrenman yok.</div>
            <Link to="/workout" className="btn primary block">🏋️ Antrenmana Başla</Link>
          </div>
        )}

        {/* Kilo */}
        <span className="section-title">Vücut Ağırlığı</span>
        <Link to="/profile" style={{ color: "inherit" }}>
          <div className="card row between">
            <div>
              <div className="bold" style={{ fontSize: 22 }}>
                {latestWeight ? `${latestWeight.weightKg} kg` : "—"}
              </div>
              <div className="small muted">
                {latestWeight ? prettyDate(latestWeight.date) : "Henüz kayıt yok"}
                {settings.weightGoalKg ? ` · Hedef ${settings.weightGoalKg} kg` : ""}
              </div>
            </div>
            <span className="btn sm ghost">Kayıt ekle →</span>
          </div>
        </Link>
      </div>
    </>
  );
}

function MacroRow({ label, v, g, variant }: { label: string; v: number; g: number; variant: string }) {
  return (
    <div style={{ margin: "10px 0" }}>
      <div className="row between small" style={{ marginBottom: 4 }}>
        <span className="muted">{label}</span>
        <span><b>{v}</b><span className="muted"> / {g} g</span></span>
      </div>
      <Bar value={v} max={g} variant={variant} />
    </div>
  );
}

function SyncLine({ status, pending, online, cloudEnabled }: { status: string; pending: number; online: boolean; cloudEnabled: boolean }) {
  if (!cloudEnabled) {
    return <div className="syncbar warn" style={{ margin: "0 0 12px" }}><span className="dot amber" /> Bulut kapalı — veriler yalnızca bu cihazda. Profil’den açabilirsin.</div>;
  }
  if (!online) return <div className="syncbar warn" style={{ margin: "0 0 12px" }}><span className="dot amber" /> Çevrimdışı — {pending} değişiklik internet gelince yüklenecek.</div>;
  if (status === "syncing") return <div className="syncbar ok" style={{ margin: "0 0 12px" }}><span className="dot green" /> Senkronlanıyor…</div>;
  if (status === "error") return <div className="syncbar err" style={{ margin: "0 0 12px" }}><span className="dot red" /> Senkron hatası — Profil’den kontrol et.</div>;
  if (status === "no-auth") return <div className="syncbar warn" style={{ margin: "0 0 12px" }}><span className="dot amber" /> Buluta giriş yapılmadı — Profil’den giriş yap.</div>;
  if (pending > 0) return <div className="syncbar ok" style={{ margin: "0 0 12px" }}><span className="dot green" /> {pending} değişiklik yüklenecek…</div>;
  return <div className="syncbar ok" style={{ margin: "0 0 12px" }}><span className="dot green" /> Buluta senkron ✓</div>;
}
