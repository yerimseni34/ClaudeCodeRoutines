# FitLog 🏋️🍎

Kişisel **antrenman** ve **beslenme/makro** takip uygulaması. Tamamen **offline (internetsiz) çalışır**, internet geldiğinde verilerini **ücretsiz Supabase** bulutuna otomatik yedekler. Android telefonda ana ekrana eklenince **normal bir uygulama gibi** (tam ekran, kendi ikonu) çalışan bir PWA'dır.

## Özellikler

### Antrenman
- **Rutinler** — sık yaptığın antrenmanları kaydet, tek dokunuşla başlat (örnek fotoğraflardaki gibi).
- **Set kaydı** — her egzersiz için set/kg/tekrar, set tipleri: **W** (ısınma), **N** (normal, numaralı), **F** (failure), **D** (drop). "ÖNCE" sütunu son seferki değerleri gösterir.
- **Süre + dinlenme sayacı**, antrenman notları.
- **Geçmiş** — her gün yaptığın antrenman tarihe göre listelenir. Tahmini 1RM hesabı.
- Hazır **egzersiz kütüphanesi** (Türkçe) + kendi egzersizini ekleme.

### Beslenme
- **Yemek arama** — Open Food Facts (ücretsiz, anahtarsız) ile kalori/makro otomatik gelir.
- **Barkod okutma** — paketli ürünün barkodunu kameraya okut, Open Food Facts'ten otomatik gelir. Tamamen ücretsiz (telefonun yerleşik tarayıcısı + açık veritabanı, anahtar gerekmez).
- **Manuel ekleme** — kendi yemeğinin makrolarını gir, kaydet, tekrar kullan.
- Öğünlere göre (kahvaltı/öğle/akşam/atıştırmalık) **günlük kalori ve makro** takibi, hedefe göre kalan/fazla.
- Günlük geçmiş — geçmiş günlere git, o gün ne yediğini gör.

### Fotoğrafla Kalori (AI, opsiyonel)
- Yemek **fotoğrafı** çek → yapay zeka yemekleri tanır, porsiyon (gram) ve kalori/makro **tahmini** verir → düzelt ve günlüğe ekle.
- **Google Gemini**'nin ücretsiz katmanını kullanır (kart gerektirmez). Anahtar Profil'den girilir, yalnızca cihazda saklanır.
- Tahminler yaklaşıktır (±%20-30); paketli ürünler için yemek arama/barkod daha doğrudur.

### Diğer
- **Vücut ağırlığı** takibi + trend grafiği, kalori/makro/kilo **hedefleri**.
- **Yedek indirme** (JSON).

## Veri & Senkron mimarisi
- Tüm veriler önce cihazda **IndexedDB** (Dexie) içinde tutulur → internet olmadan tam çalışır.
- Bulut açıksa, her değişiklik "kirli" işaretlenir; internet geldiğinde Supabase'e **yüklenir** ve diğer cihazlardan gelenler **çekilir** (last-write-wins, `updatedAt`'e göre).
- Bulut bilgileri yalnızca cihazda (localStorage) saklanır; kodda gömülü anahtar yoktur.

---

## Kurulum (geliştirme)
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # üretim derlemesi (dist/)
npm run preview  # derlemeyi önizle
```

## Ücretsiz buluta (Supabase) bağlama
1. [supabase.com](https://supabase.com) → ücretsiz proje oluştur.
2. **SQL Editor**'ı aç, uygulama içindeki Profil → "İlk kurulum SQL'ini göster" bölümündeki SQL'i (veya `src/lib/setupSql.ts`) yapıştırıp çalıştır.
3. **Project Settings → API**'den `Project URL` ve `anon public` anahtarını kopyala.
4. Uygulamada **Profil → Bulut Yedek & Senkron**'a yapıştır, kaydet.
5. E-posta/şifre ile **Kayıt Ol** → **Giriş Yap**. Artık otomatik senkron.

> İstersen Supabase Authentication → Providers → Email'de "Confirm email" seçeneğini kapatarak doğrulama olmadan giriş yapabilirsin.

## Ücretsiz yayına alma (telefondan erişmek için)
Herhangi biri yeterli:
- **Vercel**: repoyu içe aktar → otomatik derler (`npm run build`, çıktı `dist`). `vercel.json` hazır.
- **Netlify**: build komutu `npm run build`, publish dizini `dist`. `_redirects` hazır.
- **GitHub Pages / Cloudflare Pages** de olur.

## Android'e "uygulama" gibi kurma
1. Yayındaki adresi **Chrome** ile aç.
2. Menü (⋮) → **Ana ekrana ekle / Uygulamayı yükle**.
3. Artık ana ekranda kendi ikonuyla, tam ekran, çevrimdışı çalışır.

> İleride gerçek bir `.apk` istersen, bu proje **Capacitor** ile paketlenebilir (`@capacitor/android`). Hiçbir şey baştan yazılmaz; aynı kod APK'ya dönüşür.

## Teknolojiler
React + TypeScript + Vite · Dexie (IndexedDB) · vite-plugin-pwa (Workbox) · Supabase (Auth + Postgres) · Open Food Facts API.
