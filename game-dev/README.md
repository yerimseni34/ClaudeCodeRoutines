# 🎮 Oyun Geliştirme Araştırma Arşivi

Bu klasör, bir süredir bu repoda **onlarca ayrı branch'e dağılmış** olarak
biriken tüm oyun geliştirme araştırmasını tek yerde toplar, kategorilere ayırır
ve okunabilir hâle getirir. Her rapor daha önce ayrı bir zamanlanmış çalışmanın
(scheduled task) çıktısıydı; burada hepsi tarih sırasına ve konusuna göre
düzenlenmiştir.

> **Bağlam / hedef kitle:** Tüm raporlar tek bir profil için üretilmiş:
> **solo Unity geliştiricisi, ~1–2 yıl deneyim, hâlihazırda bir *wave survival
> shooter* (dalga hayatta kalma nişancı) yapıyor.** Rakip takibi ve oyun
> fikirleri bu tür etrafında; pazar raporları ve araç radarı ise genel indie
> ekosistemini bu geliştiricinin gözünden tarıyor.

---

## Kategoriler

| Kategori | Ne işe yarar | Periyot | Rapor sayısı |
|---|---|---|---|
| [📊 Pazar Raporları](#-pazar-raporları-market-reports) | Öne çıkan indie oyunların neden tuttuğunu çözümler | Aylık | 8 |
| [🔭 Rakip Takibi](#-rakip-takibi-competitor-watch) | Wave-survival/roguelite türünde haftalık rakip istihbaratı | Haftalık | 8 |
| [💡 Oyun Fikirleri](#-oyun-fikirleri-game-ideas) | Geliştiricinin beceri setine uygun oyun konseptleri | Haftalık | 8 |
| [🛠️ Araç Radarı](#️-araç-radarı-tool-radar) | Yeni çıkan (çoğu AI) oyun geliştirme araçları | Aylık | 8 |

**Toplam: 32 rapor.** Aynı döneme ait birden çok rapor (ör. dört ayrı "Haziran
pazar raporu") bağımsız çalışmaların çıktısıdır ve **farklı oyunları/araçları**
kapsar — o yüzden hiçbiri silinmedi; hepsi `-a`, `-b`, `-c`, `-d` son ekleriyle
korundu (`-a` en kapsamlı sürüm).

---

## 📊 Pazar Raporları (`market-reports/`)

Öne çıkan indie oyunların satış/karşılama verileri ve **neden başarılı ya da
başarısız olduklarının** çözümlemesi. Solo geliştirici için çıkarımlarla biter.

| Rapor | Dönem | Kapsadığı oyunlar / odak |
|---|---|---|
| [`2026-05.md`](market-reports/2026-05.md) | Mayıs 2026 | Dead As Disco (ritim dövüş, "My Music" viral mekaniği) ve dönemin diğer çıkışları |
| [`2026-06-a.md`](market-reports/2026-06-a.md) | Haziran 2026 | **En kapsamlı sürüm** — Oyun profilleri, "$19.99 tezi", Steam Next Fest önizlemesi, piyasa için kırmızı bayraklar |
| [`2026-06-b.md`](market-reports/2026-06-b.md) | Haziran 2026 | Meccha Chameleon, GRAIN ROT, Granny's Rampage, Trees Hate You, Gambonanza, Maze Creep!! |
| [`2026-06-c.md`](market-reports/2026-06-c.md) | Haziran 2026 | Meccha Chameleon, Shift At Midnight, BOMBANANA!, Cursemark, Forbidden Solitaire, Sledding Game |
| [`2026-06-d.md`](market-reports/2026-06-d.md) | Haziran 2026 | Meccha Chameleon, Cursemark, Maze Creep!!, Sledding Game, Tangy TD, Super Battle Golf |
| [`2026-07-a.md`](market-reports/2026-07-a.md) | Temmuz 2026 | Meccha Chameleon, MOLE, BOMBANANA!, over the hill, Far Far West, ShantyTown |
| [`2026-07-b.md`](market-reports/2026-07-b.md) | Temmuz 2026 | Meccha Chameleon, Dragon Kisser, Maseylia, 2 Fights in 2 Tight Spaces, Our Wonderland, Casualties: Unknown |
| [`2026-07-c.md`](market-reports/2026-07-c.md) | Temmuz 2026 | Meccha Chameleon, Beatdown City Survivors, Granny's Rampage, Cat Squeeze, Storebound, Deer & Boy |

---

## 🔭 Rakip Takibi (`competitor-watch/`)

Wave-survival nişancı, roguelite aksiyon, top-down/izometrik aksiyon ("bullet
heaven" / survivors-like) türlerinde **haftalık** rakip istihbaratı: yeni
çıkışlar, demolar, Steam Next Fest hareketleri, satış/karşılama sinyalleri.

| Rapor | Hafta | Aralık |
|---|---|---|
| [`2026-W23.md`](competitor-watch/2026-W23.md) | 2026-W23 | 29 May – 5 Haz |
| [`2026-W24.md`](competitor-watch/2026-W24.md) | 2026-W24 | 8 – 14 Haz |
| [`2026-W25.md`](competitor-watch/2026-W25.md) | 2026-W25 | 12 – 19 Haz (Steam Next Fest ağırlıklı) |
| [`2026-W26.md`](competitor-watch/2026-W26.md) | 2026-W26 | 19 – 26 Haz (Next Fest / Bullet Fest sonrası) |
| [`2026-W27.md`](competitor-watch/2026-W27.md) | 2026-W27 | 27 Haz – 3 Tem |
| [`2026-W28.md`](competitor-watch/2026-W28.md) | 2026-W28 | 3 – 10 Tem |
| [`2026-W29.md`](competitor-watch/2026-W29.md) | 2026-W29 | 10 – 17 Tem |
| [`2026-W30.md`](competitor-watch/2026-W30.md) | 2026-W30 | 17 – 24 Tem |

---

## 💡 Oyun Fikirleri (`game-ideas/`)

Geliştiricinin mevcut becerilerine (dalga spawn, object pooling, upgrade
meta-loop, hasar sayıları, "juice") **transfer edilebilir** oyun konseptleri.
Tür sıçraması değil, komşu-adjacency fikirler; her biri o hafta için taze.

| Rapor | Tarih |
|---|---|
| [`2026-06-08.md`](game-ideas/2026-06-08.md) | 8 Haziran 2026 |
| [`2026-06-15.md`](game-ideas/2026-06-15.md) | 15 Haziran 2026 |
| [`2026-06-22.md`](game-ideas/2026-06-22.md) | 22 Haziran 2026 |
| [`2026-06-29.md`](game-ideas/2026-06-29.md) | 29 Haziran 2026 |
| [`2026-07-06.md`](game-ideas/2026-07-06.md) | 6 Temmuz 2026 |
| [`2026-07-13.md`](game-ideas/2026-07-13.md) | 13 Temmuz 2026 |
| [`2026-07-20.md`](game-ideas/2026-07-20.md) | 20 Temmuz 2026 |
| [`2026-07-27.md`](game-ideas/2026-07-27.md) | 27 Temmuz 2026 |

---

## 🛠️ Araç Radarı (`tool-radar/`)

Son ~30 günde çıkan oyun geliştirme araçları — 3D/2D asset üretimi, karakter &
animasyon AI, kodlama asistanları, prosedürel üretim, ses/seslendirme —
geliştiricinin mevcut iş akışına **doğrudan yükseltme** olanları işaretleyerek.

| Rapor | Dönem | Not |
|---|---|---|
| [`2026-06-a.md`](tool-radar/2026-06-a.md) | Haziran 2026 | **En kapsamlı** (15 May – 15 Haz penceresi, kategori kategori) |
| [`2026-06-b.md`](tool-radar/2026-06-b.md) | Haziran 2026 | AI & AI-olmayan araçlar + yükseltme özeti |
| [`2026-06-c.md`](tool-radar/2026-06-c.md) | Haziran 2026 | Yükseltme adayları + kaynaklar |
| [`2026-06-d.md`](tool-radar/2026-06-d.md) | Haziran 2026 | Önce okunacak seçkiler + doğrudan yükseltme bayrakları |
| [`2026-07-a.md`](tool-radar/2026-07-a.md) | Temmuz 2026 | **En kapsamlı** — "bu hafta yap" yükseltme listesiyle |
| [`2026-07-b.md`](tool-radar/2026-07-b.md) | Temmuz 2026 | İşaretli iş akışlarına doğrudan yükseltmeler |
| [`2026-07-c.md`](tool-radar/2026-07-c.md) | Temmuz 2026 | Kategori kategori AI + Unity eklentileri |
| [`2026-07-d.md`](tool-radar/2026-07-d.md) | Temmuz 2026 | Yönetici özeti + hazır-olmayan/uyarılar |

---

## Bu arşiv nasıl oluştu?

Raporlar aşağıdaki branch gruplarına dağılmıştı; hepsi buraya kopyalandı ve
tarih/kategoriye göre yeniden adlandırıldı (içerik birebir korundu):

| Branch grubu | Kategori | Klasör |
|---|---|---|
| `claude/charming-hypatia-*` | Pazar raporları | `market-reports/` |
| `claude/keen-carson-*` | Rakip takibi | `competitor-watch/` |
| `claude/practical-gates-*` | Oyun fikirleri | `game-ideas/` |
| `claude/wonderful-hamilton-*` | Araç radarı | `tool-radar/` |

*Not: `claude/fitness-nutrition-tracker-*` ve bu branch'in tabanındaki FitLog
kodu oyun geliştirmeyle ilgili değildir; bu arşive dâhil edilmemiştir.*
