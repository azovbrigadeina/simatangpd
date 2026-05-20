# Proyek SIMatang-PD

## Deskripsi
Proyek ini adalah sistem manajemen kinerja (Performance Management System) berbasis Google Apps Script yang dikembangkan untuk mendukung proses evaluasi kematangan perangkat daerah.

Repositori ini telah ditarik dari Google Apps Script dengan ID: `1ika9IZ1vraY3i1yU5-urKMw--thCKVg-a1F9besY-lQ1lQTHVJmSh6OE`.

## Komponen & Fitur Utama

### 1. Sistem Autentikasi & Akses (RBAC)
- **Login Modern**: Desain *glassmorphism* dengan validasi user dari Google Sheets.
- **Multi-Role**: Akses terpisah untuk **Responden** (Unit Kerja) dan **Evaluator** (Admin).

### 2. Fitur Responden (Input Data)
- **Kuesioner Terpandu**: Pengisian bertahap berdasarkan Aspek/Dimensi.
- **Bukti Dukung**: Integrasi link Google Drive sebagai validasi jawaban.
- **Progress Monitoring**: Progress bar real-time dan sistem penguncian data setelah kirim.

### 3. Dashboard & Verifikasi (Evaluator)
- **Monitoring Real-time**: Statistik progres penyelesaian dalam bentuk angka dan grafik.
- **Verifikasi Data**: Penilaian ulang oleh evaluator dengan fitur "Samakan Skor" untuk efisiensi.
- **Input Nilai SKM**: Integrasi nilai Survei Kepuasan Masyarakat secara manual.

### 4. Pelaporan & Analisis
- **Kalkulasi IPP OP**: Perhitungan otomatis nilai Tata Kelola (50%) dan SKM (50%).
- **Predikat Otomatis**: Penentuan predikat (A, A-, B, C, D) secara sistem.
- **Ekspor Multi-Format**: Cetak laporan ke format **PDF**, **Word (DOCX)**, dan **Excel (XLS)**.

### 5. Manajemen Data
- **Master Soal**: Pengaturan indikator dan bobot.
- **User Management**: Pengelolaan akun pengguna dan OPD.

---
Penanda ini dibuat untuk memperjelas identitas direktori proyek dan mempermudah pengembangan lebih lanjut.
