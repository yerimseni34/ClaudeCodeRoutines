import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, save, uid } from "../db/db";
import { Sheet, muscleEmoji } from "./ui";
import type { Exercise } from "../lib/types";

export function ExercisePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (e: Exercise) => void }) {
  const exercises = useLiveQuery(() => db.exercises.filter((e) => !e.deleted).toArray(), []);
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<string>("");
  const [adding, setAdding] = useState(false);

  const muscles = useMemo(() => {
    const set = new Set<string>();
    (exercises || []).forEach((e) => set.add(e.muscle));
    return Array.from(set).sort();
  }, [exercises]);

  const filtered = (exercises || [])
    .filter((e) => (muscle ? e.muscle === muscle : true))
    .filter((e) => (q ? e.name.toLowerCase().includes(q.toLowerCase()) : true))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return (
    <Sheet open={open} onClose={onClose} title="Egzersiz Seç">
      <input className="input" placeholder="Egzersiz ara…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="chiprow" style={{ margin: "12px 0" }}>
        <button className={`chip ${muscle === "" ? "active" : ""}`} onClick={() => setMuscle("")}>Tümü</button>
        {muscles.map((m) => (
          <button key={m} className={`chip ${muscle === m ? "active" : ""}`} onClick={() => setMuscle(m)}>{m}</button>
        ))}
      </div>

      {!adding ? (
        <button className="btn ghost block" style={{ marginBottom: 12 }} onClick={() => setAdding(true)}>＋ Yeni egzersiz ekle</button>
      ) : (
        <NewExercise defaultMuscle={muscle} onDone={(e) => { setAdding(false); if (e) onPick(e); }} />
      )}

      <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
        {filtered.map((e) => (
          <button key={e.id} className="li" style={{ width: "100%", textAlign: "left" }} onClick={() => onPick(e)}>
            <span className="avatar">{muscleEmoji(e.muscle)}</span>
            <span className="grow">
              <span className="bold" style={{ display: "block" }}>{e.name}</span>
              <span className="small muted">{e.muscle} · {e.equipment}</span>
            </span>
            <span className="muted">＋</span>
          </button>
        ))}
        {filtered.length === 0 && <div className="empty small">Sonuç yok. Yukarıdan yeni egzersiz ekleyebilirsin.</div>}
      </div>
    </Sheet>
  );
}

function NewExercise({ defaultMuscle, onDone }: { defaultMuscle: string; onDone: (e: Exercise | null) => void }) {
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState(defaultMuscle || "Göğüs");
  const [equipment, setEquipment] = useState("Barbell");
  const muscleOpts = ["Göğüs", "Sırt", "Omuz", "Biceps", "Triceps", "Bacak", "Karın", "Kardiyo", "Diğer"];
  const eqOpts = ["Barbell", "Dumbbell", "Makine", "Kablo", "Vücut Ağırlığı", "Diğer"];

  async function create() {
    if (!name.trim()) return;
    const e: Exercise = { id: uid(), name: name.trim(), muscle, equipment, isCustom: 1, updatedAt: Date.now() };
    await save(db.exercises, e);
    onDone(e);
  }

  return (
    <div className="card" style={{ background: "var(--card-2)" }}>
      <div className="field"><label>Ad</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Egzersiz adı" autoFocus /></div>
      <div className="row" style={{ gap: 10 }}>
        <div className="field grow"><label>Kas</label>
          <select className="select" value={muscle} onChange={(e) => setMuscle(e.target.value)}>{muscleOpts.map((o) => <option key={o}>{o}</option>)}</select>
        </div>
        <div className="field grow"><label>Ekipman</label>
          <select className="select" value={equipment} onChange={(e) => setEquipment(e.target.value)}>{eqOpts.map((o) => <option key={o}>{o}</option>)}</select>
        </div>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn ghost grow" onClick={() => onDone(null)}>Vazgeç</button>
        <button className="btn primary grow" onClick={create}>Ekle ve Seç</button>
      </div>
    </div>
  );
}
