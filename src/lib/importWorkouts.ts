import { db, save, uid } from "../db/db";
import { todayKey } from "./date";
import type { Exercise, Workout, WorkoutExercise, LoggedSet, SetType } from "./types";

// Hevy / Strong gibi uygulamaların CSV dışa aktarımını içe alır.
// Sütunlar başlık adına göre eşlenir, böylece her iki format da çalışır.

// --- CSV ayrıştırıcı (tırnaklı alanları, virgül ve satır sonlarını destekler) ---
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // BOM temizle
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* yoksay */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

function pick(header: string[], ...names: string[]): number {
  const norm = header.map((h) => h.trim().toLowerCase());
  for (const n of names) {
    const i = norm.indexOf(n.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Hevy ("15 Aug 2023, 17:48") ve ISO ("2023-08-15 17:48:12") biçimlerini çözer.
function parseWhen(raw: string): number {
  const s = (raw || "").trim();
  if (!s) return Date.now();
  const native = Date.parse(s);
  if (!isNaN(native)) return native;
  // "15 Aug 2023, 17:48" benzeri
  const m = s.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const day = +m[1], mon = MONTHS[m[2].toLowerCase()] ?? 0, yr = +m[3];
    const hh = m[4] ? +m[4] : 12, mm = m[5] ? +m[5] : 0;
    return new Date(yr, mon, day, hh, mm).getTime();
  }
  return Date.now();
}

function mapSetType(raw: string): SetType {
  const t = (raw || "").trim().toLowerCase();
  if (t.startsWith("warm")) return "W";
  if (t.startsWith("fail")) return "F";
  if (t.startsWith("drop")) return "D";
  return "N";
}

function num(raw: string): number | null {
  const v = parseFloat((raw || "").replace(",", "."));
  return isNaN(v) ? null : v;
}

export interface ImportResult {
  workouts: number;
  exercises: number;
  sets: number;
  error?: string;
}

// CSV metnini ayrıştırıp antrenman geçmişine (ve eksik egzersizleri kütüphaneye) ekler.
export async function importWorkoutCsv(text: string): Promise<ImportResult> {
  const rows = parseCsv(text);
  if (rows.length < 2) return { workouts: 0, exercises: 0, sets: 0, error: "Dosya boş ya da okunamadı." };
  const header = rows[0];

  const cTitle = pick(header, "title", "workout name", "workout_name");
  const cStart = pick(header, "start_time", "date", "workout date");
  const cEnd = pick(header, "end_time");
  const cEx = pick(header, "exercise_title", "exercise name", "exercise_name", "exercise");
  const cType = pick(header, "set_type", "set type");
  const cKg = pick(header, "weight_kg", "weight", "kg");
  const cLbs = pick(header, "weight_lbs", "weight (lbs)", "lbs");
  const cReps = pick(header, "reps", "rep count");
  const cNotes = pick(header, "exercise_notes", "notes");
  const cWnotes = pick(header, "description", "workout_notes");

  if (cEx < 0 || cReps < 0) {
    return { workouts: 0, exercises: 0, sets: 0, error: "Tanınan bir antrenman CSV'si değil (egzersiz/tekrar sütunu yok)." };
  }

  // Antrenmanları (başlık + başlangıç) anahtarıyla grupla.
  const groups = new Map<string, string[][]>();
  const order: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const key = `${cTitle >= 0 ? r[cTitle] : "Antrenman"}|${cStart >= 0 ? r[cStart] : ""}`;
    if (!groups.has(key)) { groups.set(key, []); order.push(key); }
    groups.get(key)!.push(r);
  }

  // Mevcut egzersiz kütüphanesi (isimle eşleştirmek için).
  const existing = await db.exercises.filter((e) => !e.deleted).toArray();
  const byName = new Map(existing.map((e) => [e.name.trim().toLowerCase(), e]));
  const newExercises: Exercise[] = [];

  function exerciseId(name: string): string {
    const key = name.trim().toLowerCase();
    const found = byName.get(key);
    if (found) return found.id;
    const ex: Exercise = { id: uid(), name: name.trim(), muscle: "Diğer", equipment: "Diğer", isCustom: 1, updatedAt: Date.now(), _dirty: 1 };
    byName.set(key, ex);
    newExercises.push(ex);
    return ex.id;
  }

  const workouts: Workout[] = [];
  let setCount = 0;

  for (const key of order) {
    const rs = groups.get(key)!;
    const first = rs[0];
    const startedAt = cStart >= 0 ? parseWhen(first[cStart]) : Date.now();
    const endAt = cEnd >= 0 ? parseWhen(first[cEnd]) : startedAt;
    const date = todayKey(new Date(startedAt));
    const name = (cTitle >= 0 && first[cTitle]?.trim()) || "Antrenman";

    // Egzersizleri görülme sırasına göre topla.
    const exMap = new Map<string, WorkoutExercise>();
    const exOrder: string[] = [];
    for (const r of rs) {
      const exName = (r[cEx] || "").trim();
      if (!exName) continue;
      if (!exMap.has(exName)) {
        exMap.set(exName, { exerciseId: exerciseId(exName), name: exName, notes: cNotes >= 0 ? r[cNotes] : undefined, sets: [] });
        exOrder.push(exName);
      }
      let kg = cKg >= 0 ? num(r[cKg]) : null;
      if (kg == null && cLbs >= 0) { const l = num(r[cLbs]); if (l != null) kg = Math.round(l * 0.453592 * 10) / 10; }
      const reps = cReps >= 0 ? num(r[cReps]) : null;
      const set: LoggedSet = { type: cType >= 0 ? mapSetType(r[cType]) : "N", kg, reps, done: 1 };
      exMap.get(exName)!.sets.push(set);
      setCount++;
    }
    const exercises = exOrder.map((n) => exMap.get(n)!).filter((e) => e.sets.length > 0);
    if (exercises.length === 0) continue;

    workouts.push({
      id: uid(),
      date,
      name,
      startedAt,
      durationSec: Math.max(0, Math.round((endAt - startedAt) / 1000)),
      notes: cWnotes >= 0 ? first[cWnotes] : undefined,
      exercises,
      updatedAt: Date.now(),
      _dirty: 1,
    });
  }

  if (workouts.length === 0) {
    return { workouts: 0, exercises: 0, sets: 0, error: "Antrenman bulunamadı. Dosya formatını kontrol et." };
  }

  // Kaydet (bulut açıksa _dirty olduğu için senkronlanır).
  if (newExercises.length) await db.exercises.bulkPut(newExercises);
  await db.workouts.bulkPut(workouts);

  return { workouts: workouts.length, exercises: newExercises.length, sets: setCount };
}
