import Dexie, { type Table } from "dexie";
import type {
  Exercise,
  Routine,
  Workout,
  Food,
  FoodLogEntry,
  BodyLogEntry,
  Settings,
} from "../lib/types";
import { seedExercises } from "./seed";

// Yerel (offline) veritabanı. Tüm veri burada tutulur; Supabase yalnızca yedek/senkron.
export class FitDB extends Dexie {
  exercises!: Table<Exercise, string>;
  routines!: Table<Routine, string>;
  workouts!: Table<Workout, string>;
  foods!: Table<Food, string>;
  foodLog!: Table<FoodLogEntry, string>;
  bodyLog!: Table<BodyLogEntry, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super("fitlog");
    this.version(1).stores({
      exercises: "id, name, muscle, _dirty, updatedAt",
      routines: "id, sortOrder, _dirty, updatedAt",
      workouts: "id, date, _dirty, updatedAt",
      foods: "id, name, barcode, _dirty, updatedAt",
      foodLog: "id, date, meal, _dirty, updatedAt",
      bodyLog: "id, date, _dirty, updatedAt",
      settings: "id, _dirty, updatedAt",
    });
  }
}

export const db = new FitDB();

export function uid(): string {
  return crypto.randomUUID();
}

// Senkronlanabilir tablolar (settings hariç hepsi soft-delete destekler).
export const SYNC_TABLES = [
  "exercises",
  "routines",
  "workouts",
  "foods",
  "foodLog",
  "bodyLog",
  "settings",
] as const;

export type SyncTableName = (typeof SYNC_TABLES)[number];

// Bir kaydı kaydeder, updatedAt'i tazeler ve _dirty=1 yapar (senkrona kuyruğa alır).
export async function save<T extends { id: string; updatedAt: number; _dirty?: 0 | 1 }>(
  table: Table<T, string>,
  record: T
): Promise<T> {
  record.updatedAt = Date.now();
  record._dirty = 1;
  await table.put(record);
  return record;
}

// Soft delete — kayıt silinmez, deleted=1 işaretlenir ve senkronlanır.
export async function softDelete(
  table: Table<any, string>,
  id: string
): Promise<void> {
  const rec = await table.get(id);
  if (!rec) return;
  rec.deleted = 1;
  rec.updatedAt = Date.now();
  rec._dirty = 1;
  await table.put(rec);
}

export const DEFAULT_SETTINGS: Settings = {
  id: "me",
  name: "Sporcu",
  heightCm: null,
  kcalGoal: 2500,
  proteinGoal: 180,
  carbGoal: 250,
  fatGoal: 70,
  weightGoalKg: null,
  restDefaultSec: 120,
  updatedAt: 0,
  _dirty: 0,
};

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get("me");
  return s || DEFAULT_SETTINGS;
}

// İlk açılışta egzersiz kütüphanesini ve varsayılan ayarları doldurur.
export async function ensureSeed(): Promise<void> {
  const count = await db.exercises.count();
  if (count === 0) {
    const now = Date.now();
    await db.exercises.bulkPut(
      seedExercises.map((e) => ({
        ...e,
        id: uid(),
        isCustom: 0 as const,
        updatedAt: now,
        _dirty: 1 as const,
      }))
    );
  }
  const s = await db.settings.get("me");
  if (!s) {
    await db.settings.put({ ...DEFAULT_SETTINGS, updatedAt: Date.now(), _dirty: 1 });
  }
}
