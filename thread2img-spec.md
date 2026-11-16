# Spec — Threads Card Generator (aplikasi "thread2img")

**Status:** Draft untuk implementasi
**Tanggal:** 16 November 2026
**Nama kerja:** ThreadCard (placeholder, belum final)
**Stack:** Next.js 16 (App Router) + Tailwind CSS 4 + TypeScript
**Target:** MVP cepat, gratis, tanpa login
**Referensi produk:** https://thread2img.app/

---

## 1. Ringkasan

Aplikasi web gratis tanpa login yang mengubah **post Threads publik** menjadi **gambar kartu bergaya mockup Threads**. Pengguna menempel URL post, aplikasi mengambil teks, profil, waktu, angka interaksi, dan media, lalu merendernya menjadi kartu yang bisa dikustomisasi (tema, warna, font, ukuran teks, padding), dipilih rasionya, dan diekspor sebagai PNG.

Fitur pembeda dari tool sejenis:

- Mockup Threads yang rapi (avatar, nama, handle, verified badge, teks, media, bar interaksi).
- Dukungan **thread multi-post** sebagai slide terpisah, dengan unduh semua berurutan.
- **Bilingual ID/EN** dengan toggle.
- **Copy image ke clipboard** untuk paste langsung ke chat/IG.
- Tampilan aplikasi minimalis hitam-putih, brand sendiri (bukan clone visual 1:1).
- Tanpa QR code, tanpa watermark, tanpa akun, tanpa analytics.

---

## 2. Konteks & hasil riset

### 2.1 Referensi

thread2img.app adalah tool asal Korea dengan alur: tempel URL Threads (atau klik contoh) → atur gaya → unduh gambar. Referensi menyediakan opsi "QR 코드 포함하기" (sertakan QR code). Kita mengambil **fungsi dan alurnya**, bukan identitas visualnya.

### 2.2 Temuan kritis: oEmbed resmi tidak cukup

Diuji pada 16 November 2026 terhadap post publik `@meta`:

```
GET https://graph.threads.com/oembed?url=https://www.threads.com/@meta/post/DDzbnVKx57R
```

Respons hanya berisi 6 field: `type`, `version`, `html`, `provider_name`, `provider_url`, `width`. Nilai `html` adalah blockquote "View on Threads" + `<script src=".../embed.js">`.

**Tidak ada** teks post, username, avatar, timestamp, angka like/reply/repost, atau URL media di respons oEmbed. oEmbed adalah cara *menampilkan* post, bukan cara *membaca* post.

Konsekuensi: alur inti **tidak bisa** dibangun hanya dengan oEmbed. Berdasarkan keputusan wawancara, data diambil dengan **scraping halaman post publik** lewat serverless function, dengan fallback ke mode manual.

### 2.3 Kelayakan scraping

Halaman post publik (`threads.com/@user/post/{shortcode}`) memuat teks, author, tanggal, angka interaksi, dan media. Halaman dirender client-side, sehingga `fetch` biasa bisa menerima shell kosong. Strategi yang perlu diuji di spike:

1. Fetch halaman post dengan header browser lengkap (UA Chrome desktop, `Accept-Language`, `Accept`), lalu parse JSON di `<script type="application/json" data-sjs>` (payload `thread_items`).
2. Jika kosong/diblokir, coba UA `facebookexternalhit/1.1` (varian SSR untuk crawler).
3. Fallback terakhir: parse `og:title` / `og:description` (biasanya hanya teks, tanpa angka/avatar).
4. Jika semua gagal: tampilkan error + mode manual.

Catatan: ini akses tidak resmi. Meta dapat mengubah markup, memblokir IP datacenter, atau membatasi akses. Spec ini memperlakukan scraping sebagai **best-effort**, bukan jaminan. Tidak ada headless browser di MVP.

### 2.4 Versi paket yang tersedia saat spec ditulis

| Paket | Versi |
|---|---|
| `next` | 16.4.6 |
| `tailwindcss` | 4.3.5 |
| `modern-screenshot` | 4.7.0 |
| `html-to-image` | 1.11.13 (alternatif) |

Rekomendasi render: **`modern-screenshot`** (penanganan font dan gambar lebih baik), dengan `html-to-image` sebagai cadangan jika ada masalah.

### 2.5 Keputusan wawancara (sudah dikunci)

| Topik | Keputusan |
|---|---|
| Input konten | Tempel URL Threads; teks/handle/nama tetap bisa diedit |
| Bentuk kartu | Mockup post Threads (bukan kartu kutipan) |
| Multi-post | Slide terpisah + tombol unduh semua |
| Kemiripan referensi | Fungsi sama, brand dan tampilan sendiri |
| Bahasa UI | Bilingual ID/EN dengan toggle |
| Kustomisasi | Preset tema + kontrol dasar (warna, font, ukuran teks, padding) |
| Ukuran | 1:1, 4:5, 9:16, dan auto-height |
| QR code | Tidak perlu |
| Elemen yang bisa diatur | Like/reply/repost, timestamp, avatar, verified badge, mention/hashtag |
| Watermark aplikasi | Tidak ada |
| Media post | Disertakan; carousel ditampilkan sebagai grid semua gambar |
| Stack | Next.js + Tailwind |
| Render gambar | Client-side |
| Sumber data | Scraping halaman publik (setelah oEmbed terbukti tidak cukup) |
| Error handling | Pesan jelas + fallback mode manual |
| Backend | Serverless function diperbolehkan |
| Model produk | Gratis, tanpa login |
| Arah visual | Minimalis hitam-putih |
| Fitur tambahan | Hanya copy ke clipboard |
| Timeline | Secepatnya (MVP) |
| Teks panjang | Potong dengan "Selengkapnya" seperti feed Threads |
| Unduh semua | Unduh berurutan (bukan ZIP) |
| Analytics | Tidak ada |
| Audiens utama | Kreator konten |

