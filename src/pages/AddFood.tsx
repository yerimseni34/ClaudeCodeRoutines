import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, save, uid } from "../db/db";
import { TopBar, Sheet, mealLabel, NumInput } from "../components/ui";
import { searchFoods } from "../lib/foodApi";
import { scaleMacros } from "../lib/calc";
import { todayKey } from "../lib/date";
import { fileToDownscaledBase64 } from "../lib/image";
import { analyzeFoodPhoto, hasVision, type DetectedFood } from "../lib/visionApi";
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

  // Fotoğraf analizi durumu
  const photoInput = useRef<HTMLInputElement | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [detected, setDetected] = useState<DetectedFood[] | null>(null);
  const [photoErr, setPhotoErr] = useState("");

  async function onPhoto(file: File) {
    setPhotoErr("");
    if (!hasVision()) {
      setPhotoErr("Önce Profil → Fotoğrafla Kalori bölümünden ücretsiz Gemini anahtarını gir.");
      return;
    }
    setPhotoBusy(true);
    try {
      const img = await fileToDownscaledBase64(file, 1024, 0.8);
      const items = await analyzeFoodPhoto(img);
      if (items.length === 0) setPhotoErr("Fotoğrafta yemek tanınamadı. Daha net bir fotoğraf dene.");
      else setDetected(items);
    } catch (e: any) {
      const m = e?.message || String(e);
      if (m === "no-key") setPhotoErr("Önce Profil'den Gemini anahtarını gir.");
      else if (m === "bad-key") setPhotoErr("Gemini anahtarı geçersiz. Profil'den kontrol et.");
      else setPhotoErr(m);
    } finally {
      setPhotoBusy(false);
    }
  }

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

        <input
          ref={photoInput} type="file" accept="image/*" capture="environment" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = ""; }}
        />
        <div className="row" style={{ gap: 10, margin: "10px 0" }}>
          <button className="btn primary grow" disabled={photoBusy} onClick={() => photoInput.current?.click()}>
            {photoBusy ? "🔍 Analiz ediliyor…" : "📷 Fotoğrafla Ekle"}
          </button>
          <button className="btn ghost grow" onClick={() => setManual(true)}>✍️ Manuel</button>
        </div>
        {photoErr && <div className="syncbar warn" style={{ margin: "0 0 8px" }}>{photoErr}</div>}

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

      {detected && (
        <PhotoReviewSheet
          items={detected} meal={meal} date={date}
          onClose={() => setDetected(null)}
          onSaved={() => nav("/nutrition", { replace: true })}
        />
      )}
    </>
  );
}

// Fotoğraftan tanınan yemekler — düzenlenebilir, sonra günlüğe eklenir.
function PhotoReviewSheet({ items, meal, date, onClose, onSaved }: { items: DetectedFood[]; meal: MealType; date: string; onClose: () => void; onSaved: () => void }) {
  const [rows, setRows] = useState(items.map((d) => ({ ...d, include: true })));
  const [mealSel, setMealSel] = useState<MealType>(meal);

  function patchGrams(i: number, grams: number | null) {
    setRows((rs) => rs.map((r, k) => (k === i ? { ...r, grams: grams ?? 0, portion: scaleMacros(r.per100, grams ?? 0) } : r)));
  }
  function toggle(i: number) {
    setRows((rs) => rs.map((r, k) => (k === i ? { ...r, include: !r.include } : r)));
  }

  const chosen = rows.filter((r) => r.include && r.grams > 0);
  const total = chosen.reduce((a, r) => a + r.portion.kcal, 0);

  async function addAll() {
    for (const r of chosen) {
      const food: Food = { id: uid(), name: r.name, source: "custom", per100: r.per100, updatedAt: Date.now() };
      await save(db.foods, food);
      const entry: FoodLogEntry = {
        id: uid(), date, meal: mealSel, foodName: r.name, grams: r.grams, macros: r.portion, updatedAt: Date.now(),
      };
      await save(db.foodLog, entry);
    }
    onSaved();
  }

  return (
    <Sheet open onClose={onClose} title="📷 Tanınan Yemekler">
      <div className="small muted" style={{ marginBottom: 12 }}>
        Tahmini değerler — gramı düzeltebilir, istemediğini çıkarabilirsin. Kalori bir tahmindir.
      </div>
      <div className="field"><label>Öğün</label>
        <div className="chiprow">
          {(["kahvalti", "ogle", "aksam", "atistirmalik"] as MealType[]).map((m) => (
            <button key={m} className={`chip ${mealSel === m ? "active" : ""}`} onClick={() => setMealSel(m)}>{mealLabel(m)}</button>
          ))}
        </div>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="card tight" style={{ opacity: r.include ? 1 : 0.5 }}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <b className="grow truncate">{r.name}</b>
            <button className={`checkbtn ${r.include ? "on" : ""}`} onClick={() => toggle(i)}>✓</button>
          </div>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <div className="col" style={{ width: 110 }}>
              <span className="tiny muted">Gram</span>
              <NumInput className="input" value={r.grams} onChange={(v) => patchGrams(i, v)} />
            </div>
            <div className="grow center">
              <div className="bold" style={{ fontSize: 18 }}>{r.portion.kcal} kcal</div>
              <div className="tiny muted">P{r.portion.protein} · K{r.portion.carb} · Y{r.portion.fat}</div>
            </div>
          </div>
        </div>
      ))}
      <div className="row between" style={{ margin: "12px 4px" }}>
        <span className="muted">Toplam</span>
        <b>{total} kcal · {chosen.length} öğe</b>
      </div>
      <button className="btn primary block" disabled={chosen.length === 0} onClick={addAll}>Seçilenleri Günlüğe Ekle</button>
    </Sheet>
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
