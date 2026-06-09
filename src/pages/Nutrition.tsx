import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { db, getSettings, softDelete } from "../db/db";
import { TopBar, Bar, Sheet, mealLabel, mealEmoji } from "../components/ui";
import { todayKey, addDays, prettyDate } from "../lib/date";
import { sumDayMacros } from "../lib/calc";
import type { FoodLogEntry, MealType } from "../lib/types";

const MEALS: MealType[] = ["kahvalti", "ogle", "aksam", "atistirmalik"];

export default function Nutrition() {
  const nav = useNavigate();
  const [date, setDate] = useState(todayKey());
  const settings = useLiveQuery(() => getSettings(), []);
  const entries = useLiveQuery(
    () => db.foodLog.where("date").equals(date).filter((e) => !e.deleted).toArray(),
    [date]
  );
  const [sel, setSel] = useState<FoodLogEntry | null>(null);

  if (!settings) return null;
  const all = entries || [];
  const total = sumDayMacros(all);
  const remaining = settings.kcalGoal - total.kcal;

  return (
    <>
      <TopBar title="Beslenme" />
      <div className="page">
        {/* Tarih gezgini */}
        <div className="row between" style={{ marginBottom: 12 }}>
          <button className="iconbtn" onClick={() => setDate((d) => addDays(d, -1))}>‹</button>
          <div className="center">
            <div className="bold">{prettyDate(date)}</div>
            {date !== todayKey() && <button className="tiny muted" onClick={() => setDate(todayKey())}>bugüne dön</button>}
          </div>
          <button className="iconbtn" onClick={() => setDate((d) => addDays(d, 1))} disabled={date >= todayKey()}>›</button>
        </div>

        {/* Toplam */}
        <div className="card">
          <div className="row between" style={{ alignItems: "flex-end", marginBottom: 12 }}>
            <div><div className="kcalbig">{total.kcal}</div><div className="small muted">/ {settings.kcalGoal} kcal</div></div>
            <div className="center"><div className="bold" style={{ fontSize: 20, color: remaining < 0 ? "var(--red)" : "var(--green)" }}>{remaining < 0 ? `+${-remaining}` : remaining}</div><div className="tiny muted">{remaining < 0 ? "fazla" : "kalan"}</div></div>
          </div>
          <Bar value={total.kcal} max={settings.kcalGoal} />
          <div className="macrogrid" style={{ marginTop: 14 }}>
            <MacroMini label="Protein" v={total.protein} g={settings.proteinGoal} variant="green" />
            <MacroMini label="Karb" v={total.carb} g={settings.carbGoal} variant="amber" />
            <MacroMini label="Yağ" v={total.fat} g={settings.fatGoal} variant="pink" />
          </div>
        </div>

        {/* Öğünler */}
        {MEALS.map((meal) => {
          const items = all.filter((e) => e.meal === meal);
          const mt = sumDayMacros(items);
          return (
            <div key={meal} className="card tight">
              <div className="row between" style={{ marginBottom: items.length ? 8 : 0 }}>
                <b>{mealEmoji(meal)} {mealLabel(meal)}</b>
                <div className="row" style={{ gap: 10 }}>
                  {items.length > 0 && <span className="small muted">{mt.kcal} kcal</span>}
                  <button className="iconbtn" onClick={() => nav(`/nutrition/add?date=${date}&meal=${meal}`)}>＋</button>
                </div>
              </div>
              {items.map((e) => (
                <div key={e.id} className="li" onClick={() => setSel(e)}>
                  <span className="grow">
                    <span className="bold" style={{ display: "block" }}>{e.foodName}</span>
                    <span className="small muted">{e.grams} g{e.brand ? ` · ${e.brand}` : ""} · P{e.macros.protein} K{e.macros.carb} Y{e.macros.fat}</span>
                  </span>
                  <span className="bold">{e.macros.kcal}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel?.foodName}>
        {sel && (
          <>
            <div className="small muted" style={{ marginBottom: 12 }}>{sel.grams} g · {sel.macros.kcal} kcal · P{sel.macros.protein} K{sel.macros.carb} Y{sel.macros.fat}</div>
            <button className="btn block danger" onClick={async () => { await softDelete(db.foodLog, sel.id); setSel(null); }}>🗑️ Sil</button>
          </>
        )}
      </Sheet>
    </>
  );
}

function MacroMini({ label, v, g, variant }: { label: string; v: number; g: number; variant: string }) {
  return (
    <div>
      <div className="small" style={{ marginBottom: 4 }}><b>{v}</b><span className="muted"> /{g}</span></div>
      <Bar value={v} max={g} variant={variant} />
      <div className="tiny muted" style={{ marginTop: 4 }}>{label}</div>
    </div>
  );
}
