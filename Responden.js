/**
 * Responden Module
 */

function getPertanyaan() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_Pertanyaan");
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  // Hanya ambil kolom A-H (1-8) agar lebih ringan
  return sheet.getRange(2, 1, lastRow - 1, 8).getValues();
}

function simpanSemuaJawaban(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Jawaban");
  const ts = new Date();
  const rows = payload.jawaban.map(item => [ts, payload.opd, item.id, item.level, item.link]);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  return "Berhasil";
}

/**
 * Cek apakah periode pengisian sedang terbuka untuk OPD tertentu.
 * Urutan prioritas: Per-OPD → Global → Tidak ada pengaturan (terbuka)
 * @param {string} namaOPD - Nama OPD yang akan dicek
 * @returns {{ isOpen: boolean, pesan: string, buka: string, tutup: string }}
 */
function cekStatusPeriode(namaOPD) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Pengaturan");

  if (!sheet || sheet.getLastRow() < 2) {
    return { isOpen: true, pesan: "Tidak ada pengaturan periode aktif.", buka: "", tutup: "" };
  }

  const rows = sheet.getDataRange().getValues().slice(1); // skip header
  const now = new Date();

  // Cari pengaturan per-OPD dulu
  let setting = rows.find(r => r[0].toString().trim().toUpperCase() === namaOPD.toString().trim().toUpperCase());

  // Fallback ke pengaturan GLOBAL
  if (!setting) {
    setting = rows.find(r => r[0].toString().trim().toUpperCase() === "GLOBAL");
  }

  // Jika tidak ada pengaturan sama sekali, buka
  if (!setting || !setting[1] || !setting[2]) {
    return { isOpen: true, pesan: "Tidak ada pengaturan periode aktif.", buka: "", tutup: "" };
  }

  const tglBuka = new Date(setting[1]);
  const tglTutup = new Date(setting[2]);

  const fmt = (d) => Utilities.formatDate(new Date(d), "GMT+7", "dd MMM yyyy HH:mm");

  if (now < tglBuka) {
    return {
      isOpen: false,
      pesan: `Periode pengisian belum dibuka. Dibuka pada ${fmt(tglBuka)}.`,
      buka: fmt(tglBuka),
      tutup: fmt(tglTutup)
    };
  }

  if (now > tglTutup) {
    return {
      isOpen: false,
      pesan: `Periode pengisian telah ditutup pada ${fmt(tglTutup)}.`,
      buka: fmt(tglBuka),
      tutup: fmt(tglTutup)
    };
  }

  return {
    isOpen: true,
    pesan: `Pengisian terbuka hingga ${fmt(tglTutup)}.`,
    buka: fmt(tglBuka),
    tutup: fmt(tglTutup)
  };
}
