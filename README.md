# InvenEmisi v0.1

**Sistem Inventarisasi Emisi Berbasis Node (Visual Calculation Engine)**

InvenEmisi adalah aplikasi web modern untuk membantu praktisi lingkungan, insinyur, dan peneliti dalam melakukan perhitungan inventarisasi emisi yang kompleks. Menggunakan pendekatan **Node-Based Editor** (mirip Blender/Unreal Engine), pengguna dapat membangun alur perhitungan emisi secara visual, transparan, dan terstruktur.

![Screenshot Workbench](https://via.placeholder.com/800x450?text=Workbench+Preview)

## 🌟 Fitur Utama (v0.1)

1.  **Infinite Canvas Workflow**:
    *   Susun diagram perhitungan di canvas tanpa batas luas.
    *   Drag-and-drop node dari sidebar.
    *   Koneksikan antar node untuk mengalirkan data.

2.  **Tipe Node Cerdas**:
    *   **Source Node**: Input data aktivitas (misal: konsumsi bahan bakar dalam `Liter`, `Ton`, `kWh`).
    *   **Factor Node**: Input faktor emisi. Terintegrasi dengan database **CORINAIR** (13.000+ data) dengan fitur pencarian dan filter (Sector, Fuel, Pollutant).
    *   **Process Node**: Mesin hitung fleksibel. Dukung rumus kustom (misal: `A * B`), eksponen unit otomatis, dan deteksi error circular dependency.
    *   **Group Node**: Wadah visual untuk mengelompokkan dan merapikan node-node terkait.
    *   **PassThrough Node**: Jembatan data untuk merapikan jalur koneksi yang rumit.

3.  **Automatic Unit Conversion**:
    *   Sistem secara otomatis mendeteksi dan menghitung satuan.
    *   Mendukung validasi ketat (contoh: `kWh` tidak bisa dijumlahkan dengan `Kg`).
    *   Format hasil otomatis.

4.  **Layer Management**:
    *   Kontrol penuh posisi tumpukan visual (Z-Index).
    *   Klik kanan untuk "Send to Back" atau "Bring to Front".

## 🚀 Alur Penggunaan (Workflow)

1.  **Input Data**: Tarik **Source Node** ke canvas, isi nilai aktivitas (contoh: 1000 Liter Solar).
2.  **Cari Faktor**: Tarik **Factor Node**, buka database, cari faktor emisi yang sesuai (contoh: CO2 dari Diesel Industry).
3.  **Proses**: Hubungkan keduanya ke **Process Node**.
4.  **Hitung**: Tulis rumus (misal `Activity * Factor`). Hasil emisi langsung keluar dengan satuan yang benar.

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

Versi saat ini (v0.1) masih dalam tahap pengembangan awal (Alpha).
Fokus pengembangan selanjutnya:
*   [ ] Export/Import project (JSON file).
*   [ ] Reporting module (Generasi PDF/Excel).
*   [ ] Lebih banyak database faktor emisi.
*   [ ] Analisis ketidakpastian (Uncertainty Analysis).

---
**Developed by Fauzan Shidiq**
*Open Source for Environmental Sustainability*
