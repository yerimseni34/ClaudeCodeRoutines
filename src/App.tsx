import { useEffect, useState } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import { ensureSeed } from "./db/db";
import { SyncProvider } from "./state/SyncProvider";
import { useActiveWorkout } from "./state/activeWorkout";

import Home from "./pages/Home";
import WorkoutHome from "./pages/WorkoutHome";
import ActiveWorkout from "./pages/ActiveWorkout";
import History from "./pages/History";
import WorkoutDetail from "./pages/WorkoutDetail";
import RoutineEditor from "./pages/RoutineEditor";
import Exercises from "./pages/Exercises";
import Nutrition from "./pages/Nutrition";
import AddFood from "./pages/AddFood";
import Profile from "./pages/Profile";

const TABS = [
  { to: "/", ic: "🏠", label: "Ana Sayfa", end: true },
  { to: "/workout", ic: "🏋️", label: "Antrenman" },
  { to: "/nutrition", ic: "🍎", label: "Beslenme" },
  { to: "/history", ic: "📅", label: "Geçmiş" },
  { to: "/profile", ic: "👤", label: "Profil" },
];

function TabBar() {
  const loc = useLocation();
  // Aktif antrenman ekranında sekme çubuğunu gizle (tam ekran odak).
  if (loc.pathname.startsWith("/workout/active")) return null;
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `tab ${isActive ? "active" : ""}`}>
          <span className="ic">{t.ic}</span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function ResumeBanner() {
  const active = useActiveWorkout();
  const loc = useLocation();
  if (!active || loc.pathname.startsWith("/workout/active")) return null;
  return (
    <NavLink to="/workout/active" className="syncbar ok" style={{ display: "flex", textDecoration: "none", margin: "8px 16px" }}>
      <span className="dot green" /> Devam eden antrenman: <b style={{ marginLeft: 4 }}>{active.name}</b> — dokun ve devam et →
    </NavLink>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    ensureSeed().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return <div className="empty" style={{ paddingTop: 120 }}><div className="big">🏋️</div>Yükleniyor…</div>;
  }

  return (
    <SyncProvider>
      <div className="app">
        <ResumeBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workout" element={<WorkoutHome />} />
          <Route path="/workout/active" element={<ActiveWorkout />} />
          <Route path="/routine/new" element={<RoutineEditor />} />
          <Route path="/routine/:id" element={<RoutineEditor />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<WorkoutDetail />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/nutrition/add" element={<AddFood />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
      <TabBar />
    </SyncProvider>
  );
}