---

## 3. Tujuan dan non-tujuan

### 3.1 Tujuan MVP

1. Pengguna bisa menempel URL post Threads publik dan melihat preview kartu dalam < 5 detik (p95, koneksi normal).
2. Preview dan hasil ekspor identik (WYSIWYG).
3. Pengguna bisa mengubah tampilan dasar dan konten, lalu mengunduh PNG pada rasio yang dipilih.
4. Thread multi-post bisa diekspor sebagai beberapa slide.
5. Semua UI tersedia dalam Bahasa Indonesia dan Inggris.
6. Tidak ada data pengguna yang disimpan di server.

### 3.2 Non-tujuan (tidak dikerjakan di MVP)

- Login, akun, database, riwayat, atau penyimpanan server.
- Pembayaran, langganan, iklan, atau watermark.
- QR code.
- Galeri contoh bawaan, Web Share API, unduh ZIP.
- Analytics/pelacakan apa pun.
- Generate atau menulis ulang teks dengan AI.
- Dukungan video penuh (hanya poster/thumbnail).
- Editor penuh: gradient background, upload font, shadow, logo upload.
- Aplikasi mobile native / PWA installable.
- Multi-bahasa selain ID/EN.
- Dukungan post privat atau akun yang butuh login.

---

## 4. Persona & use case

**Persona utama:** kreator konten Indonesia yang aktif di Threads dan ingin memindahkan konten ke Instagram/TikTok/WhatsApp.

**Jobs to be done:**

- "Saya punya post Threads yang lucu/insightful; saya mau jadikan gambar untuk Story/feed."
- "Saya mau membuat beberapa slide dari satu thread tanpa screenshot manual."
- "Saya mau hasilnya rapi dan bisa langsung saya tempel ke chat."
- "Saya mau mengatur warna dan font agar cocok dengan feed saya."

**Skenario utama:**

1. Kreator melihat post Threads miliknya atau orang lain (publik), copy link.
2. Buka ThreadCard, tempel link, klik "Buat gambar".
3. Pilih tema dan rasio, edit teks bila perlu.
4. Unduh PNG atau copy ke clipboard.
5. Jika thread: pindah antar slide, unduh semua berurutan.

---

## 5. Alur pengguna

### 5.1 Happy path

1. **Landing/empty state**
   - Judul, subjudul, input URL, tombol utama.
   - Toggle bahasa di header.
   - Footer berisi catatan legal singkat.
2. **Submit URL**
   - Validasi format di client.
   - Loading state: skeleton kartu + tombol disabled.
   - Request ke `/api/fetch-post`.
3. **Berhasil**
   - Preview kartu tampil.
   - Panel kontrol muncul (desktop: kanan; mobile: di bawah preview).
   - Jika thread > 1 post: tab slide muncul.
4. **Edit**
   - Perubahan setting langsung terlihat di preview (tanpa tombol apply).
   - Edit teks/nama/handle/angka per slide.
5. **Ekspor**
   - Pilih rasio.
   - Unduh slide aktif, unduh semua, atau copy ke clipboard.
   - Toast sukses/gagal.
6. **Reset**
   - Tombol "Post lain" mengosongkan state dan kembali ke empty state.

### 5.2 Alur error

1. URL tidak valid → pesan inline di bawah input, tidak ada request.
2. Post privat/dihapus/diblokir → kartu error dengan kode + penjelasan.
3. Scraping gagal/timeout → error + tombol "Coba lagi" + "Isi manual".
4. Mode manual → form kosong (atau terisi sebagian) untuk nama, handle, teks, angka, avatar opsional; preview tetap bisa dibuat dan diekspor.
5. Error ekspor (canvas/CORS) → toast dengan saran "Coba lagi" / "Unduh per slide".

---

## 6. Detail fitur

### 6.1 Input URL

Format yang diterima:

| Format | Contoh |
|---|---|
| Post dengan username | `https://www.threads.com/@username/post/ABC123xyz` |
| Post dengan username (threads.net) | `https://www.threads.net/@username/post/ABC123xyz` |
| Short link | `https://www.threads.com/t/ABC123xyz` |
| Tanpa protokol | `threads.com/@username/post/ABC123xyz` |
| Share link dengan query | `...?xmt=AQG...&utm_source=...` |

Aturan:

- Normalisasi ke `https://www.threads.com/t/{shortcode}` untuk fetch.
- Buang query, hash, dan trailing slash.
- Hanya izinkan host `threads.com`, `www.threads.com`, `threads.net`, `www.threads.net`.
- Tolak URL profil (`/@user`) dan URL non-post dengan pesan "Itu bukan link post".
- Input menerima paste; Enter mengirim; tombol utama disabled saat kosong/loading.
- Tidak ada tombol "paste from clipboard" (di luar cakupan).

### 6.2 Pengambilan & parsing data

Route serverless: `GET /api/fetch-post?url=...`

