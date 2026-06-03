# 🏆 Papan Juara — Dokumentasi Lengkap

Leaderboard permainan tradisional Indonesia dengan integrasi Google Sheet, panel admin, animasi 3D, dan efek suara.

---

## 📁 Struktur File

```
papan-juara/
├── index.html   ← Halaman leaderboard (tampilan user)
├── admin.html   ← Panel admin (kelola data)
├── style.css    ← Semua gaya visual
├── app.js       ← Semua logika JavaScript
└── README.md    ← Dokumentasi ini
```

---

## 🚀 Cara Setup (Langkah demi Langkah)

### 1. Buat Google Sheet

Buat Google Sheet baru dengan **2 tab (sheet)**:

#### Tab 1: `Jawara`
| Nama          | Asal         | Menang |
|---------------|--------------|--------|
| Budi Santoso  | Yogyakarta   | 12     |
| Sari Dewi     | Surabaya     | 9      |
| Ahmad Fauzi   | Bandung      | 8      |
| ...           | ...          | ...    |

#### Tab 2: `Penjelajah`
| Nama          | Asal         | IkutLomba |
|---------------|--------------|-----------|
| Rina Melati   | Jakarta      | 20        |
| Hendra Wijaya | Medan        | 17        |
| Lestari Putri | Semarang     | 15        |
| ...           | ...          | ...       |

> ⚠️ **Penting:** Baris pertama adalah header — **jangan diubah urutannya**.  
> Kolom ke-3 harus berupa angka (jumlah menang / jumlah ikut lomba).

---

### 2. Publikasikan Google Sheet ke Web

1. Buka Google Sheet Anda
2. Klik **File** → **Bagikan** → **Publikasikan ke web**
3. Pilih tab **"Jawara"** → Format: **Nilai yang dipisahkan koma (.csv)**
4. Klik **Publikasikan**
5. Ulangi untuk tab **"Penjelajah"**

---

### 3. Salin Sheet ID

Dari URL Google Sheet Anda:
```
https://docs.google.com/spreadsheets/d/[SHEET_ID_ADA_DI_SINI]/edit
```
Salin bagian `[SHEET_ID_ADA_DI_SINI]`.

---

### 4. Konfigurasi `app.js`

Buka `app.js` dan ubah bagian `CONFIG` di paling atas:

```javascript
const CONFIG = {
  // Nama event (tampil di header)
  eventTitle  : "NAMA EVENT ANDA",
  eventTagline: "Tagline · Tahun",

  // Google Sheet
  sheetId         : "PASTE_SHEET_ID_ANDA_DI_SINI",
  sheetJawara     : "Jawara",      // harus sama dengan nama tab
  sheetPenjelajah : "Penjelajah",  // harus sama dengan nama tab

  // Auto-refresh setiap 30 detik
  refreshInterval : 30000,

  // Tampilkan top 10 peserta
  topN : 10,

  // GANTI password ini!
  adminUser : "admin",
  adminPass : "password_anda_di_sini",

  // Musik otomatis diputar?
  musicAutoplay : false,
};
```

---

### 5. Deploy ke GitHub Pages

1. Buat repository baru di GitHub (misal: `papan-juara`)
2. Upload semua file (`index.html`, `admin.html`, `style.css`, `app.js`)
3. Buka **Settings** → **Pages**
4. Source: **Deploy from a branch** → Branch: `main` → Folder: `/ (root)`
5. Klik **Save**
6. Website Anda akan tersedia di:  
   `https://[username].github.io/papan-juara/`

---

## 👤 Role & Akses

| Role  | Akses                                         |
|-------|-----------------------------------------------|
| User  | Buka `index.html` — lihat leaderboard saja    |
| Admin | Buka `admin.html` → login → kelola data       |

### Kredensial Admin (default)
- **Username:** `admin`
- **Password:** `papanjuara2025`

> ⚠️ Ganti password di `app.js` → bagian `CONFIG.adminPass` sebelum deploy!

---

## ⚙️ Fitur Admin

### A. Pengaturan Event
- Ubah nama event dan tagline yang tampil di header
- Ubah Sheet ID dan interval refresh
- Semua tersimpan di `localStorage` browser

