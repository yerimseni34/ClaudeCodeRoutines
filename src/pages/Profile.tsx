import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, save, softDelete, getSettings, DEFAULT_SETTINGS, uid } from "../db/db";
import { TopBar, NumInput, Bar } from "../components/ui";
import { useSync } from "../state/SyncProvider";
import { getCloudConfig, setCloudConfig, getUser, signIn, signUp, signOut } from "../sync/supabase";
import { resetPullCursor } from "../sync/sync";
import { macrosToKcal } from "../lib/calc";
import { todayKey, prettyDate, shortDate } from "../lib/date";
import { SQL_SETUP } from "../lib/setupSql";
import { getGeminiKey, setGeminiKey, getGeminiModel, setGeminiModel } from "../lib/visionApi";
import type { Settings, BodyLogEntry } from "../lib/types";

export default function Profile() {
  const settings = useLiveQuery(() => getSettings(), []);
  if (!settings) return null;
  return (
    <>
      <TopBar title="Profil & Ayarlar" />
      <div className="page">
        <GoalsCard settings={settings} />
        <WeightCard />
        <VisionCard />
        <CloudCard />
        <AboutCard />
      </div>
    </>
  );
}

function GoalsCard({ settings }: { settings: Settings }) {
  const [s, setS] = useState<Settings>(settings);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setS(settings); }, [settings.updatedAt]);

  const computedKcal = macrosToKcal(s.proteinGoal, s.carbGoal, s.fatGoal);

  async function persist(next: Settings) {
    setS(next);
    await save(db.settings, { ...next });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  return (
    <div className="card">
      <div className="row between"><b>🎯 Hedefler</b>{saved && <span className="pill accent">kaydedildi ✓</span>}</div>
      <div className="hr" />
      <div className="field"><label>Ad</label><input className="input" value={s.name} onChange={(e) => persist({ ...s, name: e.target.value })} /></div>
      <div className="row" style={{ gap: 10 }}>
        <div className="field grow"><label>Boy (cm)</label><NumInput className="input" value={s.heightCm} onChange={(v) => persist({ ...s, heightCm: v })} placeholder="—" /></div>
        <div className="field grow"><label>Hedef Kilo (kg)</label><NumInput className="input" value={s.weightGoalKg} onChange={(v) => persist({ ...s, weightGoalKg: v })} placeholder="—" /></div>
      </div>
      <div className="field"><label>Günlük Kalori Hedefi</label><NumInput className="input" value={s.kcalGoal} onChange={(v) => persist({ ...s, kcalGoal: v || 0 })} /></div>
      <div className="row" style={{ gap: 10 }}>
        <div className="field grow"><label>Protein (g)</label><NumInput className="input" value={s.proteinGoal} onChange={(v) => persist({ ...s, proteinGoal: v || 0 })} /></div>
        <div className="field grow"><label>Karb (g)</label><NumInput className="input" value={s.carbGoal} onChange={(v) => persist({ ...s, carbGoal: v || 0 })} /></div>
        <div className="field grow"><label>Yağ (g)</label><NumInput className="input" value={s.fatGoal} onChange={(v) => persist({ ...s, fatGoal: v || 0 })} /></div>
      </div>
      <div className="small muted">Makrolardan hesaplanan kalori: <b>{computedKcal} kcal</b></div>
      <div className="field" style={{ marginTop: 14 }}><label>Varsayılan Dinlenme (sn)</label><NumInput className="input" value={s.restDefaultSec} onChange={(v) => persist({ ...s, restDefaultSec: v || 0 })} /></div>
    </div>
  );
}

