import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { db } from "../db/db";
import { TopBar, Empty } from "../components/ui";
import { prettyDate, fmtDuration } from "../lib/date";
import { workoutStats } from "../lib/calc";

export default function History() {
  const workouts = useLiveQuery(
    () => db.workouts.filter((w) => !w.deleted).toArray().then((ws) => ws.sort((a, b) => b.startedAt - a.startedAt)),
    []
  );

  // Tarihe göre grupla.
  const groups: Record<string, typeof workouts> = {};
  (workouts || []).forEach((w) => { (groups[w.date] ||= []).push(w); });
  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  const totalWorkouts = workouts?.length || 0;

  return (
    <>
      <TopBar title="Geçmiş" sub={totalWorkouts > 0 ? `${totalWorkouts} antrenman kaydı` : undefined} />
      <div className="page">
        {workouts && workouts.length === 0 && (
          <Empty icon="📅" text="Henüz antrenman geçmişi yok" hint="Bir antrenman tamamladığında o gün için burada görünecek." />
        )}
        {dates.map((d) => (
          <div key={d}>
            <span className="section-title">{prettyDate(d)}</span>
            {groups[d]!.map((w) => {
              const st = workoutStats(w);
              return (
                <Link key={w.id} to={`/history/${w.id}`} style={{ color: "inherit" }}>
                  <div className="card">
                    <div className="row between">
                      <b>{w.name}</b>
                      <span className="small muted">⏱️ {fmtDuration(w.durationSec)}</span>
                    </div>
                    <div className="small muted" style={{ marginTop: 6 }}>
                      {st.exercises} egzersiz · {st.sets} set · {st.volume.toLocaleString("tr-TR")} kg hacim
                    </div>
                    <div className="small muted truncate" style={{ marginTop: 4 }}>
                      {w.exercises.map((e) => e.name).join(", ")}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
