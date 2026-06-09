import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, softDelete } from "../db/db";
import { TopBar, muscleEmoji, Sheet } from "../components/ui";
import { ExercisePicker } from "../components/ExercisePicker";
import type { Exercise } from "../lib/types";

export default function Exercises() {
  const exercises = useLiveQuery(() => db.exercises.filter((e) => !e.deleted).toArray(), []);
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState("");
  const [picker, setPicker] = useState(false);
  const [sel, setSel] = useState<Exercise | null>(null);

  const muscles = useMemo(() => Array.from(new Set((exercises || []).map((e) => e.muscle))).sort(), [exercises]);
  const filtered = (exercises || [])
    .filter((e) => (muscle ? e.muscle === muscle : true))
    .filter((e) => (q ? e.name.toLowerCase().includes(q.toLowerCase()) : true))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return (
    <>
      <TopBar title="Egzersizler" back sub={`${exercises?.length || 0} egzersiz`} />
      <div className="page">
        <input className="input" placeholder="Ara…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chiprow" style={{ margin: "12px 0" }}>
          <button className={`chip ${muscle === "" ? "active" : ""}`} onClick={() => setMuscle("")}>Tümü</button>
          {muscles.map((m) => <button key={m} className={`chip ${muscle === m ? "active" : ""}`} onClick={() => setMuscle(m)}>{m}</button>)}
        </div>
        <button className="btn primary block" onClick={() => setPicker(true)} style={{ marginBottom: 12 }}>＋ Yeni Egzersiz</button>

        <div className="card">
          {filtered.map((e) => (
            <div key={e.id} className="li" onClick={() => e.isCustom && setSel(e)}>
              <span className="avatar">{muscleEmoji(e.muscle)}</span>
              <span className="grow">
                <span className="bold" style={{ display: "block" }}>{e.name}</span>
                <span className="small muted">{e.muscle} · {e.equipment}</span>
              </span>
              {e.isCustom ? <span className="pill accent">özel</span> : null}
            </div>
          ))}
        </div>
      </div>

      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={() => setPicker(false)} />

      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel?.name}>
        <button className="btn block danger" onClick={async () => { await softDelete(db.exercises, sel!.id); setSel(null); }}>🗑️ Egzersizi Sil</button>
      </Sheet>
    </>
  );
}
