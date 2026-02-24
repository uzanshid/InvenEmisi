# InvenEmis
**Visual Node Editor untuk Inventarisasi Emisi**

![InvenEmis Banner](public/header.png)

InvenEmis adalah aplikasi web modern berbasis *Visual Node Editor* yang dirancang khusus untuk memudahkan para ahli lingkungan dan perusahaan dalam melakukan perhitungan, pemrosesan, dan inventarisasi data emisi. Dengan antarmuka *drag-and-drop* yang intuitif, pengguna dapat memvisualisasikan seluruh alur perhitungan—mulai dari data mentah, penerapan faktor emisi, hingga hasil akhir—tanpa perlu menulis kode.

---

## 🚀 Live Demo
Aplikasi ini dapat diakses secara instan tanpa perlu instalasi!
Pengecekan dan penggunaan InvenEmis dapat dilakukan langsung via browser Anda:
**👉 [https://inven-emis.vercel.app/](https://inven-emis.vercel.app/)**

*(Semua pemrosesan data, termasuk file Excel/CSV rahasia Anda, diproses 100% secara offline di dalam browser Anda. Tidak ada data yang dikirim ke server kami).*

---

## ✨ Fitur Utama (Hingga Versi 0.51 / Fase 12)

Aplikasi InvenEmis telah mendukung berbagai operasi matematika dan manipulasi data tingkat lanjut melalui node-node yang saling terhubung:

### 1. Sistem Canvas & Visual Flow
*   **Drag & Drop Interface:** Tambahkan, pindahkan, dan hubungkan node-node komponen sesuka hati di atas kanvas interaktif.
*   **Group Node (Kotak Grup):** Kelompokkan node-node terkait dalam satu kotak berwarna untuk kerapian visual.
*   **Minimalist Mode:** Perkecil (minimize) node untuk menghemat ruang kanvas sambil mempertahankan koneksinya.
*   **Ghost Node:** Buat "kloning visual" dari node sumber yang berada jauh agar kanvas tidak dipenuhi garis koneksi yang tumpang tindih. (Menggantikan Join Node).
*   **Mini-Map & Controls:** Peta kecil di sudut layar untuk memantau area proyek yang luas.
*   **Autosave & Project Management:** Pekerjaan otomatis tersimpan di *Local Storage* browser. Mendukung manajemen multi-proyek (Load, Rename, Delete).
*   **Workspace Notes:** Editor catatan (Markdown) yang menempel (sticky) di setiap node untuk dokumentasi, referensi formula, maupun asumsi.

### 2. Node Perhitungan Dasar (Skalar)
Cocok untuk perhitungan manual atau parameter tetap.
*   **Source Node:** Memasukkan nilai angka tunggal beserta unit/satuannya (misal: `100` `Ton`).
*   **Factor Node:** Memasukkan nilai Faktor Emisi beserta satuannya (misal: `2.5` `kgCO2e/Ton`).
*   **Process Node:** Inti perhitungan (Kalkulator). Menerima berbagai input (huruf A, B, C...) dan mendukung pengetikan rumus kompleks matematika secara langsung (misal: `(A * B) + C`). Memiliki fitur Unit Algebra (pencoretan satuan secara otomatis).
*   **PassThrough Node:** Berfungsi sebagai "gerbang" (jembatan) untuk mengalirkan data menembus masuk atau keluar dari Group Node secara rapi.

### 3. Node Pengolahan Data Massal (Batch/Tabular Data)
Dirancang untuk mengolah data emisi dalam jumlah besar (ribuan baris).
*   **Dataset Node:** Mengimpor file dataset nyata berekstensi `.csv` atau `.xlsx`. (Offline-first, diproses dalam memori RAM pengguna).
*   **Filter Node:** Menyaring baris data berdasarkan kriteria tertentu (misalnya: `>=` nilai معين, atau `==` teks tertentu, mendukung perbandingan antar kolom).
*   **TableMath Node:** Mirip seperti Process Node, tetapi beroperasi pada kolom-kolom tabel data. Anda bisa mengetikkan rumus menggunakan nama kolom aktual (misal: `[Konsumsi Bahan Bakar] * [Faktor Karbon]`) untuk menghasilkan kolom emisi baru.
*   **Transform Node:** "Swiss Army Knife" untuk membersihkan data. Digunakan untuk menghapus (*Delete*), mengubah nama (*Rename*), atau menyeleksi (*Select/Keep*) kolom tertentu agar tabel hasil menjadi lebih rapi sebelum dieskpor. Fitur pamungkasnya adalah operasi **Combine** (Gabung), yang dapat menyatukan *(merge/concat)* kolom-kolom dari 2 atau lebih *Dataset Node* yang berbeda menjadi satu tabel utuh, asalkan jumlah barisnya sama.

### 4. Sistem Formula & Fungsi (Batch Engine)
InvenEmis didukung oleh engine matematika yang kuat (`mathjs`) dan telah diperluas dengan fungsi-fungsi ala Excel:
*   **Operasi Dasar:** `+`, `-`, `*`, `/`, `^`, `%`.
*   **Fungsi Referensi Lintas Baris (Lookup):**
    *   `CEILINGLOOKUP(nilai_target; rentang_nilai; rentang_hasil)`: Mencari tipe/batas atas terdekat.
    *   `FLOORLOOKUP(nilai_target; rentang_nilai; rentang_hasil)`: Mencari tipe/batas bawah terdekat.
*   Dukungan untuk referensi skalar absolut (nilai konstan dari Node Faktor) yang dicampur dengan kolom tabel dinamis.

### 5. Node Ekspor & AI Reporting (Fase 12)
*   **Export Node:** Komponen akhir jembatan data. Dapat mengekspor hasil olahan akhir kembali menjadi file format `.xlsx` atau `.csv` ke komputer pengguna.
*   **AI-Ready Semantic Export:** Terintegrasi dengan fitur ekstraksi berformat `[NamaProject]_AI_Report.json`. Melalui penelusuran arsitektur node secara mundur (Reverse Topo-Sort), fitur ini menghasilkan file "Mega-Prompt" yang siap diunggah ke ChatGPT/Claude (Code Interpreter) agar AI dapat otomatis memahami alur perhitungan Anda, membaca dataset, dan langsung menyusun Laporan Naratif Inventarisasi Emisi secara utuh!

---

## 💻 Instalasi Lokal (Bagi Developer)

Jika Anda ingin menjalankan atau mengembangkan InvenEmis di komputer lokal Anda:

### Prasyarat
*   [Node.js](https://nodejs.org/) (versi 18.x atau 20.x ke atas)
*   NPM, Yarn, atau PNPM

### Langkah Instalasi
1. Clone repositori ini:
   ```bash
   git clone https://github.com/uzanshid/InvenEmisi.git
   cd InvenEmisi
   ```
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan (Localhost):
   ```bash
   npm run dev
   ```
4. Buka browser dan arahkan ke alamat port lokal pembawa (biasanya `http://localhost:5173/`).

---

## 🛠 Teknologi yang Digunakan
*   **Frontend Library:** React 19 + TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS + Lucide React (Icons)
*   **Visual Editor Engine:** React Flow
*   **State Management:** Zustand (+ Zundo untuk fitur Undo/Redo di masa depan)
*   **Math Engine:** Math.js + Custom Algebra Parser
*   **Data Parsing:** PapaParse (CSV) + SheetJS (XLSX)
*   **Data Grid/Tabel:** AG Grid

---
*Dikembangkan untuk mentransformasi lembar kerja statis menjadi alur perhitungan visual yang dinamis.*
