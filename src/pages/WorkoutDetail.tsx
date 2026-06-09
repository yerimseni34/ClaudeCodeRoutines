import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db, save, softDelete, uid } from "../db/db";
import { TopBar } from "../components/ui";
import { prettyDate, fmtDuration } from "../lib/date";
import { workoutStats, est1RM } from "../lib/calc";
import type { Routine, Workout } from "../lib/types";

export default function WorkoutDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [w, setW] = useState<Workout | null>(null);

  useEffect(() => {
    if (id) db.workouts.get(id).then((x) => setW(x || null));
  }, [id]);

  if (!w) return <><TopBar title="Antrenman" back /><div className="empty">Bulunamadı.</div></>;
  const st = workoutStats(w);

  async function saveAsRoutine() {
    const r: Routine = {
      id: uid(),
      name: w!.name,
      sortOrder: Date.now(),
      exercises: w!.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        restSec: ex.restSec,
        sets: ex.sets.map((s) => ({ type: s.type, targetReps: s.reps ?? undefined })),
      })),
      updatedAt: Date.now(),
    };
    await save(db.routines, r);
    alert("Rutin olarak kaydedildi ✓");
  }

  async function onDelete() {
    if (!confirm("Bu antrenman kaydı silinsin mi?")) return;
    await softDelete(db.workouts, w!.id);
    nav("/history", { replace: true });
  }

  return (
    <>
      <TopBar title={w.name} sub={prettyDate(w.date)} back />
      <div className="page">
        <div className="card row" style={{ justifyContent: "space-around", textAlign: "center" }}>
          <Stat v={fmtDuration(w.durationSec)} l="Süre" />
          <Stat v={`${st.sets}`} l="Set" />
          <Stat v={st.volume.toLocaleString("tr-TR")} l="Hacim (kg)" />
        </div>

        {w.notes && <div className="card small">📝 {w.notes}</div>}

        {w.exercises.map((ex, i) => (
          <div key={i} className="card tight">
            <b>{ex.name}</b>
            <div className="setgrid" style={{ margin: "8px 0 4px" }}>
              <div className="head">SET</div><div className="head">KG</div><div className="head">TEKRAR</div><div className="head">~1RM</div><div className="head"></div>
            </div>
            {ex.sets.map((s, si) => (
              <div key={si} className="setgrid setrow">
                <span className={`settag ${s.type}`}>{s.type === "N" ? si + 1 : s.type}</span>
                <span className="prevcell">{s.kg ?? "—"}</span>
                <span className="prevcell">{s.reps ?? "—"}</span>
                <span className="prevcell">{s.kg && s.reps ? est1RM(s.kg, s.reps) : "—"}</span>
                <span className="prevcell">{s.done ? "✓" : ""}</span>
              </div>
            ))}
          </div>
        ))}

        <button className="btn ghost block" style={{ marginTop: 8 }} onClick={saveAsRoutine}>📋 Rutin Olarak Kaydet</button>
        <button className="btn danger block" style={{ marginTop: 10 }} onClick={onDelete}>🗑️ Kaydı Sil</button>
      </div>
    </>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return <div><div className="bold" style={{ fontSize: 18 }}>{v}</div><div className="tiny muted">{l}</div></div>;
}
