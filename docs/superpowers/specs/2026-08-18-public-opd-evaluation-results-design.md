# Design Document: Portal Hasil & Catatan Evaluasi OPD Publik (Tahun Aktif)

## Executive Summary
Dokumen desain ini merinci penambahan fitur **Portal Hasil & Catatan Evaluasi OPD Publik** pada aplikasi SIMatang-PD. Fitur ini memungkinkan masyarakat umum maupun Responden (OPD) untuk melihat hasil evaluasi kematangan Perangkat Daerah secara **real-time** tanpa perlu login, mencakup Indeks Kematangan (Mandiri, Evaluator Organisasi, Evaluator Provinsi) serta rincian nilai dan catatan/saran dari kedua tingkat evaluator untuk setiap indikator.

---

## User Stories & Flow

### User Story
Sebagai pengguna publik / Responden OPD:
- Saya ingin dapat memilih Perangkat Daerah (OPD) tertentu dari halaman depan aplikasi.
- Saya ingin melihat hasil penilaian skala mandiri, skala evaluator organisasi, dan skala evaluator provinsi secara real-time.
- Saya ingin membaca catatan dan saran perbaikan dari evaluator organisasi maupun provinsi untuk seluruh indikator maupun yang bercatatan khusus.
- Saya ingin mencetak rekap hasil evaluasi tersebut dalam bentuk dokumen/laporan.

### User Flow
1. Pengguna membuka Halaman Depan (Landing Page) `SIMatang-PD`.
2. Di bawah tombol **RESPONDEN** dan **EVALUATOR**, pengguna melihat tombol terpusat (centered):  
   `[ 📋 HASIL EVALUASI OPD TAHUN 2026 ]` (Tahun dinamis sesuai tahun aktif berjalan).
3. Saat tombol diklik, halaman berganti ke **View Publik Hasil Evaluasi** (`#p-public-hasil`).
4. Pengguna memilih OPD dari Dropdown Pilih Perangkat Daerah.
5. Sistem mengambil data master pertanyaan, jawaban responden, dan verifikasi evaluator secara real-time dari backend/Firebase.
6. Halaman secara otomatis menampilkan:
   - **Header Ringkasan Indeks:** Indeks Mandiri, Indeks Evaluator Organisasi, dan Indeks Evaluator Provinsi.
   - **Daftar Indikator (Default: Semua Indikator):** Kartu per indikator/soal berisi nilai skala dan box catatan/saran dari Evaluator Organisasi & Provinsi. Jika belum dinilai, muncul badge `Belum Dinilai`.
   - **Filter Display:** Opsi beralih antara "Semua Indikator" dan "Hanya yang Memiliki Catatan".
   - **Tombol Cetak:** Mengaktifkan dialog cetak peramban dengan layout yang sudah dioptimalkan untuk cetak laporan A4.
7. Pengguna dapat mengklik tombol `[ ⬅️ KEMBALI KE BERANDA ]` di sudut atas untuk kembali ke Landing Page.

---

## UI/UX Design Specifications

### 1. Landing Page Button Layout (`Index.html`)
- **Lokasi:** Di bawah container `PILIH AKSES MASUK` (dibawah tombol Responden & Evaluator), diposisikan di tengah (*centered*).
- **Styling:** Neobrutalism Style (Border 3px solid #000, Shadow khas SIMatang-PD, Warna aksen kontras misal kuning/biru).
- **Label Tombol:** `📋 HASIL EVALUASI OPD TAHUN <YEAR>` (misal: `📋 HASIL EVALUASI OPD TAHUN 2026`).

### 2. View Publik Component (`Index.html` / `UI_PublicHasil.html` & `Scripts.html`)
- **ID Elements:**
  - View Container: `#p-public-hasil` (awalnya `class="hidden"`).
  - Header Title: `#pub-hasil-title` ("PORTAL HASIL EVALUASI KEMATANGAN OPD TAHUN 2026").
  - OPD Select Dropdown: `#select-public-opd`.
  - Filter Toggle: Radio/Pill button `#filter-all-soal` vs `#filter-notes-only`.
  - Summary Cards: `#pub-card-mandiri`, `#pub-card-eval`, `#pub-card-prov`.
  - Indicators Container: `#pub-soal-container`.
  - Back Button: `#btn-back-to-land`.
  - Print Button: `#btn-print-public-hasil`.

---

## Technical Architecture & Backend Specification

### 1. Backend Endpoint (`Responden.js` / `Evaluator.js`)
- **Fungsi Baru:** `getPublicEvaluasiOpd(opdName)`
  - **Parameter:** `opdName` (String, nama OPD yang dipilih).
  - **Proses:**
    1. Ambil data master pertanyaan (`getPertanyaan()`).
    2. Ambil data jawaban responden dari Firebase (`jawaban/${opdName}`) atau Sheet.
    3. Ambil data verifikasi dari Firebase (`verifikasi/${opdName}`) atau Sheet.
    4. Hitung indeks rata-rata untuk Mandiri, Evaluator Organisasi, dan Evaluator Provinsi.
  - **Return Payload Object:**
    ```json
    {
      "opd": "Dinas Pendidikan",
      "indeks": {
        "mandiri": 4.20,
        "evaluator": 3.85,
        "provinsi": 3.85
      },
      "items": [
        {
          "no": 1,
          "id_soal": "VAR_01",
          "pertanyaan": "...",
          "bobot": 5,
          "skala_responden": 4,
          "link_bukti": "https://drive.google.com/...",
          "skala_evaluator": 4,
          "catatan_evaluator": "Dokumen pendukung lengkap dan sesuai.",
          "skala_provinsi": 3,
          "catatan_provinsi": "Perlu penyempurnaan SK penetapan."
        }
      ]
    }
    ```

### 2. Print Layout Optimization (`Styles.html`)
- Menambahkan media query `@media print`:
  - Menyembunyikan tombol navigasi, background grid, dan dropdown selector.
  - Memastikan seluruh konten kartu indikator tampil bersih dengan warna teks hitam kontras dan batas halaman yang rapi.

---

## Verification Plan

### Automated / Manual Verification
1. **Verifikasi Tampilan Landing Page:**
   - Memastikan tombol `HASIL EVALUASI OPD TAHUN 2026` tampil persis di tengah di bawah tombol Responden dan Evaluator.
2. **Verifikasi Pemilihan OPD & Real-time Load:**
   - Memilih OPD dari dropdown dan memastikan data ringkasan indeks serta detail indikator terisi dengan benar.
3. **Verifikasi Real-Time Data Evaluator:**
   - Memastikan catatan evaluator organisasi dan provinsi tampil real-time saat evaluator menyimpan data verifikasi.
4. **Verifikasi Filter & Cetak:**
   - Memastikan filter "Hanya yang Memiliki Catatan" berfungsi menyaring indikator.
   - Memastikan tombol Cetak memicu dialog print peramban.
