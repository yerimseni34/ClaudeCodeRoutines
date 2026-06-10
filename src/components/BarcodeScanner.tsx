import { useEffect, useRef, useState } from "react";
import { Sheet } from "./ui";

// Barkod okuyucu — telefonun kamerası + tarayıcının yerleşik BarcodeDetector'ı.
// Ekstra servis/anahtar gerektirmez, tamamen ücretsiz. Desteklenmeyen tarayıcılarda
// elle barkod numarası girme seçeneği sunulur.

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"];

export function BarcodeScanner({ open, onClose, onDetect }: { open: boolean; onClose: () => void; onDetect: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [err, setErr] = useState("");
  const [supported, setSupported] = useState(true);
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!open) return;
    const Detector = (window as any).BarcodeDetector;
    let cancelled = false;

    async function start() {
      if (!Detector) { setSupported(false); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        const detector = new Detector({ formats: FORMATS });
        const tick = async () => {
          if (cancelled) return;
          try {
            const codes = await detector.detect(video);
            if (codes && codes.length > 0) {
              const value = codes[0].rawValue;
              if (value) { stop(); onDetect(value); return; }
            }
          } catch { /* kare okunamadı, devam */ }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e: any) {
        if (e?.name === "NotAllowedError") setErr("Kamera izni verilmedi.");
        else setErr("Kamera açılamadı.");
      }
    }
    function stop() {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title="📦 Barkod Okut">
      {supported ? (
        <>
          <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", background: "#000", aspectRatio: "4/3", marginBottom: 12 }}>
            <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: "30% 12% auto 12%", height: "40%", border: "2px solid rgba(59,130,246,0.9)", borderRadius: 12, boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)" }} />
          </div>
          <div className="small muted center">Barkodu çerçeveye getir — otomatik okunur.</div>
          {err && <div className="syncbar err" style={{ marginTop: 10 }}>{err}</div>}
        </>
      ) : (
        <div className="syncbar warn" style={{ marginBottom: 12 }}>Bu cihazda otomatik okuma desteklenmiyor — barkod numarasını elle girebilirsin.</div>
      )}

      <div className="hr" />
      <div className="field"><label>Barkod numarasını elle gir</label>
        <input className="input" inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))} placeholder="8690…" />
      </div>
      <button className="btn primary block" disabled={manual.length < 6} onClick={() => onDetect(manual)}>Ara</button>
    </Sheet>
  );
}