Urutan:

1. Normalisasi URL, ekstrak `shortcode`.
2. Cek cache server (10 menit, key = shortcode).
3. Fetch halaman post (timeout 8 detik) dengan header browser.
4. Parse payload JSON (`data-sjs`) → cari `thread_items`.
5. Ekstrak post target + kandidat thread (lihat §11).
6. Jika teks tidak ditemukan, coba UA crawler.
7. Jika masih gagal, coba `og:title`/`og:description`.
8. Kembalikan data atau error terstruktur.

Yang diambil per post:

- `shortcode`, URL kanonik.
- Author: username, display name, avatar URL, verified.
- Teks lengkap.
- Timestamp.
- Counts: like, reply, repost, share/quote (jika tersedia).
- Media: daftar gambar (dan poster video).
- Flag `isReply` dan urutan thread.

### 6.3 Preview kartu (mockup Threads)

Anatomi kartu (lebar logis 1080 px):

```
┌──────────────────────────────────────────────┐
│  (avatar 80)  Nama Tampilan  ✓               │
│               @username · 20 Des 2024        │
│                                              │
│  Teks post di sini, mengalir beberapa baris  │
│  dengan mention @user dan #hashtag berwarna. │
│                                              │
│  ┌────────────────┐ ┌────────────────┐       │
│  │    media 1     │ │    media 2     │       │
│  └────────────────┘ └────────────────┘       │
│                                              │
│  ♡ 919    ◯ 157    ⟳ 54    ↗ 24              │
└──────────────────────────────────────────────┘
```

Spesifikasi default:

| Elemen | Nilai |
|---|---|
| Padding kartu | 64 px |
| Radius kartu | 24 px |
| Avatar | 80 px, lingkaran |
| Nama | 30 px, weight 600 |
| Verified badge | 26 px, di kanan nama |
| Handle + timestamp | 26 px, warna muted |
| Teks | 40 px, line-height 1.4 |
| Jarak antar blok | 24–32 px |
| Media radius | 20 px |
| Grid carousel | 2 kolom, gap 8 px, crop persegi |
| Ikon aksi | 34 px |
| Angka aksi | 26 px |
| Garis pemisah action row | 1 px, border color |

- Warna mengikuti tema; link/mention/hashtag memakai warna aksen (default biru Threads `#0095F6`).
- Avatar fallback: inisial nama pada lingkaran abu-abu.
- Verified badge hanya dirender jika toggle aktif.
- Tidak ada tombol Follow, tidak ada logo Threads, tidak ada watermark.
- Video: tampilkan poster + ikon play kecil; tidak ada pemutaran.

### 6.4 Edit konten

Per slide, pengguna bisa mengubah:

- Nama tampilan (teks, max 60 karakter).
- Username/handle (tanpa `@`, max 30 karakter).
- Teks post (textarea, max 500 karakter, counter).
- Timestamp (teks bebas atau format tanggal; default dari source).
- Angka like, reply, repost (input angka; format `1.2K` bila > 999).
- Avatar (upload JPG/PNG ≤ 2 MB, diproses di browser; tidak dikirim ke server).

Semua edit bersifat **session-only** (tidak disimpan).

### 6.5 Tema & kontrol dasar

**Preset tema (8):**

| ID | Nama | Background | Card | Teks | Muted | Border |
|---|---|---|---|---|---|---|
| `paper` | Paper | `#F7F3EC` | `#FFFFFF` | `#111111` | `#6B6B6B` | `#E7E1D6` |
| `snow` | Snow | `#FFFFFF` | `#FFFFFF` | `#0A0A0A` | `#737373` | `#E5E5E5` |
| `fog` | Fog | `#E9EDF0` | `#F7F9FA` | `#101418` | `#66707A` | `#D8DEE3` |
| `sand` | Sand | `#E8DFCF` | `#F4EEE2` | `#2B2418` | `#7A6A55` | `#DCCFBB` |
| `olive` | Olive | `#E6E8DC` | `#F3F4EC` | `#1C2117` | `#6B7263` | `#D5D9C8` |
| `ink` | Ink | `#000000` | `#0A0A0A` | `#FAFAFA` | `#A3A3A3` | `#262626` |
| `slate` | Slate | `#14161A` | `#1B1E24` | `#F5F5F5` | `#9CA3AF` | `#2E333B` |
| `mono` | Mono | `#F2F2F2` | `#FFFFFF` | `#000000` | `#666666` | `#D9D9D9` |

**Kontrol dasar:**

- Tema (radio/chip).
- Warna background (color picker; menimpa background tema).
- Warna teks (color picker; menimpa teks tema).
- Font: `sans` (Inter), `serif` (Instrument Serif), `mono` (JetBrains Mono).
- Ukuran teks: slider 32–56 px, step 2.
- Padding: slider 32–80 px, step 8.
- Semua kontrol punya nilai reset ke default tema.

Tidak ada: gradient, upload font, shadow, opacity, posisi bebas, drag-and-drop.

### 6.6 Media & carousel

- Post dengan 1 gambar: tampil penuh, maksimal tinggi 720 px, `object-fit: cover`.
- Post carousel: **grid semua gambar** (2 kolom; maksimal 4 gambar; jika > 4 tampilkan 4 + overlay `+N`).
- Semua gambar di-crop persegi di grid.
- Gambar diambil melalui proxy `/api/image?url=...` agar tidak mengotori canvas (CORS).
- Jika media gagal dimuat: placeholder abu-abu dengan ikon gambar rusak; ekspor tetap jalan.
- Toggle "Tampilkan media" (default on).
- Video diperlakukan sebagai gambar poster; jika tidak ada poster, media diabaikan.

