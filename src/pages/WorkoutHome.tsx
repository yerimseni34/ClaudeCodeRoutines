import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { db, softDelete } from "../db/db";
import { TopBar, Sheet, Empty } from "../components/ui";
import { startEmpty, startFromRoutine } from "../lib/workoutOps";
import { useActiveWorkout } from "../state/activeWorkout";
import type { Routine } from "../lib/types";

export default function WorkoutHome() {
  const nav = useNavigate();
  const active = useActiveWorkout();
  const routines = useLiveQuery(
    () => db.routines.filter((r) => !r.deleted).toArray().then((rs) => rs.sort((a, b) => a.sortOrder - b.sortOrder)),
    []
  );
  const [menu, setMenu] = useState<Routine | null>(null);

  function start(action: () => void) {
    if (active) {
      if (!confirm("Devam eden bir antrenman var. Yenisini başlatmak için onu bitirmelisin. Yine de devam edeyim mi? (Mevcut antrenmana dönülür)")) return;
      nav("/workout/active");
      return;
    }
    action();
    nav("/workout/active");
  }

  return (
    <>
      <TopBar title="Antrenman" right={<Link to="/exercises" className="iconbtn">📚</Link>} />
      <div className="page">
        {active && (
          <Link to="/workout/active" className="card" style={{ display: "block", color: "inherit", borderColor: "var(--green)" }}>
            <div className="row between">
              <b>▶ Devam eden: {active.name}</b>
              <span className="pill accent">Devam et</span>
            </div>
          </Link>
        )}

        <span className="section-title">Yeni Antrenman</span>
        <button className="card row between" style={{ width: "100%", textAlign: "left" }} onClick={() => start(startEmpty)}>
          <span className="bold">Boş Antrenman Başlat</span>
          <span style={{ fontSize: 22 }}>🏋️</span>
        </button>

        <div className="row between" style={{ margin: "22px 4px 10px" }}>
          <span className="section-title" style={{ margin: 0 }}>Rutinlerim {routines ? `(${routines.length})` : ""}</span>
          <Link to="/routine/new" className="btn sm primary">+ Rutin</Link>
        </div>

        {routines && routines.length === 0 && (
          <Empty icon="📋" text="Henüz rutin yok" hint="Sık yaptığın antrenmanları rutin olarak kaydet, tek dokunuşla başlat." />
        )}

        {routines?.map((r) => (
          <div key={r.id} className="card">
            <div className="row between">
              <div className="grow">
                <b>{r.name}</b>
                <div className="small muted">{totalSets(r)} set · {r.exercises.length} egzersiz</div>
              </div>
              <button className="iconbtn" onClick={() => setMenu(r)}>⋯</button>
            </div>
            <div style={{ margin: "10px 0" }}>
              {r.exercises.slice(0, 3).map((e, i) => (
                <div key={i} className="small muted truncate">• {e.name} — {e.sets.length} set</div>
              ))}
              {r.exercises.length > 3 && <div className="small muted">+{r.exercises.length - 3} egzersiz daha</div>}
            </div>
            <button className="btn primary block" onClick={() => start(() => startFromRoutine(r))}>BAŞLA</button>
          </div>
        ))}
      </div>

      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu?.name}>
        <button className="btn block ghost" style={{ marginBottom: 10 }} onClick={() => { nav(`/routine/${menu!.id}`); setMenu(null); }}>✏️ Düzenle</button>
        <button className="btn block danger" onClick={async () => { await softDelete(db.routines, menu!.id); setMenu(null); }}>🗑️ Sil</button>
      </Sheet>
    </>
  );
}

function totalSets(r: Routine): number {
  return r.exercises.reduce((n, e) => n + e.sets.length, 0);
}
