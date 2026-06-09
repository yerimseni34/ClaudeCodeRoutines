import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, save, uid } from "../db/db";
import { TopBar, Sheet, mealLabel, NumInput } from "../components/ui";
import { searchFoods } from "../lib/foodApi";
import { scaleMacros } from "../lib/calc";
import { todayKey } from "../lib/date";
import type { Food, FoodLogEntry, Macros, MealType } from "../lib/types";

const MEALS: MealType[] = ["kahvalti", "ogle", "aksam", "atistirmalik"];

export default function AddFood() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const date = sp.get("date") || todayKey();
  const meal = (sp.get("meal") as MealType) || "ogle";

  const [q, setQ] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [picked, setPicked] = useState<Food | null>(null);
  const [manual, setManual] = useState(false);
  const abort = useRef<AbortController | null>(null);

  // Kayıtlı / son yenen yemekler (offline çalışır).
  const saved = useLiveQuery(
    () => db.foods.filter((f) => !f.deleted).reverse().sortBy("updatedAt").then((a) => a.slice(0, 30)),
    []
  );

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); setErr(""); return; }
    const t = setTimeout(async () => {
      abort.current?.abort();
      const ac = new AbortController();
      abort.current = ac;
      setLoading(true); setErr("");
      try {
        const r = await searchFoods(q, ac.signal);
        setResults(r);
      } catch (e: any) {
        if (e?.name !== "AbortError") setErr("Çevrimdışı olabilirsin — kayıtlı yemeklerden ekleyebilirsin.");
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [q]);

  const localMatches = (saved || []).filter((f) => !q || f.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <TopBar title="Yemek Ekle" sub={mealLabel(meal)} back />
      <div className="page">
        <input className="input" placeholder="Yemek ara (ör. yulaf, tavuk göğsü)…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <button className="btn ghost block" style={{ margin: "10px 0" }} onClick={() => setManual(true)}>✍️ Manuel ekle (kendi makroların)</button>

        {loading && <div className="small muted center" style={{ padding: 10 }}>Aranıyor…</div>}
        {err && <div className="syncbar warn" style={{ margin: "8px 0" }}>{err}</div>}

        {localMatches.length > 0 && (
          <>
            <span className="section-title">Kayıtlı Yemekler</span>
            <div className="card tight">
              {localMatches.map((f) => <FoodRow key={f.id} f={f} onPick={() => setPicked(f)} />)}
            </div>
          </>
        )}

        {results.length > 0 && (
          <>
            <span className="section-title">Arama Sonuçları</span>
            <div className="card tight">
              {results.map((f) => <FoodRow key={f.id} f={f} onPick={() => setPicked(f)} />)}
            </div>
          </>
        )}
      </div>

      {picked && (
        <PortionSheet
          food={picked} meal={meal} date={date}
          onClose={() => setPicked(null)}
          onAdded={() => nav("/nutrition", { replace: true })}
        />
      )}

      <ManualSheet open={manual} onClose={() => setManual(false)} onCreated={(f) => { setManual(false); setPicked(f); }} />
    </>
  );
}

function FoodRow({ f, onPick }: { f: Food; onPick: () => void }) {
  return (
    <div className="li" onClick={onPick}>
      <span className="grow">
        <span className="bold" style={{ display: "block" }}>{f.name}</span>
        <span className="small muted">{f.brand ? `${f.brand} · ` : ""}100g: {f.per100.kcal} kcal · P{f.per100.protein} K{f.per100.carb} Y{f.per100.fat}</span>
      </span>
      <span className="muted">＋</span>
    </div>
  );
}

function PortionSheet({ food, meal, date, onClose, onAdded }: { food: Food; meal: MealType; date: string; onClose: () => void; onAdded: () => void }) {
  const [grams, setGrams] = useState<number | null>(100);
  const [mealSel, setMealSel] = useState<MealType>(meal);
  const scaled: Macros = scaleMacros(food.per100, grams || 0);

  async function add() {
    if (!grams || grams <= 0) return;
    // Yemeği tekrar kullanım için kaydet (offline + senkron).
    await save(db.foods, { ...food, updatedAt: Date.now() });
    const entry: FoodLogEntry = {
      id: uid(), date, meal: mealSel, foodName: food.name, brand: food.brand,
      grams, macros: scaled, updatedAt: Date.now(),
    };
    await save(db.foodLog, entry);
    onAdded();
  }

  return (
    <Sheet open onClose={onClose} title={food.name}>
      <div className="field"><label>Miktar (gram)</label><NumInput className="input" value={grams} onChange={setGrams} placeholder="100" /></div>
      <div className="field"><label>Öğün</label>
        <div className="chiprow">
          {MEALS.map((m) => <button key={m} className={`chip ${mealSel === m ? "active" : ""}`} onClick={() => setMealSel(m)}>{mealLabel(m)}</button>)}
        </div>
      </div>
      <div className="card" style={{ background: "var(--card-2)" }}>
        <div className="row between"><span className="muted">Kalori</span><b>{scaled.kcal} kcal</b></div>
        <hr className="hr" />
        <div className="row between small"><span className="muted">Protein</span><span>{scaled.protein} g</span></div>
        <div className="row between small"><span className="muted">Karbonhidrat</span><span>{scaled.carb} g</span></div>
        <div className="row between small"><span className="muted">Yağ</span><span>{scaled.fat} g</span></div>
      </div>
      <button className="btn primary block" onClick={add}>Günlüğe Ekle</button>
    </Sheet>
  );
}

function ManualSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (f: Food) => void }) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState<number | null>(null);
  const [p, setP] = useState<number | null>(null);
  const [c, setC] = useState<number | null>(null);
  const [fat, setFat] = useState<number | null>(null);

  async function create() {
    if (!name.trim()) return;
    const f: Food = {
      id: uid(), name: name.trim(), source: "custom",
      per100: { kcal: kcal || 0, protein: p || 0, carb: c || 0, fat: fat || 0 },
      updatedAt: Date.now(),
    };
    await save(db.foods, f);
    onCreated(f);
    setName(""); setKcal(null); setP(null); setC(null); setFat(null);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Manuel Yemek (100g için)">
      <div className="field"><label>Yemek adı</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ör. Ev yapımı çorba" autoFocus /></div>
      <div className="row" style={{ gap: 10 }}>
        <div className="field grow"><label>Kalori</label><NumInput className="input" value={kcal} onChange={setKcal} placeholder="0" /></div>
        <div className="field grow"><label>Protein</label><NumInput className="input" value={p} onChange={setP} placeholder="0" /></div>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <div className="field grow"><label>Karbonhidrat</label><NumInput className="input" value={c} onChange={setC} placeholder="0" /></div>
        <div className="field grow"><label>Yağ</label><NumInput className="input" value={fat} onChange={setFat} placeholder="0" /></div>
      </div>
      <button className="btn primary block" onClick={create}>Devam Et</button>
    </Sheet>
  );
}