### 6.7 Multi-post / thread

- Thread dideteksi dari payload halaman (lihat §11).
- Setiap post jadi satu slide independen dengan kartu penuh.
- Tab slide di atas panel kontrol: `1 · 2 · 3` + label "Slide 1 dari 3".
- Edit konten berlaku untuk slide aktif; setting tampilan berlaku global.
- Maksimal **10 slide** (post ke-11 diabaikan, tampilkan catatan kecil).
- Jika deteksi thread gagal/ambigu: render satu post saja (post target).
- Tombol "Unduh semua" mengunduh slide 1..N **berurutan** dengan jeda 400 ms.
- Penamaan file: `threadcard-{username}-{shortcode}-{n}.png` (n hanya jika >1 slide).
- Tidak ada ZIP.

### 6.8 Rasio & ekspor

| Mode | Dimensi | Perilaku teks |
|---|---|---|
| Auto | 1080 × (konten + padding), min 1080, max 2400 | Teks penuh; jika > 2400 px, potong + "Selengkapnya" |
| 1:1 | 1080 × 1080 | Maks 4 baris teks, lalu "Selengkapnya" |
| 4:5 | 1080 × 1350 | Maks 5 baris teks |
| 9:16 | 1080 × 1920 | Maks 7 baris teks |

- Preview diskalakan dengan CSS `transform: scale()` agar muat container; node ekspor tetap 1080 px.
- Ekspor memakai `modern-screenshot` pada node tersembunyi, `scale` internal 2× lalu di-downscale ke dimensi target agar teks tajam.
- Format: **PNG** (satu-satunya format di MVP).
- Nama file: lihat §6.7.
- Sebelum ekspor: tunggu `document.fonts.ready` dan semua `<img>` selesai `decode()`.
- Background kartu memenuhi seluruh kanvas (tidak ada area transparan).

### 6.9 Copy ke clipboard

- Tombol "Salin gambar" mengekspor slide aktif ke Blob PNG, lalu:
  ```ts
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob })
  ]);
  ```
- Harus dipanggil dari user gesture.
- Jika API tidak didukung/gagal (mis. Safari lama, non-HTTPS): fallback ke unduh file + toast "Gambar diunduh, clipboard tidak didukung".
- Toast sukses: "Gambar disalin".

### 6.10 Bilingual ID/EN

- Default bahasa: `id` jika `navigator.language` diawali `id`, selain itu `en`.
- Toggle di header: `ID | EN`.
- Preferensi disimpan di `localStorage` (`threadcard.lang`).
- `<html lang>` di-update.
- Semua copy UI, pesan error, toast, label tombol, dan label "Selengkapnya"/"See more" mengikuti bahasa.
- Konten post tidak diterjemahkan.
- Format tanggal mengikuti locale.

### 6.11 Mode manual

Dipicu dari error state atau link "Isi manual".

Field:

- Nama tampilan, username, teks (wajib).
- Timestamp (opsional).
- Like/reply/repost (opsional, default 0).
- Avatar (opsional).
- URL sumber (opsional, hanya untuk ditampilkan di UI, tidak dirender).

Perilaku:

- Langsung membuat 1 slide.
- Setting tampilan tetap tersedia.
- Semua fitur ekspor berfungsi.
- Tidak ada validasi ketat selain field wajib dan batas karakter.

### 6.12 Status & feedback

- Loading: skeleton kartu + spinner pada tombol; teks "Mengambil post…".
- Sukses fetch: transisi halus (fade/slide 150 ms).
- Toast untuk copy/unduh/gagal.
- Tidak ada modal konfirmasi untuk reset; reset langsung.
- Tombol "Post lain" membersihkan state dan URL.

---

## 7. Desain UI/UX

### 7.1 Prinsip

- Minimalis hitam-putih; kartu adalah bintangnya.
- Satu layar, tanpa navigasi multi-halaman.
- Mobile-first; mayoritas pengguna membuka dari HP.
- Kontrol padat tapi tidak sesak; label jelas.
- Tidak ada animasi berlebihan; hormati `prefers-reduced-motion`.

### 7.2 Layout

**Desktop (≥ 1024 px):**

```
┌─────────────────────────────────────────────────────┐
│  ThreadCard                                [ID|EN]  │
├──────────────────────────────┬──────────────────────┤
│                              │  Tema                │
│   Preview (sticky)           │  [Paper][Snow]...    │
│   ┌────────────────────┐     │  Warna  Font  Size   │
│   │      card          │     │                      │
│   └────────────────────┘     │  Konten              │
│   [1] [2] [3]  Slide 1/3     │  Nama, handle, teks  │
│                              │  Toggle elemen       │
│   [Unduh] [Salin] [Semua]    │  Ukuran              │
│                              │  [Auto][1:1][4:5]... │
└──────────────────────────────┴──────────────────────┘
```

- Container max-width 1280 px, padding 24–40 px.
- Kolom preview ±55%, panel ±45%.
- Preview sticky di desktop.

**Mobile (< 1024 px):**

