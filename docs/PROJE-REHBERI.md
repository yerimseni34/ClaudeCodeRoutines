# FitLog — Proje Rehberi 🏋️🍎

> Bu doküman, repoda zamanla biriken tüm bilgiyi tek yerde toplayıp
> kategorilere ayırır. Amaç: projeye ilk bakan birinin **ne var, nerede,
> nasıl çalışıyor** sorularının tamamına hızlıca yanıt bulması.

FitLog, **offline-first** (internetsiz de tam çalışan) kişisel bir
**antrenman + beslenme takip** uygulamasıdır. Bir PWA'dır; Android telefonda
ana ekrana eklenince tam ekran, kendi ikonuyla, normal bir uygulama gibi
çalışır. İnternet geldiğinde verileri ücretsiz **Supabase** bulutuna otomatik
yedekler.

---

## İçindekiler

1. [Bir bakışta özellikler](#1-bir-bakışta-özellikler)
2. [Teknoloji yığını](#2-teknoloji-yığını)
3. [Mimari](#3-mimari)
4. [Veri modeli](#4-veri-modeli)
5. [Dosya haritası (klasör klasör)](#5-dosya-haritası-klasör-klasör)
6. [Sayfalar ve rotalar](#6-sayfalar-ve-rotalar)
7. [Dış servis entegrasyonları](#7-dış-servis-entegrasyonları)
8. [Senkronizasyon mantığı](#8-senkronizasyon-mantığı)
9. [Kurulum, derleme, yayın](#9-kurulum-derleme-yayın)
10. [Geliştirme geçmişi (commit özeti)](#10-geliştirme-geçmişi-commit-özeti)

---

## 1. Bir bakışta özellikler

### 🏋️ Antrenman
| Özellik | Açıklama |
|---|---|
| **Rutinler** | Sık yapılan antrenmanları kaydet, tek dokunuşla başlat. |
| **Set kaydı** | Egzersiz başına set/kg/tekrar. Set tipleri: **W** ısınma · **N** normal · **F** failure · **D** drop. |
| **"ÖNCE" sütunu** | Her set için önceki seferki değeri gösterir. |
| **Süre + dinlenme sayacı** | Antrenman süresi ve set arası dinlenme geri sayımı. |
| **Geçmiş** | Antrenmanlar tarihe göre listelenir; tahmini **1RM** hesabı. |
| **Egzersiz kütüphanesi** | 45 hazır egzersiz (Türkçe) + kendi egzersizini ekleme. |

### 🍎 Beslenme
| Özellik | Açıklama |
|---|---|
| **Yemek arama** | Open Food Facts (ücretsiz, anahtarsız) ile kalori/makro otomatik gelir. |
| **Barkod okutma** | Paketli ürünün barkodunu kameraya okut → veriler otomatik gelir. |
| **Manuel ekleme** | Kendi yemeğinin makrolarını gir, kaydet, tekrar kullan. |
| **Öğün takibi** | Kahvaltı / öğle / akşam / atıştırmalık bazında günlük kalori & makro. |
| **Günlük geçmiş** | Geçmiş günlere gidip o gün ne yenildiğini gör. |

### 📷 Fotoğrafla Kalori (AI — opsiyonel)
- Yemek fotoğrafı çek → yapay zeka yemekleri tanır, porsiyon (gram) ve
  kalori/makro **tahmini** verir → düzelt ve günlüğe ekle.
- **Google Gemini** ücretsiz katmanını kullanır (kart gerektirmez).
- Varsayılan model: `gemini-2.5-flash`. Anahtar Profil'den girilir, yalnızca
  **cihazda** saklanır.
- Tahminler yaklaşıktır (±%20–30); paketli ürünlerde arama/barkod daha doğrudur.

### 📥 İçe aktarma
- **Hevy / Strong** CSV antrenman geçmişini içe aktarma (Türkçe başlık, set
  tipi ve süre desteğiyle).

### ⚙️ Diğer
- Vücut ağırlığı takibi + trend grafiği.
- Kalori / makro / kilo **hedefleri**.
- **Yedek indirme** (JSON).

---

## 2. Teknoloji yığını

| Katman | Teknoloji |
|---|---|
| UI | **React 18** + **TypeScript** |
| Derleme | **Vite 5** |
| Yönlendirme | **react-router-dom 6** |
| Yerel veritabanı | **Dexie 4** (IndexedDB) + `dexie-react-hooks` |
| PWA / offline | **vite-plugin-pwa** (Workbox) |
| Bulut | **Supabase** (Auth + Postgres) — `@supabase/supabase-js` |
| Yemek verisi | **Open Food Facts** API (ücretsiz, anahtarsız) |
| Görüntü/AI | **Google Gemini** API (opsiyonel) |

Kod boyutu: ~**3.150 satır** TypeScript/TSX, 30 kaynak dosyası.

---

## 3. Mimari

```
┌─────────────────────────────────────────────┐
│  React UI (pages / components)                │
│         │                                     │
│         ▼                                     │
│  Dexie / IndexedDB  ◄── tek gerçeklik kaynağı │
│  (tüm veri önce burada; offline tam çalışır)  │
│         │                                     │
│         ▼  (internet varsa & bulut açıksa)    │
│  Sync katmanı (last-write-wins, updatedAt)    │
│         │                                     │
│         ▼                                     │
│  Supabase (Auth + Postgres)  ── yalnız yedek  │
└─────────────────────────────────────────────┘
```

Temel ilke: **Yerel-öncelik (local-first).** Uygulama internet olmadan
tam çalışır; bulut yalnızca yedek ve cihazlar arası senkron içindir. Gömülü
anahtar yoktur — bulut ve Gemini bilgileri sadece cihazda (`localStorage`)
tutulur.

---

## 4. Veri modeli

Tüm senkronlanabilir kayıtlar `Synced` arayüzünü genişletir:
`id`, `updatedAt` (epoch ms), `deleted?`, `_dirty?` (buluta gönderilmemiş
yerel değişiklik bayrağı). Tanımlar: `src/lib/types.ts`.

| Tip | Alanlar (özet) | Amaç |
|---|---|---|
| **Exercise** | name, muscle, equipment, isCustom | Egzersiz kütüphanesi kaydı |
| **Routine** | name, sortOrder, exercises[] | Kayıtlı antrenman şablonu |
| **Workout** | date, name, startedAt, durationSec, notes, exercises[] | Yapılmış antrenman |
| **Food** | name, brand, barcode, per100 (Macros), source | Yemek tanımı (OFF / custom) |
| **FoodLogEntry** | date, meal, foodName, grams, macros | Öğüne eklenen porsiyon |
| **BodyLogEntry** | date, weightKg, note | Vücut ağırlığı ölçümü |
| **Settings** | name, heightCm, kcal/protein/carb/fat hedefleri, weightGoalKg, restDefaultSec | Kullanıcı ayarları (tekil kayıt `id:"me"`) |

Yardımcı tipler: `SetType = "W" | "N" | "F" | "D"`,
`MealType = "kahvalti" | "ogle" | "aksam" | "atistirmalik"`,
`Macros = { kcal, protein, carb, fat }`, `CloudConfig = { url, anonKey }`.

**IndexedDB şeması** (`src/db/db.ts`, veritabanı adı `fitlog`, v1):
`exercises`, `routines`, `workouts`, `foods`, `foodLog`, `bodyLog`,
`settings` — her tablo `id` + ilgili aramalar için indekslenmiş
(`date`, `barcode`, `_dirty`, `updatedAt` vb.).

**Seed veri** (`src/db/seed.ts`): 45 hazır egzersiz, kas grubuna göre:
Bacak (9), Göğüs (8), Sırt (7), Omuz (5), Biceps (4), Triceps (4),
Karın (4), Kardiyo (3).

---

## 5. Dosya haritası (klasör klasör)

### Kök
| Dosya | Rol |
|---|---|
| `index.html` | Uygulama giriş HTML'i |
| `package.json` | Bağımlılıklar & scriptler (`dev`, `build`, `preview`) |
| `vite.config.ts` | Vite + PWA (Workbox) yapılandırması |
| `tsconfig.json` | TypeScript ayarları |
| `vercel.json` / `public/_redirects` | SPA yönlendirme (Vercel / Netlify) |
| `scripts/generate-icons.mjs` | PWA ikonlarını üretir |

### `src/lib/` — çekirdek mantık
| Dosya | Rol |
|---|---|
| `types.ts` | Tüm veri tipleri |
| `calc.ts` | Kalori/makro toplama, tahmini 1RM hesapları |
| `date.ts` | Tarih yardımcıları (YYYY-MM-DD) |
| `workoutOps.ts` | Antrenman/set işlemleri |
| `foodApi.ts` | Open Food Facts arama + barkod sorgusu |
| `visionApi.ts` | Gemini ile fotoğraftan kalori tahmini |
| `image.ts` | Fotoğrafı yüklemeden önce küçültme |
| `importWorkouts.ts` | Hevy/Strong CSV içe aktarma |
| `setupSql.ts` | Supabase ilk kurulum SQL'i |

### `src/db/` — yerel veritabanı
| Dosya | Rol |
|---|---|
| `db.ts` | Dexie tanımı, tablolar, `uid()` |
| `seed.ts` | Varsayılan egzersiz kütüphanesi |

### `src/sync/` + `src/state/` — bulut & durum
| Dosya | Rol |
|---|---|
| `sync/supabase.ts` | Supabase istemcisi & auth |
| `sync/sync.ts` | Push/pull senkron döngüsü (last-write-wins) |
| `state/SyncProvider.tsx` | Senkron durumunu React'e sağlayan context |
| `state/activeWorkout.ts` | Devam eden antrenman durumu |

### `src/components/` — paylaşılan bileşenler
| Dosya | Rol |
|---|---|
| `ui.tsx` | Ortak UI parçaları (buton, kart, vb.) |
| `ExercisePicker.tsx` | Egzersiz seçme diyaloğu |
| `BarcodeScanner.tsx` | Kamera ile barkod okuyucu |

### `src/` — kök
| Dosya | Rol |
|---|---|
| `main.tsx` | React kök montajı |
| `App.tsx` | Router + tüm rotalar |
| `styles.css` | Global stiller |

---

## 6. Sayfalar ve rotalar

| Rota | Sayfa | İşlev |
|---|---|---|
| `/` | `Home.tsx` | Ana özet ekranı |
| `/workout` | `WorkoutHome.tsx` | Rutin listesi & antrenman başlatma |
| `/workout/active` | `ActiveWorkout.tsx` | Devam eden antrenman (en büyük ekran, ~232 satır) |
| `/routine/new` · `/routine/:id` | `RoutineEditor.tsx` | Rutin oluştur/düzenle |
| `/exercises` | `Exercises.tsx` | Egzersiz kütüphanesi |
| `/history` | `History.tsx` | Antrenman geçmişi listesi |
| `/history/:id` | `WorkoutDetail.tsx` | Tek antrenman detayı |
| `/nutrition` | `Nutrition.tsx` | Günlük beslenme özeti |
| `/nutrition/add` | `AddFood.tsx` | Yemek arama/barkod/manuel/fotoğraf ekleme (~348 satır) |
| `/profile` | `Profile.tsx` | Ayarlar, hedefler, bulut & Gemini, yedek, içe aktarma (~331 satır) |

---

## 7. Dış servis entegrasyonları

| Servis | Amaç | Anahtar? | Ücret |
|---|---|---|---|
| **Open Food Facts** | Yemek arama & barkod → kalori/makro | Hayır | Ücretsiz |
| **Supabase** | Bulut yedek + auth + cihazlar arası senkron | Cihazda saklanan URL + anon key | Ücretsiz katman |
| **Google Gemini** | Fotoğraftan kalori tahmini (opsiyonel) | Cihazda saklanan API anahtarı | Ücretsiz katman |

Not: Gemini istemcisi 429/403/404 hatalarını ayırıp gerçek hata mesajını
kullanıcıya gösterir; anahtar/model `localStorage`'ta tutulur.

---

## 8. Senkronizasyon mantığı

1. Her veri değişikliği önce **IndexedDB**'ye yazılır ve `_dirty = 1` olarak
   işaretlenir → internet olmadan tam çalışır.
2. Bulut açıksa ve internet varsa:
   - **Push:** `_dirty` kayıtlar Supabase'e yüklenir.
   - **Pull:** diğer cihazlardaki değişiklikler çekilir.
3. Çakışma çözümü: **last-write-wins**, `updatedAt` alanına göre.
4. Silmeler `deleted = 1` ile "tombstone" olarak taşınır (gerçekten silinmez),
   böylece silme de senkronlanır.

---

## 9. Kurulum, derleme, yayın

### Geliştirme
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # üretim derlemesi (dist/)
npm run preview  # derlemeyi önizle
```

### Supabase'e bağlama
1. supabase.com → ücretsiz proje.
2. SQL Editor → `src/lib/setupSql.ts` (veya Profil içindeki "İlk kurulum
   SQL'ini göster") içeriğini çalıştır.
3. Project Settings → API → `Project URL` + `anon public` kopyala.
4. Uygulamada **Profil → Bulut Yedek & Senkron**'a yapıştır.
5. E-posta/şifre ile Kayıt Ol → Giriş Yap → otomatik senkron.

### Yayına alma (herhangi biri)
- **Vercel:** repoyu içe aktar → `npm run build`, çıktı `dist` (`vercel.json` hazır).
- **Netlify:** build `npm run build`, publish `dist` (`_redirects` hazır).
- **GitHub / Cloudflare Pages** de olur.

### Android'e "uygulama" gibi kurma
Yayındaki adresi Chrome'da aç → Menü (⋮) → **Ana ekrana ekle / Uygulamayı
yükle**. İleride gerçek `.apk` istenirse aynı kod **Capacitor**
(`@capacitor/android`) ile paketlenebilir.

---

## 10. Geliştirme geçmişi (commit özeti)

Repodaki bilgi şu adımlarla birikti (en yeniden en eskiye):

| Commit | Ne eklendi |
|---|---|
| `509af28` | PWA standalone'da sheet butonları erişilebilirlik düzeltmeleri |
| `9cccd59` | Fotoğraf analizine opsiyonel not/ipucu ekleme |
| `6ac3deb` | Fotoğraf seçici label tabanlı (mobil/PWA güvenilir); varsayılan model `gemini-2.5-flash` |
| `7be16ec` | Gemini gerçek hata mesajını yüzeye çıkarma (429/403/404 ayrımı) |
| `035489a` | İçe aktarıcı: Türkçe başlık/set tipi ve süre desteği |
| `4cb81a7` | Antrenman geçmişi içe aktarma (Hevy/Strong CSV) |
| `bbfa4f6` | Barkod ile yemek ekleme (ücretsiz) |
| `745a02e` | Fotoğraftan kalori tahmini (Gemini, ücretsiz) |
| `90dc709` | **FitLog:** offline-first antrenman & beslenme takip PWA'sı |
| `f3f6df5` | Initial commit |

---

*Bu rehber `docs/PROJE-REHBERI.md` yolunda tutulur; proje büyüdükçe
güncellenmesi önerilir.*
