# Personal Dashboard To-Do

Mini Project RevoU — Aplikasi web personal dashboard yang dibangun dengan **HTML, CSS, dan Vanilla JavaScript** tanpa framework atau library tambahan.

## ✨ Fitur

| Widget | Fitur |
|---|---|
| 🕐 **Greeting** | Jam digital real-time, tanggal dalam Bahasa Indonesia, sapaan berdasarkan waktu (Pagi/Siang/Sore/Malam), dan nama kustom |
| ⏱️ **Focus Timer** | Countdown Pomodoro 25 menit dengan tombol Start, Stop, Reset, dan pesan notifikasi saat selesai |
| ✅ **Daftar Tugas** | Tambah, edit, hapus tugas; centang selesai; pengurutan (default, belum selesai, selesai) |
| 🔗 **Quick Links** | Simpan hingga 20 tautan cepat yang bisa dibuka di tab baru |
| 🌙 **Tema** | Toggle antara tema terang dan gelap — tanpa kedipan (anti-FOUC) |
| 💾 **Persistensi** | Semua data tersimpan otomatis di `localStorage` dan tetap ada setelah halaman di-refresh |

## 🚀 Cara Membuka

Tidak memerlukan build tools atau server. Cukup buka file berikut di browser:

```
index.html
```

> **Tips**: Di Visual Studio Code, klik kanan `index.html` → *Open with Live Server*; atau di File Explorer klik dua kali pada `index.html`.

## 🧪 Menjalankan Automated Tests

Proyek ini menggunakan **Property-Based Testing** dengan library [`fast-check`](https://github.com/dubzzz/fast-check) yang dijalankan di Node.js.

### Prasyarat

- [Node.js](https://nodejs.org/) (versi 14 atau lebih baru)
- npm (sudah termasuk dalam instalasi Node.js)

### Langkah

1. **Install dependensi** (hanya perlu dilakukan sekali):

   ```bash
   npm install
   ```

2. **Jalankan semua test**:

   ```bash
   npm test
   ```

   Ini akan menjalankan 7 file test secara berurutan dan menampilkan ringkasan hasil:

   ```
   ✓ Property 18: Corrupt storage data → default returned
   ✓ Property 17: Theme toggle is a round-trip
   ✓ Property 1: Greeting text covers all hours bijectively
   ✓ Property 4: Name validation rejects invalid inputs
   ✓ Property 6: Timer tick is monotonically decreasing
   ✓ Property 8: Task text validation rejects invalid inputs
   ✓ Property 14: URL normalization adds https:// prefix when missing
   ... (dan seterusnya)
   ```

### File Test

| File | Properties yang Diuji |
|---|---|
| `test/storage.test.js` | Property 18 — corrupt storage fallback |
| `test/theme.test.js` | Property 17 — tema toggle round-trip |
| `test/greeting.test.js` | Property 1, 2, 3 — greeting text & name truncation |
| `test/name.test.js` | Property 4, 5 — validasi nama & idempotency |
| `test/timer.test.js` | Property 6, 7 — countdown & reset idempotency |
| `test/todo.test.js` | Property 8–11 — validasi & CRUD task; Property 12–13 — sort immutability & correctness |
| `test/links.test.js` | Property 14, 15, 16 — URL normalisasi, batas link, validasi |

## 🏗️ Arsitektur

```
project-root/
├── index.html          # Satu-satunya file HTML (entry point)
├── css/
│   └── style.css       # Semua styling + tema terang/gelap + responsif
├── js/
│   └── app.js          # Semua logika (Module Pattern / IIFE)
├── test/               # Property-based tests (Node.js + fast-check)
├── package.json
└── .gitignore
```

**Modul JavaScript** (`js/app.js`):
- `Storage` — abstraksi localStorage dengan error handling
- `ThemeController` — toggle tema + anti-FOUC
- `GreetingWidget` — jam, tanggal, sapaan personal
- `NameSettingController` — form input nama kustom
- `TimerModule` — countdown Pomodoro dengan state machine
- `SortController` — pengurutan daftar tugas
- `TodoManager` — CRUD tugas + persistensi
- `LinkManager` — CRUD quick links + normalisasi URL

## 📋 Tech Stack

- **HTML5** — Semantic markup
- **CSS3** — Custom properties (CSS variables), Grid, Flexbox, media queries
- **Vanilla JavaScript** — Module Pattern (IIFE), localStorage API, Custom Events
- **fast-check** — Property-Based Testing (dev dependency, hanya untuk test)

## 📝 Lisensi

ISC — Lihat repositori di [GitHub](https://github.com/Huwkmiaw/CodingCamp-31August26-yamaroni)
