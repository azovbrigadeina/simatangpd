# Design Spec: Fitur Refresh Snapshot Bukti Dukung pada Modal Verifikasi Data

## Overview
Fitur ini memberikan kemampuan kepada Evaluator/Admin untuk membuat ulang (*re-snapshot*) folder bukti dukung Google Drive milik OPD secara rekursif langsung dari modal verifikasi data. Fitur ini menyelesaikan permasalahan bukti dukung OPD yang sempat tersnapshot secara tidak lengkap (karena subfolder belum ter-copy pada versi terdahulu).

## Problem Statement
OPD yang melakukan *submit final* sebelum pembaruan fungsi snapshot rekursif memiliki folder arsip di Admin Drive yang hanya berisi file *root-level* (subfolder tidak ikut ter-copy). Evaluator/Admin membutuhkan cara praktis untuk mememicu pembuatan ulang snapshot yang lengkap tanpa harus meminta OPD resubmit.

## Detailed Design & Requirements

### 1. Backend (`Evaluator.js`)
- **Fungsi `resnapshotItem(namaOPD, idSoal)`**:
  1. Mengambil data `jawaban/${escapedOPD}/${idSoal}` dari Firebase.
  2. Mengambil URL Drive asli responden (`j.link`).
  3. Memanggil `snapshotDriveFolder(namaOPD, j.link)` (yang kini menggunakan `copyFolderRecursive`).
  4. Jika snapshot baru berhasil dibuat:
     - Memperbarui `jawaban/${escapedOPD}/${idSoal}/link_arsip` dengan URL snapshot baru.
     - Mengembalikan objek `{ success: true, newLinkArsip: newUrl }`.
  5. Jika gagal/link kosong, mengembalikan `{ success: false, message: errorMsg }`.

- **Fungsi `resnapshotAllByOPD(namaOPD)`**:
  1. Mengambil seluruh `jawaban/${escapedOPD}` dari Firebase.
  2. Melakukan iterasi untuk setiap item `jawaban` yang memiliki `link`.
  3. Memanggil `snapshotDriveFolder(namaOPD, j.link)` untuk setiap item tersebut.
  4. Melakukan `Firebase.patch` untuk memperbarui seluruh `link_arsip`.
  5. Mengembalikan `{ success: true, count: updatedCount }`.

### 2. Frontend (`Scripts.html`)
- **Tombol per-Item Bukti Dukung**:
  - Pada area link bukti dukung setiap item soal, jika terdapat link bukti dukung:
    - Menampilkan tombol: `<button class="btn btn-sm btn-outline-info text-truncate me-1" onclick="doResnapshotItem('${opdName}', '${it.id_soal}')" title="Buat ulang snapshot rekursif untuk item ini"><i class="bi bi-arrow-repeat me-1"></i> Refresh Snapshot</button>`

- **Tombol Batch di Header Toolbar**:
  - Pada toolbar header modal verifikasi (di samping tombol *Samakan Semua*):
    - Menampilkan tombol: `<button class="btn btn-sm btn-outline-info fw-bold" onclick="doResnapshotAll('${opdName}')"><i class="bi bi-arrow-repeat me-1"></i> Refresh Semua Snapshot</button>`

- **Interaksi & Feedback User**:
  - Menampilkan loading `Swal.fire({ title: 'Memproses Snapshot Ulang...', didOpen: () => Swal.showLoading() })` saat proses berjalan.
  - Setelah selesai:
    - Memperbarui data `vData` lokal.
    - Memanggil `renderVList(opdName)` untuk memperbarui UI tanpa perlu menutup modal.
    - Menampilkan notifikasi sukses Swal toast / alert.

## Security & Access Control
- Hanya pengguna bertipe Evaluator / Admin (sesuai peran di halaman Verifikasi) yang dapat memicu `resnapshotItem` dan `resnapshotAllByOPD`.
- Hasil snapshot baru secara otomatis menggantikan `link_arsip` sebelumnya di Firebase.