- Header ringkas.
- Input URL di atas.
- Preview full-width dengan skala.
- Tab slide.
- Panel kontrol sebagai accordion (Tema, Konten, Ukuran).
- Action bar sticky di bawah: Unduh, Salin, Unduh semua (jika thread).

### 7.3 Token visual

| Token | Nilai |
|---|---|
| Background aplikasi | `#FAFAFA` (light) |
| Teks utama | `#0A0A0A` |
| Teks sekunder | `#6B6B6B` |
| Border | `#E5E5E5` |
| Aksen | `#0A0A0A` (tombol) / `#0095F6` (link) |
| Radius tombol | 9999 px (pill) |
| Radius panel | 16 px |
| Font UI | Inter |
| Font kartu | Inter / Instrument Serif / JetBrains Mono |
| Shadow | Sangat tipis, hanya pada kartu preview |

Tidak ada dark mode untuk UI aplikasi di MVP (kartu tetap punya tema gelap).

### 7.4 Aksesibilitas

- Semua kontrol punya label dan fokus terlihat.
- Kontras teks minimal 4.5:1.
- Tombol ikon punya `aria-label`.
- Tab slide bisa dioperasikan keyboard.
- Preview kartu punya `aria-label` deskriptif.
- Toast diumumkan lewat `aria-live="polite"`.

---

## 8. Arsitektur teknis

### 8.1 Stack

- **Next.js 16.4.6**, App Router, TypeScript.
- **Tailwind CSS 4.3.5**.
- **modern-screenshot 4.7.0** untuk ekspor PNG.
- Icon: inline SVG (tanpa library ikon tambahan).
- Font: `next/font/google` (Inter, Instrument Serif, JetBrains Mono).
- Tidak ada state library; React state + context kecil untuk bahasa.
- Tidak ada database, auth, analytics, atau layanan pihak ketiga.

### 8.2 Struktur file (usulan)

```
app/
  layout.tsx
  page.tsx                  # client page (editor)
  globals.css
  api/fetch-post/route.ts   # scraping
  api/image/route.ts        # proxy gambar
components/
  Header.tsx
  UrlForm.tsx
  Editor.tsx
  CardPreview.tsx
  CardMockup.tsx
  SlideTabs.tsx
  controls/
    ThemeControls.tsx
    ContentControls.tsx
    SizeControls.tsx
  ManualModeDialog.tsx
  Toast.tsx
lib/
  types.ts
  url.ts                    # normalisasi & validasi
  scrape.ts                 # server-only parser
  fetch-post.ts
  export.ts                 # render + download + clipboard
  themes.ts
  i18n.ts
  format.ts
```

### 8.3 Route API

**`GET /api/fetch-post?url=`**

- Runtime: Node.js (bukan Edge) agar bebas header/timeout.
- `maxDuration = 15`.
- Cache server 10 menit per shortcode (in-memory LRU best-effort + `Cache-Control: s-maxage=600`).
- Timeout fetch upstream 8 detik.
- Respons sukses:

```json
{
  "ok": true,
  "data": {
    "posts": [ { "...": "lihat §10" } ],
    "source": "scrape",
    "fetchedAt": "2026-11-16T10:00:00.000Z"
  }
}
```

- Respons error:

```json
{ "ok": false, "code": "PRIVATE_OR_BLOCKED", "message": "..." }
```

**`GET /api/image?url=`**

- Hanya `https`.
- Allowlist host: `*.cdninstagram.com`, `*.fbcdn.net`, `*.threads.com`, `*.threads.net`.
- Tolak IP privat/loopback (anti-SSRF).
- Hanya `Content-Type: image/*`, maksimal 8 MB.
- Cache `public, max-age=86400, immutable`.
- Tambahkan header `Referer` yang aman bila diperlukan.
- Jika gagal: 502 dengan body kosong; client menampilkan placeholder.

### 8.4 Alur render

1. Data post masuk ke state.
2. `CardMockup` merender node 1080 px (disembunyikan secara visual, tetap di DOM).
3. Preview menampilkan node yang sama dengan `transform: scale()`.
4. Ekspor memanggil `modern-screenshot` pada node itu.
5. Blob diunduh lewat `<a download>` atau disalin ke clipboard.

Catatan:

- Node ekspor tidak boleh punya `transform` dari preview; gunakan wrapper terpisah.
- Semua gambar harus `crossOrigin="anonymous"` dan berasal dari proxy.
- Font harus sudah termuat sebelum ekspor; tampilkan spinner singkat jika perlu.

### 8.5 Keamanan & privasi

- Tidak menyimpan URL, teks, atau gambar pengguna di server.
- Cache server hanya menyimpan payload post publik selama 10 menit; tidak di-log.
- Tidak ada cookie pelacak; hanya `localStorage` untuk bahasa.
- Rate limit tidak ada di MVP; jika terjadi penyalahgunaan, tambahkan rate limit/IP atau Turnstile (lihat §15).
- Footer memuat catatan: gunakan hanya untuk konten publik, hormati hak pencipta.

### 8.6 Deployment

- Asumsi: Vercel (belum final).
- Tidak ada environment variable wajib.
- Build statis untuk halaman, route API dinamis.
- Domain belum ditentukan.

---

## 9. Kontrak API & kode error

