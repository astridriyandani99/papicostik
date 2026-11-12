# 🧠 PAPI Kostick Assessment Platform & Token Gate

Aplikasi Asesmen Psikometri Mandiri **PAPI Kostick (Personality and Preference Inventory)** dengan 90 butir soal pilihan ganda paksa (*ipsative*), 20 aspek kepribadian, 7 dimensi kerja, diagram radar interaktif (Chart.js), laporan eksekutif, serta **Sistem Gerbang Token & Panel Admin** yang terintegrasi dengan **Vercel KV / Upstash Redis** backend.

---

## ✨ Fitur Unggulan

1. **Token Gate (Halaman Depan)**:
   - Validasi token sebelum peserta memulai asesmen.
   - Dukungan token sekali pakai (*single-use*) dan token berulang (*multi-use* / demo).
   - Deteksi masa berlaku token (*expiration date*).

2. **Panel Admin & Token Generator**:
   - Dilindungi PIN Admin (default: `admin123`, dapat diganti langsung via panel).
   - **Single Generator**: Generate token kustom atau acak dengan label kandidat.
   - **Batch Generator**: Generate massal hingga puluhan token dalam 1 klik.
   - Filter token (Aktif, Sudah Terpakai, Semua) dan pencarian real-time.
   - Ekspor seluruh daftar token ke file **CSV / Excel**.

3. **Backend Cloud Vercel KV / Redis (Dual-Mode)**:
   - Endpoint Serverless di `/api` (`validate-token`, `tokens`, `submit-assessment`, `submissions`, `admin-pin`).
   - Menyimpan token dan riwayat hasil pengerjaan secara terpusat di cloud.
   - **Dual-Mode Offline Fallback**: Tetap berjalan 100% mulus menggunakan `localStorage` saat dijalankan lokal secara offline tanpa koneksi Redis.

4. **Pengalaman Asesmen & Laporan**:
   - 90 butir soal dengan animasi transisi mulus dan navigasi responsif (Mobile / Tablet / Desktop).
   - Audio tap feedback & haptic feedback.
   - Penyimpanan progres otomatis (*auto-save*).
   - Matriks analisis 20 aspek, radar chart 360°, dan unduh hasil lembar jawaban CSV.

---

## 🚀 Menjalankan Secara Lokal

```bash
# 1. Install dependensi
npm install

# 2. Jalankan server pengembangan Vite
npm run dev
```

Buka browser di `http://localhost:3000` (atau port yang ditampilkan).
- Token Demo bawaan: `PAPI-DEMO-2026`
- PIN Admin bawaan: `admin123`

---

## ☁️ Deploy ke Vercel dengan Vercel KV / Upstash Redis

1. **Import Repositori**:
   - Di [Vercel Dashboard](https://vercel.com/dashboard), klik **Add New** > **Project**.
   - Pilih repositori `papicostik`.
   - Framework preset otomatis terdeteksi sebagai **Vite**.

2. **Hubungkan Database KV / Redis**:
   - Di dashboard proyek Vercel Anda, buka tab **Storage**.
   - Klik **Create Database** > pilih **KV** (atau **Upstash Redis**).
   - Beri nama (misal: `papicostik-kv`), pilih region terdekat (misal: Singapore `sin1`), klik **Create**.
   - Klik **Connect to Project** dan pilih proyek Anda.
   - Vercel akan otomatis menyuntikkan variabel environment:
     - `KV_REST_API_URL`
     - `KV_REST_API_TOKEN`
     - (atau `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`)

3. **Redeploy**:
   - Tekan **Deploy** (atau trigger deploy ulang).
   - Token dan hasil asesmen sekarang tersinkronisasi di cloud secara real-time antar perangkat!

---

## 📂 Struktur Proyek

```
PAPICOSTIK/
├── api/                     # Vercel Serverless Functions (Backend)
│   ├── _db.js               # Redis / KV client helper & mock fallback
│   ├── validate-token.js    # Validasi token peserta
│   ├── tokens.js            # Admin CRUD & generator token
│   ├── submit-assessment.js # Rekam hasil pengerjaan peserta
│   ├── submissions.js       # Admin rekap hasil asesmen
│   └── admin-pin.js         # Autentikasi & ubah PIN admin
├── src/
│   ├── data.js              # 90 butir soal, norma skor, 20 aspek & 7 dimensi
│   ├── main.js              # Controller aplikasi, UI logic & chart rendering
│   ├── tokenManager.js      # Client sync manager (Cloud API + LocalStorage)
│   └── style.css            # Tailwind CSS v4 styling & animations
├── index.html               # Halaman utama aplikasi (SPA)
├── vercel.json              # Konfigurasi rewrite & build Vercel
└── package.json
```