function WeightCard() {
  const weights = useLiveQuery(
    () => db.bodyLog.filter((b) => !b.deleted).toArray().then((a) => a.sort((x, y) => x.date.localeCompare(y.date))),
    []
  );
  const [val, setVal] = useState<number | null>(null);
  const list = weights || [];
  const latest = list[list.length - 1];

  async function addWeight() {
    if (!val || val <= 0) return;
    const today = todayKey();
    const existing = list.find((b) => b.date === today);
    const entry: BodyLogEntry = existing
      ? { ...existing, weightKg: val, updatedAt: Date.now() }
      : { id: uid(), date: today, weightKg: val, updatedAt: Date.now() };
    await save(db.bodyLog, entry);
    setVal(null);
  }

  return (
    <div className="card">
      <b>⚖️ Vücut Ağırlığı</b>
      <div className="hr" />
      <div className="row" style={{ gap: 10, marginBottom: 8 }}>
        <NumInput className="input grow" value={val} onChange={setVal} placeholder={latest ? `Son: ${latest.weightKg} kg` : "kg gir"} />
        <button className="btn primary" onClick={addWeight}>Ekle</button>
      </div>
      {list.length >= 2 && <Sparkline data={list.map((b) => b.weightKg)} />}
      <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 8 }}>
        {[...list].reverse().slice(0, 20).map((b) => (
          <div key={b.id} className="li">
            <span className="grow small">{prettyDate(b.date)}</span>
            <span className="bold">{b.weightKg} kg</span>
            <button className="iconbtn" style={{ width: 32, height: 32, marginLeft: 8 }} onClick={() => softDelete(db.bodyLog, b.id)}>✕</button>
          </div>
        ))}
        {list.length === 0 && <div className="small muted center" style={{ padding: 10 }}>Henüz kayıt yok.</div>}
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 320, h = 56, pad = 4;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={pts.join(" ")} />
    </svg>
  );
}