| Kode | HTTP | Kapan | Pesan UI (ID) |
|---|---|---|---|
| `INVALID_URL` | 400 | Format bukan URL post Threads | "Link Threads tidak valid." |
| `NOT_FOUND` | 404 | Post tidak ada/dihapus | "Post tidak ditemukan atau sudah dihapus." |
| `PRIVATE_OR_BLOCKED` | 403 | Akun privat/diblokir | "Post ini privat atau tidak bisa diakses." |
| `UPSTREAM_TIMEOUT` | 504 | Fetch > 8 detik | "Threads terlalu lama merespons." |
| `UPSTREAM_CHANGED` | 502 | Markup berubah/parse gagal | "Struktur halaman Threads berubah. Coba isi manual." |
| `RATE_LIMITED` | 429 | Upstream membatasi | "Terlalu banyak permintaan. Coba lagi nanti." |
| `IMAGE_FAILED` | 502 | Proxy gagal | Placeholder, bukan error halaman |

Semua error menyertakan `code` yang stabil dan `message` yang siap ditampilkan.

---

## 10. Model data

```ts
export type AspectRatio = 'auto' | '1:1' | '4:5' | '9:16';
export type FontKey = 'sans' | 'serif' | 'mono';

export interface Author {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
}

export interface PostMedia {
  type: 'image' | 'video';
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface Counts {
  likes: number | null;
  replies: number | null;
  reposts: number | null;
  shares: number | null;
}

export interface ThreadsPost {
  shortcode: string;
  url: string;
  author: Author;
  text: string;
  createdAt: string | null;   // ISO 8601
  counts: Counts;
  media: PostMedia[];
  isReply: boolean;
}

export interface FetchPostResponse {
  ok: boolean;
  data?: {
    posts: ThreadsPost[];
    source: 'scrape' | 'og' | 'manual';
    fetchedAt: string;
  };
  code?: string;
  message?: string;
}

export interface CardSettings {
  themeId: string;
  background: string;
  textColor: string;
  accentColor: string;
  font: FontKey;
  fontSize: number;   // 32–56
  padding: number;    // 32–80
  aspect: AspectRatio;
  showAvatar: boolean;
  showVerified: boolean;
  showTimestamp: boolean;
  showCounts: boolean;
  showMedia: boolean;
}

export interface SlideOverrides {
  displayName?: string;
  username?: string;
  text?: string;
  timestamp?: string;
  likes?: number;
  replies?: number;
  reposts?: number;
  avatarDataUrl?: string;
}

export interface Slide {
  post: ThreadsPost;
  overrides: SlideOverrides;
}
```

Aturan:

- `null` pada counts berarti data tidak tersedia; render `0` atau sembunyikan? **Keputusan:** jika `null`, tampilkan `0` hanya bila bar interaksi aktif; jangan mengarang angka. Lebih baik sembunyikan angka yang `null` dan tetap tampilkan ikon.
- `text` selalu string (boleh kosong untuk post media-only).

---

## 11. Strategi parsing & heuristik

### 11.1 Langkah

1. Normalisasi URL → `shortcode`.
2. `fetch('https://www.threads.com/t/{shortcode}', { headers, signal })`.
3. Cari semua `<script type="application/json" data-sjs>`.
4. Parse JSON; telusuri secara rekursif untuk menemukan array `thread_items` (nama key dapat berubah; cari juga `post`/`caption`).
5. Ambil item pertama yang `code === shortcode` sebagai post target.
6. Petakan field (tabel §11.2).
7. Kumpulkan kandidat thread (§11.3).
8. Jika tidak ada `thread_items`, coba regex/parse `og:title`, `og:description`, `og:image`.
9. Jika teks tetap kosong → `UPSTREAM_CHANGED` atau `PRIVATE_OR_BLOCKED` (bedakan dari status/HTML).

### 11.2 Pemetaan field (perlu diverifikasi di spike)

| Field internal | Kemungkinan path |
|---|---|
| Teks | `post.caption.text` |
| Username | `post.user.username` |
| Display name | `post.user.full_name` |
| Avatar | `post.user.profile_pic_url` |
| Verified | `post.user.is_verified` |
| Timestamp | `post.taken_at` (epoch) |
| Likes | `post.like_count` |
| Replies | `post.text_post_app_info.direct_reply_count` |
| Reposts | `post.text_post_app_info.repost_count` |
| Shares/quotes | `post.text_post_app_info.quote_count` |
| Gambar | `post.image_versions2.candidates[0].url` |
| Carousel | `post.carousel_media[].image_versions2.candidates[0].url` |
| Video poster | `post.video_versions[0].url` atau thumbnail |

Nama key dapat berubah kapan saja. Parser harus defensif: jika field tidak ada, isi `null`/array kosong, jangan crash.

### 11.3 Deteksi thread

- Ambil `thread_items` yang author-nya sama dengan post target.
- Urutkan berdasarkan `taken_at` menaik.
- Jika ada > 1 dan membentuk rantai reply (post kedua adalah reply ke post pertama), jadikan slide.
- Jika tidak yakin, hanya post target.
- Batas 10 slide.
- Reply dari pengguna lain tidak pernah dimasukkan.

### 11.4 Tanggal & angka

- Timestamp: `Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })` → `20 Des 2024` / `Dec 20, 2024`.
- Angka: `< 1000` tampil apa adanya; `≥ 1000` → `1.2K`, `≥ 1_000_000` → `1.2M` (locale-aware bila perlu).
- Handle selalu diawali `@` di kartu.

### 11.5 Batas teks

