import React from "react";
import { useNavigate } from "react-router-dom";

export function TopBar({ title, sub, back, right }: { title: string; sub?: string; back?: boolean; right?: React.ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="topbar">
      {back && (
        <button className="iconbtn" onClick={() => nav(-1)} aria-label="Geri">←</button>
      )}
      <div className="grow">
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function Bar({ value, max, variant }: { value: number; max: number; variant?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = max > 0 && value > max;
  return (
    <div className={`bar ${over ? "over" : variant || ""}`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="handle" />
        {title && <h2 style={{ margin: "0 0 14px", fontSize: 18 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function Empty({ icon, text, hint }: { icon: string; text: string; hint?: string }) {
  return (
    <div className="empty">
      <div className="big">{icon}</div>
      <div className="bold">{text}</div>
      {hint && <div className="small muted" style={{ marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

// Sayısal giriş — boş bırakılabilir, ondalık destekler.
export function NumInput({
  value, onChange, placeholder, className, step,
}: { value: number | null; onChange: (v: number | null) => void; placeholder?: string; className?: string; step?: string }) {
  return (
    <input
      className={className || "numbox"}
      type="number"
      inputMode="decimal"
      step={step || "any"}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? null : Number(v));
      }}
    />
  );
}

export function muscleEmoji(m: string): string {
  const map: Record<string, string> = {
    "Göğüs": "🫁", "Sırt": "🔙", "Omuz": "💪", "Biceps": "💪", "Triceps": "💪",
    "Bacak": "🦵", "Karın": "🧘", "Kardiyo": "🏃",
  };
  return map[m] || "🏋️";
}

export function mealLabel(m: string): string {
  return ({ kahvalti: "Kahvaltı", ogle: "Öğle", aksam: "Akşam", atistirmalik: "Atıştırmalık" } as Record<string, string>)[m] || m;
}

export function mealEmoji(m: string): string {
  return ({ kahvalti: "🌅", ogle: "☀️", aksam: "🌙", atistirmalik: "🍎" } as Record<string, string>)[m] || "🍽️";
}
