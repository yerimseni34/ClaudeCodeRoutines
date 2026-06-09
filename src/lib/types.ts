// Tüm uygulama veri tipleri. Her senkronlanabilir kaydın id, updatedAt, deleted,
// ve yerel senkron bayrağı (_dirty) alanları vardır.

export type SetType = "W" | "N" | "F" | "D"; // Warmup, Normal, Failure, Drop set

export interface Synced {
  id: string;
  updatedAt: number; // epoch ms
  deleted?: 0 | 1;
  _dirty?: 0 | 1; // bulutla senkronlanmamış yerel değişiklik
}

export interface Exercise extends Synced {
  name: string;
  muscle: string;       // kas grubu (ör. "Göğüs")
  equipment: string;    // ekipman (ör. "Dumbbell")
  isCustom: 0 | 1;
}

export interface RoutineSet {
  type: SetType;
  targetReps?: number;
}

export interface RoutineExercise {
  exerciseId: string;
  name: string;
  sets: RoutineSet[];
  restSec?: number;
  notes?: string;
}

export interface Routine extends Synced {
  name: string;
  sortOrder: number;
  exercises: RoutineExercise[];
}

export interface LoggedSet {
  type: SetType;
  kg: number | null;
  reps: number | null;
  done: 0 | 1;
  prev?: string; // önceki seferki gösterim, ör. "66 x 7"
}

export interface WorkoutExercise {
  exerciseId: string;
  name: string;
  notes?: string;
  restSec?: number;
  sets: LoggedSet[];
}

export interface Workout extends Synced {
  date: string;        // YYYY-MM-DD
  name: string;
  startedAt: number;   // epoch ms
  durationSec: number;
  notes?: string;
  exercises: WorkoutExercise[];
}

export interface Macros {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export interface Food extends Synced {
  name: string;
  brand?: string;
  barcode?: string;
  per100: Macros;      // 100 g başına değerler
  source: "off" | "custom"; // Open Food Facts veya kullanıcı
}

export type MealType = "kahvalti" | "ogle" | "aksam" | "atistirmalik";

export interface FoodLogEntry extends Synced {
  date: string;        // YYYY-MM-DD
  meal: MealType;
  foodName: string;
  brand?: string;
  grams: number;
  macros: Macros;      // bu porsiyon için hesaplanmış değerler
}

export interface BodyLogEntry extends Synced {
  date: string;        // YYYY-MM-DD
  weightKg: number;
  note?: string;
}

export interface Settings {
  id: "me";
  name: string;
  heightCm: number | null;
  kcalGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
  weightGoalKg: number | null;
  restDefaultSec: number;
  updatedAt: number;
  _dirty?: 0 | 1;
}

export interface CloudConfig {
  url: string;
  anonKey: string;
}
