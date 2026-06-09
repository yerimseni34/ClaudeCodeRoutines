import type { Macros, Workout, FoodLogEntry } from "./types";

// Porsiyon (gram) için 100g başı makrolardan hesap.
export function scaleMacros(per100: Macros, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: Math.round(per100.kcal * f),
    protein: round1(per100.protein * f),
    carb: round1(per100.carb * f),
    fat: round1(per100.fat * f),
  };
}

export function emptyMacros(): Macros {
  return { kcal: 0, protein: 0, carb: 0, fat: 0 };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      protein: a.protein + m.protein,
      carb: a.carb + m.carb,
      fat: a.fat + m.fat,
    }),
    emptyMacros()
  );
}

export function sumDayMacros(entries: FoodLogEntry[]): Macros {
  const t = sumMacros(entries.map((e) => e.macros));
  return {
    kcal: Math.round(t.kcal),
    protein: round1(t.protein),
    carb: round1(t.carb),
    fat: round1(t.fat),
  };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Antrenman özeti: toplam set, toplam hacim (kg x tekrar), tamamlanan set sayısı.
export function workoutStats(w: Workout) {
  let sets = 0;
  let volume = 0;
  let doneSets = 0;
  for (const ex of w.exercises) {
    for (const s of ex.sets) {
      sets++;
      if (s.done) doneSets++;
      if (s.kg && s.reps) volume += s.kg * s.reps;
    }
  }
  return { sets, volume: Math.round(volume), doneSets, exercises: w.exercises.length };
}

// Epley formülü ile tahmini 1RM.
export function est1RM(kg: number, reps: number): number {
  if (reps <= 1) return kg;
  return Math.round(kg * (1 + reps / 30));
}

// Makro hedeflerinden kalori tahmini (4/4/9).
export function macrosToKcal(protein: number, carb: number, fat: number): number {
  return Math.round(protein * 4 + carb * 4 + fat * 9);
}
