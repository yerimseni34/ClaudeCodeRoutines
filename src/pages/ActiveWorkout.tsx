import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { getSettings } from "../db/db";
import { useActiveWorkout, setActive } from "../state/activeWorkout";
import { addExerciseToActive, finishWorkout } from "../lib/workoutOps";
import { fmtDuration } from "../lib/date";
import { NumInput, Sheet } from "../components/ui";
import { ExercisePicker } from "../components/ExercisePicker";
import { workoutStats } from "../lib/calc";
import type { LoggedSet, SetType, Workout, WorkoutExercise } from "../lib/types";

const TYPE_ORDER: SetType[] = ["N", "W", "F", "D"];

export default function ActiveWorkout() {
  const nav = useNavigate();
  const active = useActiveWorkout();
  const settings = useLiveQuery(() => getSettings(), []);
  const [elapsed, setElapsed] = useState(0);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restLeft, setRestLeft] = useState(0);
  const [picker, setPicker] = useState(false);
  const [exMenu, setExMenu] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const tick = () => setElapsed(Math.round((Date.now() - active.startedAt) / 1000));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [active?.startedAt, active]);

  useEffect(() => {
    if (restEndsAt == null) return;
    const tick = () => {
      const left = Math.round((restEndsAt - Date.now()) / 1000);
      if (left <= 0) {
        setRestLeft(0);
        setRestEndsAt(null);
        try { navigator.vibrate?.(400); } catch {}
      } else setRestLeft(left);
    };
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [restEndsAt]);

  if (!active) {
    return (
      <div className="empty" style={{ paddingTop: 100 }}>
        <div className="big">🏋️</div>
        Aktif antrenman yok.
        <div style={{ marginTop: 16 }}><button className="btn primary" onClick={() => nav("/workout")}>Antrenmana git</button></div>
      </div>
    );
  }

  function update(mut: (w: Workout) => Workout) {
    setActive(mut(structuredClone(active!)));
  }

  function startRest(sec: number) {
    setRestEndsAt(Date.now() + sec * 1000);
  }

  async function onFinish() {
    if (!confirm("Antrenmanı bitir ve kaydet?")) return;
    const w = await finishWorkout(active!);
    nav(w ? `/history/${w.id}` : "/workout", { replace: true });
  }

  function onDiscard() {
    if (!confirm("Antrenman silinsin mi? Bu işlem geri alınamaz.")) return;
    setActive(null);
    nav("/workout", { replace: true });
  }

  const stats = workoutStats(active);
  const restSecDefault = settings?.restDefaultSec ?? 120;

  return (
    <div className="app" style={{ paddingBottom: 120 }}>
      {/* Üst bar */}
      <div className="topbar">
        <button className="iconbtn" onClick={() => nav("/")}>▾</button>
        <div className="grow center">
          <div className="timerbig">{fmtDuration(elapsed)}</div>
          <div className="tiny muted">{stats.doneSets}/{stats.sets} set · {stats.volume.toLocaleString("tr-TR")} kg</div>
        </div>
        <button className="iconbtn primary" style={{ background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" }} onClick={onFinish}>→</button>
      </div>

      <div className="page">
        {/* Dinlenme sayacı */}
        {restEndsAt != null && (
          <div className="resttimer">
            <span>⏱️ Dinlenme</span>
            <span className="timerbig" style={{ fontSize: 22 }}>{fmtDuration(restLeft)}</span>
            <span className="row" style={{ gap: 6 }}>
              <button className="btn sm ghost" onClick={() => setRestEndsAt((t) => (t ?? Date.now()) + 15000)}>+15sn</button>
              <button className="btn sm ghost" onClick={() => setRestEndsAt(null)}>Atla</button>
            </span>
          </div>
        )}

        {/* İsim & not */}
        <input
          className="input bold" style={{ marginBottom: 10 }}
          value={active.name}
          onChange={(e) => update((w) => ({ ...w, name: e.target.value }))}
        />
        <textarea
          className="textarea" placeholder="Antrenman notların…"
          value={active.notes || ""}
          onChange={(e) => update((w) => ({ ...w, notes: e.target.value }))}
          style={{ marginBottom: 14 }}
        />

        {active.exercises.map((ex, ei) => (
          <ExerciseCard
            key={ei}
            ex={ex}
            restSecDefault={restSecDefault}
            onMenu={() => setExMenu(ei)}
            onChange={(next) => update((w) => { w.exercises[ei] = next; return w; })}
            onRest={(sec) => startRest(sec)}
          />
        ))}

        <button className="btn ghost block" style={{ marginTop: 6 }} onClick={() => setPicker(true)}>＋ Egzersiz Ekle</button>
        <button className="btn danger block" style={{ marginTop: 10 }} onClick={onDiscard}>Antrenmanı Sil</button>
      </div>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={async (e) => { await addExerciseToActive(active, e.id, e.name, restSecDefault); setPicker(false); }}
      />

      {/* Egzersiz menüsü */}
      <Sheet open={exMenu != null} onClose={() => setExMenu(null)} title={exMenu != null ? active.exercises[exMenu]?.name : ""}>
        <button className="btn block danger" onClick={() => { update((w) => { w.exercises.splice(exMenu!, 1); return w; }); setExMenu(null); }}>
          🗑️ Egzersizi Kaldır
        </button>
      </Sheet>
    </div>
  );
}

function ExerciseCard({
  ex, restSecDefault, onChange, onRest, onMenu,
}: {
  ex: WorkoutExercise;
  restSecDefault: number;
  onChange: (e: WorkoutExercise) => void;
  onRest: (sec: number) => void;
  onMenu: () => void;
}) {
  // Normal setleri sırayla numaralandır.
  let normalCount = 0;
  function label(s: LoggedSet): string {
    if (s.type === "N") { normalCount++; return String(normalCount); }
    return s.type;
  }
  function cycleType(i: number) {
    const cur = ex.sets[i].type;
    const next = TYPE_ORDER[(TYPE_ORDER.indexOf(cur) + 1) % TYPE_ORDER.length];
    const sets = ex.sets.slice();
    sets[i] = { ...sets[i], type: next };
    onChange({ ...ex, sets });
  }
  function setField(i: number, field: "kg" | "reps", v: number | null) {
    const sets = ex.sets.slice();
    sets[i] = { ...sets[i], [field]: v };
    onChange({ ...ex, sets });
  }
  function toggleDone(i: number) {
    const sets = ex.sets.slice();
    const s = { ...sets[i] };
    s.done = s.done ? 0 : 1;
    // Tamamlanırken boş alanları önceki değerlerden doldur.
    if (s.done && s.prev) {
      const m = s.prev.match(/([\d.]+)\s*x\s*(\d+)/);
      if (m) {
        if (s.kg == null) s.kg = Number(m[1]);
        if (s.reps == null) s.reps = Number(m[2]);
      }
    }
    sets[i] = s;
    onChange({ ...ex, sets });
    if (s.done) onRest(ex.restSec || restSecDefault);
  }
  function addSet() {
    const last = ex.sets[ex.sets.length - 1];
    onChange({ ...ex, sets: [...ex.sets, { type: "N", kg: null, reps: null, done: 0, prev: last?.prev }] });
  }
  function removeSet(i: number) {
    const sets = ex.sets.slice();
    sets.splice(i, 1);
    onChange({ ...ex, sets });
  }

  return (
    <div className="card tight">
      <div className="row between" style={{ marginBottom: 10 }}>
        <b className="grow truncate">{ex.name}</b>
        <button className="iconbtn" onClick={onMenu}>⋯</button>
      </div>

      <div className="setgrid" style={{ marginBottom: 6 }}>
        <div className="head">SET</div>
        <div className="head">ÖNCE</div>
        <div className="head">KG</div>
        <div className="head">TEKRAR</div>
        <div className="head"></div>
      </div>

      {ex.sets.map((s, i) => (
        <div key={i} className={`setgrid setrow ${s.done ? "done" : ""}`}>
          <button className={`settag ${s.type}`} onClick={() => cycleType(i)} title="Set tipini değiştir">{label(s)}</button>
          <div className="prevcell">{s.prev || "—"}</div>
          <NumInput className={`numbox ${s.done ? "done" : ""}`} value={s.kg} onChange={(v) => setField(i, "kg", v)} placeholder="0" />
          <NumInput className={`numbox ${s.done ? "done" : ""}`} value={s.reps} onChange={(v) => setField(i, "reps", v)} placeholder="0" />
          <button className={`checkbtn ${s.done ? "on" : ""}`} onClick={() => toggleDone(i)}
            onContextMenu={(e) => { e.preventDefault(); removeSet(i); }}>✓</button>
        </div>
      ))}

      <button className="btn ghost block sm" style={{ marginTop: 8 }} onClick={addSet}>＋ Set Ekle</button>
    </div>
  );
}
