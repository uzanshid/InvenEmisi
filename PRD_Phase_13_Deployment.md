# PRD: InvenEmisi - Phase 13 (Deployment & CI/CD via Vercel)

**Versi:** 1.0
**Tujuan Utama:** Mendistribusikan aplikasi InvenEmisi agar dapat diakses oleh ahli lingkungan secara online tanpa memerlukan instalasi Node.js, IDE, atau file executable (.exe), sekaligus mengaktifkan fitur Pembaruan Otomatis (CI/CD) setiap kali kode di-push ke GitHub.
**Platform Target:** Vercel (Gratis, optimal untuk ekosistem React/Vite).

## 1. Spesifikasi Teknis Deployment
*   **Framework:** Vite (React + TypeScript)
*   **Build Command:** `npm run build`
*   **Output Directory:** `dist`
*   **Node.js Version:** 18.x atau 20.x (Standar Vercel)

## 2. Keamanan & Privasi Data
*   **Client-Side Processing (Offline-First):** Aplikasi ini akan *dihosting* secara publik, **tetapi** seluruh pemrosesan data, matematika, parsing file Excel/CSV, dan ekspor JSON tetap dilakukan *100% di browser pengguna lokal (Client-Side)*. 
*   Data rahasia emisi matriks perusahaan tidak akan pernah dikirimkan atau disimpan ke *database* atau *server* mana pun.

## 3. Alur Penggunaan Akhir (End-User Experience)
*   Pengguna (auditor lingkungan) hanya perlu menerima satu tautan URLs (misalnya: `https://invenemisi.vercel.app` atau `https://invenemisi.com` jika domain dibeli).
*   Aplikasi terbuka secara instan di browser (Chrome/Edge/Firefox) tanpa instalasi apa pun.
*   Pembaruan fitur baru (seperti di Fase 14 berikutnya) akan muncul otomatis kepada pengguna setelah halaman dimuat ulang.

---

## Panduan Step-by-Step (Untuk Anda lakukan di Browser)

Langkah-langkah ini hanya perlu Anda **lakukan satu kali saja**. Setelah selesai, sistem akan berjalan otomatis untuk selamanya.

### Langkah 1: Buat Akun Vercel
1. Buka browser Anda dan kunjungi **[https://vercel.com/signup](https://vercel.com/signup)**
2. Pilih **"Continue with GitHub"**.
3. Otorisasi Vercel untuk mengakses akun GitHub Anda.

### Langkah 2: Impor Repository InvenEmisi
1. Setelah login ke Dashboard Vercel, klik tombol **"Add New..."** lalu pilih **"Project"**.
2. Pada bagian *Import Git Repository*, cari repository **"InvenEmisi"** di list akun GitHub Anda.
3. Klik tombol **"Import"** di sebelah nama repository tersebut.

### Langkah 3: Konfigurasi Deployment
Vercel sangat pintar dan biasanya otomatis mendeteksi bahwa aplikasi Anda adalah "Vite". Biarkan semuanya dalam pengaturan Default:

1. **Project Name:** Biarkan `inven-emisi` (atau ubah sesuai selera).
2. **Framework Preset:** Vite (biasanya otomatis terpilih).
3. **Build and Output Settings:** (Biarkan seperti bawaannya)
   * Build Command: `npm run build`
   * Output Directory: `dist`
4. Klik tombol besar berwarna Biru **"Deploy"**.

### Langkah 4: Tunggu & Selesai!
1. Vercel akan membaca kode Anda dan mulai menjalankan proses "Building" (biasanya memakan waktu 30-60 detik).
2. Jika sukses, Anda akan melihat layar perayaan (Confetti 🎉).
3. Klik tombol **"Continue to Dashboard"**. Di sana Anda akan melihat **URL Domain Publik** aplikasi Anda (misal: `inven-emisi-abcde.vercel.app`).

### Langkah 5: Bagikan Link
Klik link tersebut untuk membuka aplikasi "InvenEmisi" secara online! Anda sekarang siap membagikan link tersebut ke ahli lingkungan atau bos Anda!

> **Catatan Continuous Integration (CI/CD):**
> Jika esok hari kita menambah fitur baru *Phase 14* dan melakukan `git push origin main` dari IDE Cursor/Terminal, **Vercel akan otomatis melakukan update**. Anda tidak perlu lagi login ke Vercel dan menekan tombol Deploy; Vercel akan mengambil kode terbaru secara otomatis!