- Threads membatasi 500 karakter; tetap validasi dan hitung.
- Deteksi baris untuk "Selengkapnya" dilakukan di browser setelah layout (bukan perkiraan karakter), dengan fallback ambang karakter (180) jika pengukuran gagal.
- "Selengkapnya" dirender muted, bukan link.

---

## 12. Edge cases

| Kasus | Perilaku |
|---|---|
| URL profil, bukan post | `INVALID_URL` + pesan "Itu bukan link post" |
| URL dengan query share | Tetap diproses setelah normalisasi |
| `threads.net` vs `threads.com` | Keduanya diterima |
| Post privat/dihapus | `PRIVATE_OR_BLOCKED`/`NOT_FOUND` + mode manual |
| Post publik tapi halaman memblokir server | `UPSTREAM_CHANGED` + mode manual |
| Post tanpa teks (hanya media) | Kartu tetap valid; area teks disembunyikan |
| Post sangat panjang | Potong + "Selengkapnya" sesuai rasio |
| Emoji | Dirender oleh font sistem; jangan pakai font kustom untuk emoji |
| Mention/hashtag/link | Warna aksen, tanpa underline, tetap dalam satu paragraf |
| Avatar gagal dimuat | Fallback inisial |
| Avatar 404 | Fallback inisial; ekspor tetap jalan |
| Media gagal dimuat | Placeholder; ekspor tetap jalan |
| Carousel > 4 gambar | Grid 4 + overlay `+N` |
| Video | Poster + ikon play; tanpa pemutaran |
| Thread > 10 post | Ambil 10 pertama + catatan kecil |
| Thread tidak terdeteksi | Satu slide |
| Teks diedit jadi kosong | Kartu tanpa teks; tombol ekspor tetap aktif |
| Angka diedit kosong | Tampilkan `0` atau sembunyikan angka (default 0) |
| Rasio 9:16 dengan teks pendek | Konten di tengah vertikal |
| Auto-height > 2400 px | Potong + "Selengkapnya" |
| Font belum termuat saat ekspor | Tunggu `document.fonts.ready` |
| Canvas ter-taint | Semua gambar lewat proxy + `crossOrigin`; jika gagal, tampilkan toast |
| Safari iOS tidak mendukung clipboard image | Fallback unduh |
| Browser memblokir multiple download | Jeda 400 ms; jika diblokir, arahkan unduh per slide |
| Offline | Error fetch + mode manual tetap bisa |
| JavaScript dimatikan | Halaman statis menampilkan pesan "Aktifkan JavaScript" |

---

## 13. Acceptance criteria

### 13.1 Alur inti

- [ ] AC-1: Menempel 4 format URL (§6.1) menghasilkan preview yang benar.
- [ ] AC-2: Post publik menampilkan teks, nama, handle, avatar, timestamp, dan angka yang sesuai dengan halaman Threads.
- [ ] AC-3: Post privat/dihapus menampilkan error yang benar dan tombol "Isi manual" berfungsi.
- [ ] AC-4: Mode manual bisa membuat dan mengekspor kartu tanpa URL.

### 13.2 Tampilan & edit

- [ ] AC-5: Semua 8 tema dapat dipilih dan preview berubah seketika.
- [ ] AC-6: Warna background/teks, font, ukuran teks, dan padding berubah di preview dan hasil ekspor.
- [ ] AC-7: Toggle avatar, verified, timestamp, bar interaksi, dan media berfungsi.
- [ ] AC-8: Edit nama/handle/teks/angka tercermin di preview dan ekspor.
- [ ] AC-9: Teks panjang terpotong dengan "Selengkapnya" pada rasio tetap, dan tampil penuh pada auto-height (≤ 2400 px).

### 13.3 Ekspor

- [ ] AC-10: Ekspor 1:1 menghasilkan PNG 1080×1080; 4:5 → 1080×1350; 9:16 → 1080×1920.
- [ ] AC-11: Auto-height menghasilkan lebar 1080 px dan tinggi sesuai konten.
- [ ] AC-12: Hasil ekspor identik dengan preview (font, warna, posisi, media).
- [ ] AC-13: Copy ke clipboard menghasilkan gambar PNG di Chrome desktop dan Chrome Android; fallback unduh di Safari iOS.
- [ ] AC-14: Thread 3 post menghasilkan 3 tab dan "Unduh semua" mengunduh 3 file berurutan.

### 13.4 Bahasa & kualitas

- [ ] AC-15: Toggle ID/EN mengubah semua copy UI dan bertahan setelah reload.
- [ ] AC-16: Tidak ada request analytics/pihak ketiga selain ke Threads dan proxy sendiri.
- [ ] AC-17: Tidak ada data pengguna yang tersimpan di server setelah cache 10 menit.
- [ ] AC-18: Layout mobile 390 px tidak overflow dan action bar dapat dipakai.
- [ ] AC-19: Semua kontrol dapat dioperasikan dengan keyboard.

---

## 14. Rencana implementasi MVP

| Milestone | Isi | Estimasi |
|---|---|---|
| M0 — Spike scraping | Uji 10–20 post publik (teks, media, carousel, thread); catat selector/field yang bekerja; putuskan UA | 0.5–1 hari |
| M1 — Fondasi | Scaffold Next.js + Tailwind, layout, i18n, URL normalizer, route `/api/fetch-post`, proxy gambar | 1 hari |
| M2 — Editor | CardMockup, preview scaling, tema, kontrol dasar, edit konten, toggle, tab slide | 1.5 hari |
| M3 — Ekspor | modern-screenshot, rasio, auto-height, unduh, unduh semua, clipboard | 1 hari |
| M4 — Polish & QA | Error/manual mode, responsive, aksesibilitas, uji browser, copy deck, deploy | 1 hari |

