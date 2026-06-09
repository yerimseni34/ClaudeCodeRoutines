import { useEffect, useState } from "react";
import type { Workout } from "../lib/types";

// Aktif (devam eden) antrenman localStorage'da tutulur — uygulama kapanıp açılsa bile sürer.
const KEY = "fitlog.activeWorkout";
const EVT = "fitlog.activeWorkout.change";

export function getActive(): Workout | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Workout) : null;
  } catch {
    return null;
  }
}

export function setActive(w: Workout | null) {
  if (w) localStorage.setItem(KEY, JSON.stringify(w));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
}

export function useActiveWorkout() {
  const [active, setState] = useState<Workout | null>(getActive());
  useEffect(() => {
    const handler = () => setState(getActive());
    window.addEventListener(EVT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return active;
}