function VisionCard() {
  const [key, setKey] = useState(getGeminiKey());
  const [model, setModel] = useState(getGeminiModel());
  const [saved, setSaved] = useState(false);

  function persist() {
    setGeminiKey(key);
    setGeminiModel(model);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  return (
    <div className="card">
      <div className="row between">
        <b>📷 Fotoğrafla Kalori (AI)</b>
        <span className="pill" style={{ background: key ? "rgba(34,197,94,0.18)" : undefined, color: key ? "#86efac" : undefined }}>
          {key ? "açık" : "kapalı"}
        </span>
      </div>
      <div className="hr" />
      <div className="small muted" style={{ marginBottom: 12 }}>
        Yemek fotoğrafı çekip kalori/makro tahmini almak için <b>ücretsiz</b> bir Google Gemini anahtarı gir.
        Anahtar yalnızca bu cihazda saklanır. Tahminler yaklaşıktır (±%20-30) — ekledikten önce gramı düzeltebilirsin.
      </div>
      <div className="field"><label>Gemini API Anahtarı</label>
        <input className="input" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="AIza..." />
      </div>
      <div className="field"><label>Model (opsiyonel)</label>
        <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="gemini-2.0-flash" />
      </div>
      <button className="btn ghost block" onClick={persist}>{saved ? "Kaydedildi ✓" : "Kaydet"}</button>
      <a className="tiny" style={{ display: "block", marginTop: 10, textAlign: "center" }}
        href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
        Ücretsiz anahtar al → aistudio.google.com/apikey
      </a>
    </div>
  );
}

function CloudCard() {
  const { sync, status, lastResult, pending, online, cloudEnabled } = useSync();
  const cfg = getCloudConfig();
  const [url, setUrl] = useState(cfg?.url || "");
  const [key, setKey] = useState(cfg?.anonKey || "");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [showSql, setShowSql] = useState(false);

  useEffect(() => { getUser().then((u) => setUser(u?.email || null)); }, [status, cloudEnabled]);

  function saveCfg() {
    setCloudConfig(url.trim() && key.trim() ? { url: url.trim(), anonKey: key.trim() } : null);
    setMsg("Bulut bilgileri kaydedildi.");
    setTimeout(() => { setMsg(""); window.location.reload(); }, 600);
  }

  async function doAuth(kind: "in" | "up") {
    setBusy(true); setMsg("");
    try {
      if (kind === "in") await signIn(email.trim(), pw);
      else { await signUp(email.trim(), pw); setMsg("Kayıt oldu. E-postanı doğrula veya direkt giriş yap."); }
      const u = await getUser();
      setUser(u?.email || null);
      resetPullCursor();
      sync();
    } catch (e: any) {
      setMsg("Hata: " + (e?.message || e));
    } finally { setBusy(false); }
  }

  async function doSignOut() { await signOut(); setUser(null); }

  return (
    <div className="card">
      <div className="row between">
        <b>☁️ Bulut Yedek & Senkron</b>
        <span className="pill" style={{ background: cloudEnabled ? "rgba(34,197,94,0.18)" : undefined, color: cloudEnabled ? "#86efac" : undefined }}>
          {cloudEnabled ? (user ? "bağlı" : "giriş gerekli") : "kapalı"}
        </span>
      </div>
      <div className="hr" />

      <div className="small muted" style={{ marginBottom: 12 }}>
        Veriler her zaman cihazında saklanır ve internet olmadan çalışır. Buraya kendi <b>ücretsiz Supabase</b> projenin bilgilerini girersen, internet geldikçe otomatik yedeklenir.
      </div>

      <div className="field"><label>Supabase Project URL</label><input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" /></div>
      <div className="field"><label>Anon (public) Key</label><input className="input" value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJ..." /></div>
      <button className="btn ghost block" onClick={saveCfg}>Bulut Bilgilerini Kaydet</button>

      {cloudEnabled && !user && (
        <>
          <div className="hr" />
          <div className="field"><label>E-posta</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field"><label>Şifre</label><input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn primary grow" disabled={busy} onClick={() => doAuth("in")}>Giriş Yap</button>
            <button className="btn ghost grow" disabled={busy} onClick={() => doAuth("up")}>Kayıt Ol</button>
          </div>
        </>
      )}

      {cloudEnabled && user && (
        <>
          <div className="hr" />
          <div className="row between small"><span className="muted">Giriş:</span><b>{user}</b></div>
          <div className="row between small" style={{ marginTop: 6 }}>
            <span className="muted">Durum:</span>
            <span>{online ? (status === "syncing" ? "senkronlanıyor…" : pending > 0 ? `${pending} bekliyor` : "güncel ✓") : "çevrimdışı"}</span>
          </div>
          {lastResult && !lastResult.error && <div className="tiny muted" style={{ marginTop: 4 }}>Son senkron: ↑{lastResult.pushed} ↓{lastResult.pulled}</div>}
          {lastResult?.error && <div className="syncbar err" style={{ marginTop: 8 }}>{lastResult.error}</div>}
          <div className="row" style={{ gap: 10, marginTop: 12 }}>
            <button className="btn primary grow" onClick={() => sync()}>Şimdi Senkronla</button>
            <button className="btn danger grow" onClick={doSignOut}>Çıkış</button>
          </div>
        </>
      )}

      {msg && <div className="syncbar warn" style={{ marginTop: 10 }}>{msg}</div>}

      <button className="btn ghost block sm" style={{ marginTop: 12 }} onClick={() => setShowSql((v) => !v)}>
        {showSql ? "Kurulum SQL’ini gizle" : "📋 İlk kurulum: Supabase SQL’ini göster"}
      </button>
      {showSql && (
        <>
          <div className="tiny muted" style={{ margin: "8px 0" }}>
            Supabase panelinde <b>SQL Editor</b>’ı aç, aşağıdakini yapıştırıp çalıştır. Sonra yukarıdan URL + anon key gir ve giriş yap.
          </div>
          <pre style={{ background: "var(--bg-2)", padding: 12, borderRadius: 10, overflowX: "auto", fontSize: 11, border: "1px solid var(--line)" }}>{SQL_SETUP}</pre>
          <button className="btn ghost block sm" onClick={() => { navigator.clipboard?.writeText(SQL_SETUP); }}>SQL’i kopyala</button>
        </>
      )}
    </div>
  );
}

function AboutCard() {
  const counts = useLiveQuery(async () => ({
    w: await db.workouts.filter((x) => !x.deleted).count(),
    f: await db.foodLog.filter((x) => !x.deleted).count(),
    r: await db.routines.filter((x) => !x.deleted).count(),
  }), []);

  async function exportData() {
    const data = {
      exercises: await db.exercises.toArray(),
      routines: await db.routines.toArray(),
      workouts: await db.workouts.toArray(),
      foods: await db.foods.toArray(),
      foodLog: await db.foodLog.toArray(),
      bodyLog: await db.bodyLog.toArray(),
      settings: await db.settings.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fitlog-yedek-${todayKey()}.json`;
    a.click();
  }

  return (
    <div className="card">
      <b>📦 Veri</b>
      <div className="hr" />
      <div className="small muted" style={{ marginBottom: 10 }}>
        {counts ? `${counts.w} antrenman · ${counts.f} yemek kaydı · ${counts.r} rutin` : "…"}
      </div>
      <button className="btn ghost block" onClick={exportData}>⬇️ Yedeği indir (JSON)</button>
      <div className="tiny muted center" style={{ marginTop: 14 }}>FitLog · kişisel antrenman & beslenme · offline-first</div>
    </div>
  );
}
