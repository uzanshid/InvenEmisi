# InvenEmisi v0.4

**Sistem Inventarisasi Emisi Berbasis Node (Visual Calculation Engine)**

InvenEmisi adalah aplikasi web modern untuk membantu praktisi lingkungan, insinyur, dan peneliti dalam melakukan perhitungan inventarisasi emisi yang kompleks. Menggunakan pendekatan **Node-Based Editor** (mirip Blender/Unreal Engine), pengguna dapat membangun alur perhitungan emisi secara visual, transparan, dan terstruktur.

![Screenshot Workbench](https://via.placeholder.com/800x450?text=Workbench+Preview)

## 🌟 Fitur Utama (v0.4)

1.  **Infinite Canvas Workflow**:
    *   Susun diagram perhitungan di canvas tanpa batas luas.
    *   Drag-and-drop node dari sidebar.
    *   Koneksikan antar node untuk mengalirkan data.

2.  **Tipe Node Cerdas**:
    *   **Source Node**: Input data aktivitas (misal: konsumsi bahan bakar dalam `Liter`, `Ton`, `kWh`).
    *   **Factor Node**: Input faktor emisi. Terintegrasi dengan database **EMEP/EEA** (12.500+ data) dengan fitur pencarian dan filter multi-kolom.
    *   **Process Node**: Mesin hitung fleksibel. Dukung rumus kustom (misal: `[Activity] * [Factor]`), eksponen unit otomatis, dan insert variable dengan bracket `[]`.
    *   **TableMath Node**: Perhitungan batch data tabular. Mendukung rumus kompleks, fungsi agregat (`$SUM`, `$AVG`), dan kondisional (`if(A>B, 1, 0)`).
    *   **Join Node** (New in v0.4): Menggabungkan dua dataset berdasarkan key column (mirip SQL JOIN / Excel VLOOKUP).
    *   **Filter & Transform Node**: Manipulasi data (filter row, rename column, delete column) sebelum diproses lebih lanjut.
    *   **Group Node**: Wadah visual untuk mengelompokkan dan merapikan node-node terkait.

3.  **Cascade Auto-Run (New in v0.4)**:
    *   Otomatis menjalankan kalkulasi berantai. Saat satu data di-update, seluruh node downstream (Filter, Transform, Join) akan menghitung ulang secara otomatis.
    *   Tidak perlu klik "Run" satu per satu untuk setiap node dalam pipeline.

4.  **UI/UX Improvements**:
    *   **Dynamic Node Width**: Lebar node otomatis menyesuaikan panjang judul saat di-minimize.
    *   **Minimize/Maximize**: Semua node dapat di-minimize untuk menghemat ruang canvas.
    *   **Persistent Handles**: Edge tetap tersambung rapi meskipun node di-minimize.

5.  **Automatic Unit Conversion**:
    *   Sistem secara otomatis mendeteksi dan menghitung satuan.
    *   Mendukung validasi ketat dan konversi otomatis (contoh: `kg` ke `ton`).

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

Versi saat ini (v0.4) mencakup:
*   [x] Multi-column database filtering
*   [x] Join Node (VLOOKUP mechanism)
*   [x] Aggregate Functions ($SUM, $AVG, $MIN, $MAX)
*   [x] Cascade Auto-Run System
*   [x] Dynamic Node Resizing
*   [x] Enhanced Formula Engine with Conditional Logic

Fokus pengembangan selanjutnya:
*   [ ] Export/Import project (JSON file).
*   [ ] Reporting module (Generasi PDF/Excel).
*   [ ] Lebih banyak database faktor emisi.
*   [ ] Analisis ketidakpastian (Uncertainty Analysis).

---
**Developed by Fauzan Shidiq**
*Open Source for Environmental Sustainability*
