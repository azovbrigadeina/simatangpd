/**
 * Responden Module
 */

function getPertanyaan() {
  let list = [];
  if (SETTINGS.USE_FIREBASE) {
    const pert = Firebase.getCachedMasterPertanyaan();
    if (pert) {
      list = Object.values(pert).map(p => [
        p.no || "",
        p.id_soal || "",
        p.pertanyaan || "",
        p.level || 0,
        p.indikator || "",
        p.kolom5 || "",
        p.kolom6 || "",
        p.bobot || 0
      ]);
    }
  } else {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_Pertanyaan");
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      list = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    }
  }

  // Urutkan berdasarkan id_soal (indeks 1) secara natural, lalu level (indeks 3)
  return list.sort((a, b) => {
    const idA = String(a[1] || "");
    const idB = String(b[1] || "");
    const cmp = idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp;
    return (Number(a[3]) || 0) - (Number(b[3]) || 0);
  });
}

function simpanSemuaJawaban(payload) {
  const isFinal = payload.isFinal !== undefined ? payload.isFinal : true;
  const ts = new Date().toISOString();

  if (SETTINGS.USE_FIREBASE) {
    const opd = Firebase.escapeKey(payload.opd);
    
    const updates = {};
    payload.jawaban.forEach(item => {
      if (item && item.id && (item.level || item.link)) {
        const escapedId = Firebase.escapeKey(item.id);
        updates[escapedId] = {
          timestamp: ts,
          level: Number(item.level || 0),
          link: item.link || ""
        };
      }
    });
    
    if (Object.keys(updates).length > 0) {
      Firebase.patch(`jawaban/${opd}`, updates);
    }
    
    Firebase.put(`status_pengisian/${opd}`, {
      status: isFinal ? "SUBMITTED" : "DRAFT",
      updated_at: ts
    });
    
    return "Berhasil";
  }

  // Fallback ke Google Sheets
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Jawaban");
  if (!sheet) {
    sheet = ss.insertSheet("Jawaban");
    sheet.appendRow(["Timestamp", "OPD", "ID_Soal", "Level", "Link"]);
  }

  // Hapus jawaban terdahulu untuk OPD ini agar overwrite
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === payload.opd) {
      sheet.deleteRow(i + 1);
    }
  }

  // Tulis jawaban baru
  const validJawaban = payload.jawaban.filter(item => item && (item.level || item.link));
  if (validJawaban.length > 0) {
    const dateObj = new Date();
    const rows = validJawaban.map(item => [dateObj, payload.opd, item.id, item.level, item.link]);
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }

  // Simpan status pengisian
  let statusSheet = ss.getSheetByName("Status_Pengisian");
  if (!statusSheet) {
    statusSheet = ss.insertSheet("Status_Pengisian");
    statusSheet.appendRow(["OPD", "Status", "Timestamp"]);
  }
  const sData = statusSheet.getDataRange().getValues();
  let foundIndex = -1;
  for (let i = 1; i < sData.length; i++) {
    if (sData[i][0] === payload.opd) {
      foundIndex = i + 1;
      break;
    }
  }
  const statusStr = isFinal ? "SUBMITTED" : "DRAFT";
  if (foundIndex > 0) {
    statusSheet.getRange(foundIndex, 2, 1, 2).setValues([[statusStr, new Date()]]);
  } else {
    statusSheet.appendRow([payload.opd, statusStr, new Date()]);
  }

  return "Berhasil";
}

/**
 * Mengambil jawaban tersimpan dan status pengisian responden.
 * @param {string} namaOPD
 * @returns {{ jawaban: Object, isFinal: boolean, hasDraft: boolean }}
 */
function getJawabanResponden(namaOPD) {
  if (!namaOPD) return { jawaban: {}, isFinal: false, hasDraft: false };

  if (SETTINGS.USE_FIREBASE) {
    const escapedOPD = Firebase.escapeKey(namaOPD);
    const jawabanOPD = Firebase.get(`jawaban/${escapedOPD}`) || {};
    const statusData = Firebase.get(`status_pengisian/${escapedOPD}`);
    
    const isFinal = statusData ? (statusData.status === "SUBMITTED") : false;
    
    const formattedJawaban = {};
    Object.entries(jawabanOPD).forEach(([idSoal, j]) => {
      formattedJawaban[idSoal] = {
        id: idSoal,
        level: j.level !== undefined ? j.level : "",
        link: j.link || ""
      };
    });

    return {
      jawaban: formattedJawaban,
      isFinal: isFinal,
      hasDraft: Object.keys(formattedJawaban).length > 0
    };
  }

  // Fallback Google Sheets
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Jawaban");
  const formattedJawaban = {};
  if (sheet && sheet.getLastRow() > 1) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === namaOPD) {
        const idSoal = data[i][2];
        formattedJawaban[idSoal] = {
          id: idSoal,
          level: data[i][3],
          link: data[i][4] || ""
        };
      }
    }
  }

  const statusSheet = ss.getSheetByName("Status_Pengisian");
  let isFinal = false;
  if (statusSheet && statusSheet.getLastRow() > 1) {
    const sData = statusSheet.getDataRange().getValues();
    const row = sData.find(r => r[0] === namaOPD);
    if (row && row[1] === "SUBMITTED") {
      isFinal = true;
    }
  }

  return {
    jawaban: formattedJawaban,
    isFinal: isFinal,
    hasDraft: Object.keys(formattedJawaban).length > 0
  };
}


/**
 * Cek apakah periode pengisian sedang terbuka untuk OPD tertentu.
 * Urutan prioritas: Per-OPD → Global → Tidak ada pengaturan (terbuka)
 * @param {string} namaOPD - Nama OPD yang akan dicek
 * @returns {{ isOpen: boolean, pesan: string, buka: string, tutup: string }}
 */
function cekStatusPeriode(namaOPD) {
  const now = new Date();
  const fmt = (d) => Utilities.formatDate(new Date(d), "GMT+7", "dd MMM yyyy HH:mm");

  if (SETTINGS.USE_FIREBASE) {
    const opdClean = Firebase.escapeKey(namaOPD.toString().trim().toUpperCase());
    let setting = Firebase.get(`pengaturan/${opdClean}`);
    
    if (!setting) {
      setting = Firebase.get("pengaturan/GLOBAL");
    }
    
    if (!setting || !setting.tgl_buka || !setting.tgl_tutup) {
      return { isOpen: true, pesan: "Tidak ada pengaturan periode aktif.", buka: "", tutup: "" };
    }
    
    const tglBuka = new Date(setting.tgl_buka);
    const tglTutup = new Date(setting.tgl_tutup);
    
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

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Pengaturan");

  if (!sheet || sheet.getLastRow() < 2) {
    return { isOpen: true, pesan: "Tidak ada pengaturan periode aktif.", buka: "", tutup: "" };
  }

  const rows = sheet.getDataRange().getValues().slice(1); // skip header

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
