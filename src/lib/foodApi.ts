import type { Food, Macros } from "./types";
import { uid } from "../db/db";

// Open Food Facts — bedava, anahtarsız yemek veritabanı.
// Türkçe sonuçları önceliklendirmek için arama parametreleri kullanılır.

const BASE = "https://world.openfoodfacts.org";

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_tr?: string;
  brands?: string;
  nutriments?: Record<string, number>;
}

function toMacros(n: Record<string, number> = {}): Macros {
  // OFF değerleri "..._100g" alanlarında, kcal "energy-kcal_100g".
  const kcal = n["energy-kcal_100g"] ?? (n["energy_100g"] ? n["energy_100g"] / 4.184 : 0);
  return {
    kcal: Math.round(kcal || 0),
    protein: round1(n["proteins_100g"] ?? 0),
    carb: round1(n["carbohydrates_100g"] ?? 0),
    fat: round1(n["fat_100g"] ?? 0),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function mapProduct(p: OffProduct): Food | null {
  const name = p.product_name_tr || p.product_name;
  if (!name) return null;
  const per100 = toMacros(p.nutriments);
  if (per100.kcal === 0 && per100.protein === 0 && per100.carb === 0 && per100.fat === 0) return null;
  return {
    id: uid(),
    name: name.trim(),
    brand: p.brands ? p.brands.split(",")[0].trim() : undefined,
    barcode: p.code,
    per100,
    source: "off",
    updatedAt: Date.now(),
  };
}

export async function searchFoods(query: string, signal?: AbortSignal): Promise<Food[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url =
    `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=25` +
    `&fields=code,product_name,product_name_tr,brands,nutriments`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Arama başarısız");
  const data = await res.json();
  const products: OffProduct[] = data.products || [];
  const foods: Food[] = [];
  const seen = new Set<string>();
  for (const p of products) {
    const f = mapProduct(p);
    if (!f) continue;
    const key = (f.name + (f.brand || "")).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    foods.push(f);
  }
  return foods;
}

export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<Food | null> {
  const url = `${BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,product_name_tr,brands,nutriments`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  return mapProduct(data.product);
}
