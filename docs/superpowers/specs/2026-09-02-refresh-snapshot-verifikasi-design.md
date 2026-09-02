# Design Spec: Fitur Refresh Snapshot Bukti Dukung (Global / Per-OPD)

## Overview
Fitur ini memberikan kemampuan kepada Evaluator/Admin untuk melakukan pembaruan snapshot secara langsung pada **seluruh variabel/bukti dukung OPD sekaligus** dari modal verifikasi data. Fitur ini memicu pembuatan ulang snapshot secara rekursif (menyalin seluruh subfolder & berkas di dalamnya) dan memperbarui tautan arsip admin.

## Problem Statement
Bukti dukung yang disubmit oleh responden sebelum pembaruan penyalinan rekursif belum memiliki isi subfolder pada Drive Admin. Evaluator/Admin memerlukan 1 tombol praktis untuk memperbarui seluruh snapshot bukti dukung OPD tersebut secara sekaligus (global per-OPD).

## Detailed Design & Requirements

### 1. Backend (`Evaluator.js`)
- **Fungsi `resnapshotAllByOPD(namaOPD)`**:
  1. Memverifikasi nama OPD dan mengambil seluruh data `jawaban/${escapedOPD}` dari Firebase.
  2. Melakukan perulangan untuk setiap variabel/soal yang memiliki link Drive (`j.link`).
  3. Memanggil `snapshotDriveFolder(namaOPD, j.link)` (yang telah didukung oleh `copyFolderRecursive`).
  4. Memperbarui `link_arsip` pada setiap item jawaban di Firebase.
  5. Mengembalikan objek respons `{ success: true, count: updatedCount, message: "Berhasil memperbarui snapshot..." }`.

### 2. Frontend (`Scripts.html`)
- **Toolbar Header Modal Verifikasi**:
  - Menambahkan tombol aksi utama di panel kontrol header modal verifikasi:
    ```html
    <button class="btn btn-sm btn-outline-info fw-bold" onclick="doResnapshotAll('${opdName}')" title="Buat ulang seluruh snapshot bukti dukung OPD ini secara rekursif">
      <i class="bi bi-arrow-repeat me-1"></i>Refresh Semua Snapshot
    </button>
    ```

- **Interaksi & Loading State**:
  - Saat tombol diklik, menampilkan animasi loading SweetAlert2:
    `Swal.fire({ title: 'Memproses Snapshot Ulang...', text: 'Sistem sedang menyalin seluruh folder & subfolder bukti dukung OPD...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });`
  - Setelah backend selesai memproses:
    - Menutup loading dialog.
    - Memanggil `pilihOPD(opdName)` / `renderVList(opdName)` untuk memperbarui UI dengan link snapshot terbaru.
    - Menampilkan notifikasi sukses Toast: *"Berhasil memperbarui snapshot bukti dukung!"*.

## Security & Performance
- Hanya dapat dijalankan oleh pengguna bertipe Evaluator / Admin.
- Proses berjalan secara efisien di backend Google Apps Script.
