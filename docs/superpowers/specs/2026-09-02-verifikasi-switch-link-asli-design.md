# Design Spec: Switch Link Evd. Asli & Audit Timestamp pada Modal Verifikasi Data

## Overview
Fitur ini bertujuan untuk menambahkan sakelar (toggle switch) *"Cek Link Evd. Asli"* pada modal verifikasi data evaluasi, serta menampilkan informasi timestamp waktu pengiriman (submit) dari responden sebagai bahan audit keabsahan dokumen bukti dukung.

## Problem Statement
Ketika responden mengunggah bukti dukung dalam bentuk folder Google Drive yang berisi subfolder di dalamnya, pada versi awal snapshot subfolder tersebut sempat tidak terkelola. Untuk kebutuhan klarifikasi dan audit keabsahan data, evaluator memerlukan akses cepat ke link asli responden (selain link Snapshot Admin) beserta timestamp kapan data tersebut disubmit oleh responden.

## Detailed Design & Requirements

### 1. Backend (`Evaluator.js`)
- Mengupdate `getJawabanForVerifikasi(namaOPD)`:
  - Mengambil data `status_pengisian` OPD untuk mendapatkan `submitted_at` / `updated_at`.
  - Mengembalikan objek respons yang menyertakan `submitted_at` (formatted ISO / readable String).
  - Memastikan setiap item `jawaban` mengembalikan:
    - `link`: URL snapshot admin (`link_arsip` jika ada, fallback `link`).
    - `link_original`: URL asli responden (`link`).
    - `is_arsip`: Boolean penanda apakah `link_arsip` ada.
    - `item_timestamp`: Timestamp pengisian per-item (`j.timestamp`).

### 2. Frontend (`Scripts.html`)
#### A. Toolbar Header Modal Verifikasi
- Menambahkan Form Switch Bootstrap di toolbar header modal verifikasi data (`v-list` header):
  ```html
  <div class="form-check form-switch d-inline-block ms-3 me-2 align-middle">
    <input class="form-check-input" type="checkbox" id="switch-link-asli" onchange="toggleLinkAsli(this.checked)">
    <label class="form-check-label fw-bold text-dark" for="switch-link-asli">
      <i class="bi bi-folder-symlink me-1"></i>Cek Link Evd. Asli
    </label>
  </div>
  ```
- Menambahkan informasi Timestamp Pengiriman Responden di header modal:
  ```html
  <div class="badge bg-light text-dark border p-2 ms-auto align-middle">
    <i class="bi bi-clock-history me-1 text-primary"></i>
    <strong>Submit Responden:</strong> ${formattedSubmitTime}
  </div>
  ```

#### B. Rendering Item Bukti Dukung (`linkHtml`)
- Ketika `switch-link-asli` dalam keadaan **OFF** (Default):
  - Tampilan link bukti dukung tetap standar (Menampilkan tombol **🔒 Snapshot Admin** jika `is_arsip` true).
- Ketika `switch-link-asli` dalam keadaan **ON**:
  - Jika `is_arsip` true dan `link_original` tersedia:
    - Menampilkan tombol **🔒 Snapshot Admin**
    - Di sampingnya menampilkan tombol sekunder: **🔗 Link Evd. Asli** (`link_original`) bertuliskan *"Link Asli Responden"* dengan badge/keterangan khusus.
    - Menampilkan *tooltip* / catatan timestamp waktu pengisian berkas tersebut oleh responden.

## User Experience Flow
1. Evaluator membuka Modal Verifikasi Data suatu OPD.
2. Header modal menampilkan status submit beserta **Timestamp Submit Responden** (misal: `02/09/2026 10:30:15 WIB`).
3. Secara default, bukti dukung yang dibuka evaluator adalah link **🔒 Snapshot Admin** (terkunci).
4. Jika evaluator merasa perlu melakukan audit/cross-check berkas asli responden, evaluator mengaktifkan switch **"Cek Link Evd. Asli"**.
5. Tombol **🔗 Link Evd. Asli** akan muncul berdampingan dengan Snapshot Admin pada seluruh item bukti dukung yang relevan.

## Audit & Security Considerations
- Link Snapshot Admin tetap menjadi rujukan utama penilaian.
- Tombol Link Evd. Asli diberi penanda visual agar evaluator dapat membedakan antara snapshot resmi terkunci dan drive live responden.
