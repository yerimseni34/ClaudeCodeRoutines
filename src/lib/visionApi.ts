import type { Macros } from "./types";
import type { DownscaledImage } from "./image";

// Google Gemini ile fotoğraftan yemek/kalori tahmini.
// Anahtar yalnızca cihazda (localStorage) saklanır; kodda gömülü değildir.
// Bedava anahtar: https://aistudio.google.com/apikey

const KEY_STORE = "fitlog.gemini.key";
const MODEL_STORE = "fitlog.gemini.model";
const DEFAULT_MODEL = "gemini-2.0-flash";

export function getGeminiKey(): string {
  return localStorage.getItem(KEY_STORE) || "";
}
export function setGeminiKey(k: string) {
  if (k.trim()) localStorage.setItem(KEY_STORE, k.trim());
  else localStorage.removeItem(KEY_STORE);
}
export function getGeminiModel(): string {
  return localStorage.getItem(MODEL_STORE) || DEFAULT_MODEL;
}
export function setGeminiModel(m: string) {
  if (m.trim()) localStorage.setItem(MODEL_STORE, m.trim());
  else localStorage.removeItem(MODEL_STORE);
}
export function hasVision(): boolean {
  return !!getGeminiKey();
}

export interface DetectedFood {
  name: string;
  grams: number;
  per100: Macros; // 100 g başına (porsiyon düzenlenince yeniden hesaplanabilsin diye)
  portion: Macros; // tahmin edilen porsiyon için
}

const PROMPT =
  "Bu fotoğraftaki öğünü bir beslenme uzmanı gibi analiz et. Her ayrı yemek ve içeceği tanı. " +
  "Her biri için porsiyonu gram cinsinden tahmin et ve o porsiyonun kalorisini ve makrolarını " +
  "(protein, karbonhidrat, yağ — gram) hesapla. Pişirme yağı, tereyağı ve sosları da hesaba kat; " +
  "gerçekçi ol. Yemek adlarını TÜRKÇE ver. Tabakta yemek yoksa boş liste döndür.";

const SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      name: { type: "STRING" },
      grams: { type: "NUMBER" },
      kcal: { type: "NUMBER" },
      protein: { type: "NUMBER" },
      carb: { type: "NUMBER" },
      fat: { type: "NUMBER" },
    },
    required: ["name", "grams", "kcal", "protein", "carb", "fat"],
  },
};

export async function analyzeFoodPhoto(img: DownscaledImage, signal?: AbortSignal): Promise<DetectedFood[]> {
  const key = getGeminiKey();
  if (!key) throw new Error("no-key");
  const model = getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: img.mime, data: img.base64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      temperature: 0.2,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 400 && txt.includes("API_KEY")) throw new Error("bad-key");
    if (res.status === 429) throw new Error("Bedava kota dolmuş olabilir, biraz sonra dene.");
    throw new Error(`Gemini hatası (${res.status})`);
  }
  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return [];
  let raw: any[];
  try {
    raw = JSON.parse(text);
  } catch {
    return [];
  }
  return (raw || [])
    .filter((x) => x && x.name)
    .map((x) => {
      const grams = Math.max(1, Number(x.grams) || 0);
      const portion: Macros = {
        kcal: Math.round(Number(x.kcal) || 0),
        protein: r1(Number(x.protein) || 0),
        carb: r1(Number(x.carb) || 0),
        fat: r1(Number(x.fat) || 0),
      };
      const f = 100 / grams;
      const per100: Macros = {
        kcal: Math.round(portion.kcal * f),
        protein: r1(portion.protein * f),
        carb: r1(portion.carb * f),
        fat: r1(portion.fat * f),
      };
      return { name: String(x.name).trim(), grams: Math.round(grams), per100, portion };
    });
}

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}
