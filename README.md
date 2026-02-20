# InvenEmisi v0.5 (Beta)

**Sistem Inventarisasi Emisi Berbasis Node (Visual Calculation Engine)**

> **Status: Beta Testing**  
> Saat ini InvenEmisi memasuki tahap Beta. Kami mengundang para ahli lingkungan, dosen, peneliti, dan praktisi untuk mencoba dan memberikan masukan (feedback) guna penyempurnaan lebih lanjut sebelum rilis stabil.

InvenEmisi adalah aplikasi web modern untuk membantu praktisi lingkungan, insinyur, dan peneliti dalam melakukan perhitungan inventarisasi emisi yang kompleks. Menggunakan pendekatan **Node-Based Editor** (mirip Blender/Unreal Engine), pengguna dapat membangun alur perhitungan emisi secara visual, transparan, dan terstruktur.

![Screenshot Workbench](https://via.placeholder.com/800x450?text=Workbench+Preview)

## 🌟 Fitur Utama (v0.5)

1.  **Infinite Canvas Workflow**:
    *   Susun diagram perhitungan di canvas tanpa batas luas.
    *   **Extended Zoom**: Zoom-out hingga 5% untuk melihat keseluruhan project yang besar.
    *   **Interactive MiniMap**: Navigasi cepat dengan klik & drag pada minimap.
    *   **Multi-Select**: Dukungan Shift+Click dan drag selection.

2.  **Tipe Node Cerdas**:
    *   **Source Node**: Input data aktivitas (misal: konsumsi bahan bakar dalam `Liter`, `Ton`, `kWh`).
    *   **Factor Node**: Input faktor emisi. Terintegrasi dengan database **EMEP/EEA** (12.500+ data).
    *   **Process Node**: Mesin hitung fleksibel. Dukung rumus kustom, eksponen unit otomatis, dan **centered handle alignment** saat minimized.
    *   **TableMath Node**: Perhitungan batch data tabular dengan fungsi agregat (`$SUM`, `$AVG`).
    *   **Ghost Node**: Node bayangan untuk mereferensikan nilai dari node lain tanpa garis ruwet (sekarang dengan auto-labeling).
    *   **Group Node**: Pengelompokan visual yang lebih rapi tanpa outline yang mengganggu.
    *   **Join, Filter, Transform**: Manipulasi data lengkap (SQL-like JOIN, filtering, transforming).

3.  **Visual & UX Enhancements (v0.5)**:
    *   **Prominent Titles**: Judul node lebih besar dan tebal untuk keterbacaan lebih baik.
    *   **Smart Handles**: Titik koneksi otomatis menumpuk di tengah saat node di-minimize agar tetap rapi.
    *   **Clean UI**: Penghapusan garis outline default yang mengganggu pada Group Node.

4.  **Cascade Auto-Run**:
    *   Otomatis menjalankan kalkulasi berantai saat data hulu berubah.

5.  **Automatic Unit Conversion**:
    *   Sistem secara otomatis mendeteksi dan menghitung satuan (misal: `kg` vs `ton`).

## 🚀 Alur Penggunaan (Workflow)

1.  **Input Data**: Tarik **Source Node** ke canvas, isi nilai aktivitas.
2.  **Cari Faktor**: Tarik **Factor Node**, buka database, cari faktor emisi yang sesuai.
3.  **Proses**: Hubungkan keduanya ke **Process Node**.
4.  **Batch Processing**: Gunakan **Dataset Node** untuk upload CSV/Excel, lalu sambungkan ke **TableMath Node** untuk kalkulasi massal.
5.  **Join Data**: Gunakan **Join Node** untuk menggabungkan data aktivitas dengan database referensi eksternal.

## 🛠️ Instalasi & Menjalankan

Project ini dibangun dengan **React**, **TypeScript**, **Vite**, dan **React Flow**.

### Prasyarat
*   Node.js (v18+)
*   npm

### Langkah-langkah
1.  Clone repository:
    ```bash
    git clone https://github.com/uzanshid/InvenEmisi.git
    cd InvenEmisi
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Jalankan mode development:
    ```bash
    npm run dev
    ```
    Buka browser di `http://localhost:5173`.

4.  Build untuk production:
    ```bash
    npm run build
    ```

## 🤝 Kontribusi (Roadmap)

## 🤝 Kontribusi (Roadmap)

Versi saat ini (v0.5 Beta) mencakup:
*   [x] Multi-column database filtering
*   [x] Join Node (VLOOKUP mechanism)
*   [x] Aggregate Functions ($SUM, $AVG, $MIN, $MAX)
*   [x] Cascade Auto-Run System
*   [x] **UX Overhaul** (Zoom, MiniMap, Multi-select, Grouping)
*   [ ] Export/Import project (Next Priority)
*   [ ] Reporting module (Generasi PDF/Excel)
*   [ ] Analisis ketidakpastian (Uncertainty Analysis)

---
**Developed by Fauzan Shidiq**
*Open Source for Environmental Sustainability*