Total: **±5 hari kerja** untuk satu developer. Jika M0 gagal total (scraping tidak bisa diandalkan), fallback: MVP menjadi mockup generator manual dengan URL hanya sebagai validasi — keputusan perlu diambil sebelum M2.

---

## 15. Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Meta memblokir fetch serverless | Alur URL mati | Uji M0; fallback manual; pertimbangkan proxy pihak ketiga nanti |
| Markup Threads berubah | Parser rusak | Parser defensif + unit test fixture; error `UPSTREAM_CHANGED` |
| ToS Meta | Risiko legal/operasional | Hanya post publik, tanpa penyimpanan, atribusi handle di kartu, siap takedown |
| CORS/tainted canvas | Ekspor gagal | Proxy gambar + `crossOrigin` + fallback |
| Clipboard tidak didukung | Fitur Salin gagal | Fallback unduh |
| Multiple download diblokir | Unduh semua gagal | Jeda + pesan; tetap bisa per slide |
| Ukuran bundle | Lambat di mobile | Tanpa library berat; icon inline; font `next/font` |
| Penyalahgunaan (spam fetch) | IP diblokir upstream | Cache 10 menit; rate limit/Turnstile jika perlu |
| Hak cipta konten | Keluhan kreator | Catatan legal, tanpa watermark, tanpa arsip |

---

## 16. Pertanyaan terbuka

1. **Nama & domain brand** — "ThreadCard" hanya placeholder.
2. **Hosting** — Vercel diasumsikan; perlu konfirmasi.
3. **Batas slide thread** — usulan 10; apakah cukup?
4. **Kebijakan video** — poster saja, atau media video diabaikan?
5. **"Selengkapnya"** — perlu opsi menampilkan teks penuh di rasio tetap?
6. **Rate limit** — perlu Turnstile/rate limit sejak awal atau menunggu masalah?
7. **Halaman legal** — perlu halaman privasi/ToS terpisah atau cukup footer?
8. **Desain final** — perlu wireframe high-fidelity sebelum coding?

---

## 17. Copy deck awal (ID/EN)

| Key | ID | EN |
|---|---|---|
| `app.name` | ThreadCard | ThreadCard |
| `hero.title` | Ubah post Threads jadi gambar | Turn Threads posts into images |
| `hero.subtitle` | Tempel link, atur tampilan, unduh. Gratis, tanpa login. | Paste a link, style it, download. Free, no sign-up. |
| `input.placeholder` | Tempel link post Threads… | Paste a Threads post link… |
| `cta.generate` | Buat gambar | Create image |
| `state.loading` | Mengambil post… | Fetching post… |
| `error.invalid` | Link Threads tidak valid. | That Threads link is invalid. |
| `error.notfound` | Post tidak ditemukan atau sudah dihapus. | Post not found or deleted. |
| `error.private` | Post ini privat atau tidak bisa diakses. | This post is private or unavailable. |
| `error.upstream` | Struktur halaman Threads berubah. Coba isi manual. | Threads page structure changed. Try manual entry. |
| `action.retry` | Coba lagi | Try again |
| `action.manual` | Isi manual | Enter manually |
| `action.download` | Unduh PNG | Download PNG |
| `action.copy` | Salin gambar | Copy image |
| `action.copied` | Gambar disalin | Image copied |
| `action.downloadAll` | Unduh semua | Download all |
| `action.newPost` | Post lain | New post |
| `label.theme` | Tema | Theme |
| `label.background` | Background | Background |
| `label.textColor` | Warna teks | Text color |
| `label.font` | Font | Font |
| `label.fontSize` | Ukuran teks | Text size |
| `label.padding` | Padding | Padding |
| `label.size` | Ukuran | Size |
| `label.slide` | Slide {n} dari {total} | Slide {n} of {total} |
| `label.more` | Selengkapnya | See more |
| `toggle.avatar` | Avatar | Avatar |
| `toggle.verified` | Centang biru | Verified badge |
| `toggle.timestamp` | Waktu | Timestamp |
| `toggle.counts` | Bar interaksi | Engagement bar |
| `toggle.media` | Media | Media |
| `footer.legal` | Gunakan hanya untuk konten publik dan hormati hak pencipta. | Use public content only and respect creators' rights. |

---

## 18. Referensi

- Referensi produk: https://thread2img.app/
- Threads oEmbed docs: https://developers.facebook.com/docs/threads/reference/oembed/
- Threads oEmbed tokenless (2026): https://developers.facebook.com/blog/post/2026/06/15/tokenless-access-to-meta-oembed-apis/
- Threads API retrieve posts: https://developers.facebook.com/documentation/threads/retrieve-and-discover-posts/retrieve-posts
- Threads embed guide: https://developers.facebook.com/docs/threads/tools-and-resources/embed-a-threads-post/
- Catatan scraping Threads (pihak ketiga): https://roundproxies.com/blog/scrape-threads/
- modern-screenshot: https://www.npmjs.com/package/modern-screenshot
- Next.js: https://nextjs.org/docs
