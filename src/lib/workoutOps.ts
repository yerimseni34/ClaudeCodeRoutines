import { db, save, uid } from "../db/db";
import { setActive } from "../state/activeWorkout";
import { todayKey } from "./date";
import type { Routine, Workout, WorkoutExercise, LoggedSet } from "./types";

// Bir egzersiz için en son yapılan antrenmandaki set değerlerini "kg x reps" olarak getirir.
export async function getPrevSets(exerciseId: string): Promise<string[]> {
  const all = await db.workouts.filter((w) => !w.deleted).toArray();
  all.sort((a, b) => b.startedAt - a.startedAt);
  for (const w of all) {
    const ex = w.exercises.find((e) => e.exerciseId === exerciseId);
    if (ex) {
      return ex.sets
        .filter((s) => s.done && s.kg != null && s.reps != null)
        .map((s) => `${s.kg} x ${s.reps}`);
    }
  }
  return [];
}

function buildSet(type: LoggedSet["type"], prev?: string): LoggedSet {
  return { type, kg: null, reps: null, done: 0, prev };
}

export async function startFromRoutine(routine: Routine) {
  const exercises: WorkoutExercise[] = [];
  for (const re of routine.exercises) {
    const prev = await getPrevSets(re.exerciseId);
    exercises.push({
      exerciseId: re.exerciseId,
      name: re.name,
      notes: re.notes,
      restSec: re.restSec,
      sets: re.sets.map((s, i) => buildSet(s.type, prev[i])),
    });
  }
  const w: Workout = {
    id: uid(),
    date: todayKey(),
    name: routine.name,
    startedAt: Date.now(),
    durationSec: 0,
    exercises,
    updatedAt: Date.now(),
  };
  setActive(w);
  return w;
}

export function startEmpty() {
  const w: Workout = {
    id: uid(),
    date: todayKey(),
    name: "Antrenman",
    startedAt: Date.now(),
    durationSec: 0,
    exercises: [],
    updatedAt: Date.now(),
  };
  setActive(w);
  return w;
}

// Antrenmanı bitirir: süreyi hesaplar, tamamlanmamış boş setleri ayıklar, geçmişe kaydeder.
export async function finishWorkout(active: Workout): Promise<Workout | null> {
  const exercises = active.exercises
    .map((ex) => ({
      ...ex,
      sets: ex.sets.filter((s) => s.done || s.kg != null || s.reps != null),
    }))
    .filter((ex) => ex.sets.length > 0);

  if (exercises.length === 0) {
    // Hiç set yoksa kaydetme.
    setActive(null);
    return null;
  }

  const w: Workout = {
    ...active,
    date: todayKey(),
    durationSec: Math.round((Date.now() - active.startedAt) / 1000),
    exercises,
    updatedAt: Date.now(),
  };
  await save(db.workouts, w);
  setActive(null);
  return w;
}

export async function addExerciseToActive(active: Workout, exerciseId: string, name: string, restSec?: number) {
  const prev = await getPrevSets(exerciseId);
  const ex: WorkoutExercise = {
    exerciseId,
    name,
    restSec,
    sets: [buildSet("N", prev[0])],
  };
  setActive({ ...active, exercises: [...active.exercises, ex] });
}
