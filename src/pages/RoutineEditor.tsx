import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db, save, uid } from "../db/db";
import { TopBar, Sheet, NumInput } from "../components/ui";
import { ExercisePicker } from "../components/ExercisePicker";
import type { Routine, RoutineExercise, SetType } from "../lib/types";

const TYPE_ORDER: SetType[] = ["N", "W", "F", "D"];

export default function RoutineEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [name, setName] = useState("Yeni Rutin");
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);
  const [sortOrder, setSortOrder] = useState(Date.now());
  const [picker, setPicker] = useState(false);
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    if (!id) return;
    db.routines.get(id).then((r) => {
      if (r) { setName(r.name); setExercises(r.exercises); setSortOrder(r.sortOrder); }
      setLoaded(true);
    });
  }, [id]);

  if (!loaded) return null;

  function addExercise(exerciseId: string, exName: string) {
    setExercises((xs) => [...xs, { exerciseId, name: exName, sets: [{ type: "N" }, { type: "N" }, { type: "N" }], restSec: undefined, notes: "" }]);
    setPicker(false);
  }
  function patch(i: number, p: Partial<RoutineExercise>) {
    setExercises((xs) => xs.map((e, idx) => (idx === i ? { ...e, ...p } : e)));
  }
  function addSet(i: number) {
    setExercises((xs) => xs.map((e, idx) => (idx === i ? { ...e, sets: [...e.sets, { type: "N" }] } : e)));
  }
  function removeSet(i: number, si: number) {
    setExercises((xs) => xs.map((e, idx) => (idx === i ? { ...e, sets: e.sets.filter((_, k) => k !== si) } : e)));
  }
  function cycleType(i: number, si: number) {
    setExercises((xs) => xs.map((e, idx) => {
      if (idx !== i) return e;
      const sets = e.sets.slice();
      const cur = sets[si].type;
      sets[si] = { ...sets[si], type: TYPE_ORDER[(TYPE_ORDER.indexOf(cur) + 1) % TYPE_ORDER.length] };
      return { ...e, sets };
    }));
  }
  function move(i: number, dir: -1 | 1) {
    setExercises((xs) => {
      const arr = xs.slice();
      const j = i + dir;
      if (j < 0 || j >= arr.length) return xs;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }

  async function onSave() {
    if (!name.trim() || exercises.length === 0) { alert("İsim ve en az bir egzersiz gerekli."); return; }
    const r: Routine = { id: id || uid(), name: name.trim(), sortOrder, exercises, updatedAt: Date.now() };
    await save(db.routines, r);
    nav("/workout", { replace: true });
  }

  let normalCount = 0;
  function setLabel(t: SetType): string {
    if (t === "N") { normalCount++; return String(normalCount); }
    return t;
  }

  return (
    <>
      <TopBar title={id ? "Rutini Düzenle" : "Yeni Rutin"} back right={<button className="btn sm primary" onClick={onSave}>Kaydet</button>} />
      <div className="page">
        <div className="field"><label>Rutin Adı</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ör. Göğüs + Omuz + Triceps" />
        </div>

        {exercises.map((ex, i) => {
          normalCount = 0;
          return (
            <div key={i} className="card tight">
              <div className="row between" style={{ marginBottom: 8 }}>
                <b className="grow truncate">{ex.name}</b>
                <button className="iconbtn" onClick={() => move(i, -1)}>↑</button>
                <button className="iconbtn" onClick={() => move(i, 1)}>↓</button>
                <button className="iconbtn" onClick={() => setExercises((xs) => xs.filter((_, k) => k !== i))}>✕</button>
              </div>
              <div className="setgrid" style={{ gridTemplateColumns: "34px 1fr 38px", marginBottom: 4 }}>
                <div className="head">SET</div><div className="head">HEDEF TEKRAR</div><div className="head"></div>
              </div>
              {ex.sets.map((s, si) => (
                <div key={si} className="setgrid setrow" style={{ gridTemplateColumns: "34px 1fr 38px" }}>
                  <button className={`settag ${s.type}`} onClick={() => cycleType(i, si)}>{setLabel(s.type)}</button>
                  <NumInput value={s.targetReps ?? null} placeholder="—"
                    onChange={(v) => patch(i, { sets: ex.sets.map((x, k) => (k === si ? { ...x, targetReps: v ?? undefined } : x)) })} />
                  <button className="checkbtn" onClick={() => removeSet(i, si)}>✕</button>
                </div>
              ))}
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <button className="btn ghost sm grow" onClick={() => addSet(i)}>＋ Set</button>
                <input className="numbox" style={{ flex: 1 }} type="number" placeholder="dinlenme sn"
                  value={ex.restSec ?? ""} onChange={(e) => patch(i, { restSec: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
            </div>
          );
        })}

        <button className="btn ghost block" onClick={() => setPicker(true)}>＋ Egzersiz Ekle</button>
      </div>

      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={(e) => addExercise(e.id, e.name)} />
    </>
  );
}