### B. Data Manual (tanpa Google Sheet)
- Tambah / edit / hapus peserta langsung dari tabel
- Data tersimpan di `localStorage`
- Bisa jadi **backup** jika Google Sheet tidak tersedia

### C. Reset Data
- Tombol "Reset Semua Data" menghapus seluruh data manual
- Data Google Sheet tidak terpengaruh

### D. Test Koneksi
- Cek apakah Google Sheet berhasil terhubung
- Tampilkan jumlah baris yang ditemukan

---

## 🎨 Kustomisasi Tampilan

### Ganti Warna Tema
Di `style.css`, bagian `:root { }`:
```css
--gold:    #F5C842;   /* Warna emas utama */
--crimson: #9B1B30;   /* Merah batik */
--jade:    #1A6B4A;   /* Hijau panel penjelajah */
```

### Ganti Font
Di `index.html`, ganti link Google Fonts dan variabel:
```css
--font-display: 'Nama Font Display', serif;
--font-body:    'Nama Font Body', serif;
```

### Ganti Ikon Event
Di `index.html`, cari bagian `event-emblem`:
```html
<span class="emblem-icon">🏮</span>  ← ganti emoji ini
```

### Ganti Musik / Suara
Di `index.html`, ganti `src` pada elemen `<audio>`:
```html
<audio id="bgm-loop" src="musik_anda.mp3" loop></audio>
<audio id="sfx-rank-up" src="naik.mp3"></audio>
<audio id="sfx-rank-down" src="turun.mp3"></audio>
<audio id="sfx-confetti" src="perayaan.mp3"></audio>
```

### Ganti Partikel Dekoratif
Di `app.js`, fungsi `spawnParticles()`:
```javascript
const icons = ['🍃', '🌺', '✨', ...]; // tambah/hapus emoji
const count = 18;  // jumlah partikel
```

---

## 🔄 Cara Kerja Auto-Refresh

1. Setiap `CONFIG.refreshInterval` milidetik, data diambil ulang dari Google Sheet
2. Posisi setiap peserta dibandingkan dengan posisi sebelumnya
3. Jika ada yang **naik**: animasi hijau + suara naik + toast notifikasi
4. Jika ada yang **turun**: animasi merah + suara turun + toast notifikasi
5. Indikator "Live" di header menunjukkan status koneksi

---

## 🐛 Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Data tidak muncul | Pastikan Sheet sudah dipublikasikan sebagai CSV |
| CORS error | Gunakan URL dari langkah "Publikasikan ke web" (bukan share biasa) |
| Musik tidak bunyi | Klik tombol 🎵 di header (browser blokir autoplay) |
| Login gagal | Cek `CONFIG.adminUser` dan `CONFIG.adminPass` di `app.js` |
| Data tidak update | Refresh browser atau tunggu interval berikutnya |

---

## 📊 Format Google Sheet Detail

### Tips Input Data
- **Nama:** Nama lengkap peserta (max ~30 karakter untuk tampilan optimal)
- **Asal:** Kota atau daerah asal
- **Angka:** Hanya angka, tanpa tanda titik/koma/spasi

### Dari Google Form
Jika menggunakan Google Form:
1. Buat Form dengan field: Nama, Asal, dan field angka
2. Di Google Sheet responses, tambahkan kolom formula untuk hitung otomatis:
   - Contoh: `=COUNTIF(C:C, C2)` untuk hitung jumlah kemunculan nama

---

## 📝 Catatan Pengembang

Semua file sudah diberi komentar dokumentasi. Titik-titik yang paling sering ingin diubah:

| Yang ingin diubah | Lokasi |
|---|---|
| Nama event | `app.js` → `CONFIG.eventTitle` |
| Password admin | `app.js` → `CONFIG.adminPass` |
| Sheet ID | `app.js` → `CONFIG.sheetId` |
| Interval refresh | `app.js` → `CONFIG.refreshInterval` |
| Warna tema | `style.css` → `:root { }` |
| Jumlah peserta | `app.js` → `CONFIG.topN` |
| Partikel latar | `app.js` → fungsi `spawnParticles()` |
| Musik | `index.html` → elemen `<audio>` |

---

*Dibuat dengan ❤️ untuk merayakan permainan tradisional Indonesia*
