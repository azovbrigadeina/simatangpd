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

function parseDriveUrl(url) {
  if (!url) return null;
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    return { type: 'FOLDER', id: folderMatch[1] };
  }
  const fileMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return { type: 'FILE', id: fileMatch[1] };
  }
  return null;
}

function extractDriveFolderId(url) {
  const parsed = parseDriveUrl(url);
  return parsed ? parsed.id : null;
}

function getOrCreateArchiveParentFolder() {
  if (SETTINGS.DRIVE_ARCHIVE_FOLDER_ID) {
    try {
      return DriveApp.getFolderById(SETTINGS.DRIVE_ARCHIVE_FOLDER_ID);
    } catch (e) {
      Logger.log("Folder SETTINGS.DRIVE_ARCHIVE_FOLDER_ID tidak ditemukan, menggunakan root.");
    }
  }

  const folderName = "[SIMATANG] Arsip Bukti Dukung";
  const existingFolders = DriveApp.getFoldersByName(folderName);
  if (existingFolders.hasNext()) {
    return existingFolders.next();
  }
  return DriveApp.createFolder(folderName);
}

function snapshotDriveFolder(opdName, originalDriveUrl) {
  if (!originalDriveUrl) return null;
  const parsed = parseDriveUrl(originalDriveUrl);
  if (!parsed) return null;

  try {
    const parentArchive = getOrCreateArchiveParentFolder();
    const cleanOpd = opdName.toString().trim();

    if (parsed.type === 'FOLDER') {
      try {
        const sourceFolder = DriveApp.getFolderById(parsed.id);
        const originalFolderName = sourceFolder.getName();
        const targetFolderName = `[${cleanOpd}] - ${originalFolderName}`;
        const targetFolder = parentArchive.createFolder(targetFolderName);
        
        const files = sourceFolder.getFiles();
        while (files.hasNext()) {
          const file = files.next();
          file.makeCopy(file.getName(), targetFolder);
        }
        return targetFolder.getUrl();
      } catch (e) {
        parsed.type = 'FILE';
      }
    }

    if (parsed.type === 'FILE') {
      const sourceFile = DriveApp.getFileById(parsed.id);
      const originalFileName = sourceFile.getName();
      
      const targetFolderName = `[${cleanOpd}] - File Bukti Dukung`;
      let targetFolder;
      const existingFolders = parentArchive.getFoldersByName(targetFolderName);
      if (existingFolders.hasNext()) {
        targetFolder = existingFolders.next();
      } else {
        targetFolder = parentArchive.createFolder(targetFolderName);
      }

      const copiedFile = sourceFile.makeCopy(originalFileName, targetFolder);
      return copiedFile.getUrl();
    }

    return null;
  } catch (e) {
    Logger.log("Gagal melakukan snapshot Drive item: " + e.toString());
    return null;
  }
}

/**
 * Memproses antrean snapshot latar belakang (Background Job)
 */
function processPendingSnapshotQueue() {
  if (!SETTINGS.USE_FIREBASE) return;
  
  const queue = Firebase.get("snapshot_queue") || {};
  const entries = Object.entries(queue);
  if (entries.length === 0) return;

  entries.forEach(([opdEscaped, item]) => {
    try {
      const opdName = item.opd || Firebase.unescapeKey(opdEscaped);
      const jawaban = item.jawaban || [];
      const existingJawaban = Firebase.get(`jawaban/${opdEscaped}`) || {};

      const updates = {};
      jawaban.forEach(j => {
        if (j && j.id && j.link) {
          const escapedId = Firebase.escapeKey(j.id);
          const prevItem = existingJawaban[escapedId] || {};
          let linkArsip = prevItem.link_arsip || "";

          if (!linkArsip || j.link.trim() !== (prevItem.link || "").trim()) {
            const newArsip = snapshotDriveFolder(opdName, j.link);
            if (newArsip) linkArsip = newArsip;
          }

          if (linkArsip) {
            updates[`${escapedId}/link_arsip`] = linkArsip;
          }
        }
      });

      if (Object.keys(updates).length > 0) {
        Firebase.patch(`jawaban/${opdEscaped}`, updates);
      }

      Firebase.remove(`snapshot_queue/${opdEscaped}`);
    } catch (e) {
      Logger.log("Error processing snapshot queue item: " + e.toString());
    }
  });

  cleanupSnapshotTriggers();
}

/**
 * Membuat trigger 1-kali jalan di latar belakang setelah 1 detik
 */
function scheduleSnapshotQueueTrigger() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    const existing = triggers.find(t => t.getHandlerFunction() === "processPendingSnapshotQueue");
    if (!existing) {
      ScriptApp.newTrigger("processPendingSnapshotQueue")
        .timeBased()
        .after(1000)
        .create();
    }
  } catch (e) {
    Logger.log("Gagal membuat trigger snapshot: " + e.toString());
    processPendingSnapshotQueue();
  }
}

/**
 * Membersihkan trigger sementara setelah antrean selesai
 */
function cleanupSnapshotTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => {
      if (t.getHandlerFunction() === "processPendingSnapshotQueue") {
        ScriptApp.deleteTrigger(t);
      }
    });
  } catch (e) {}
}

function simpanSemuaJawaban(payload) {
  const isFinal = payload.isFinal !== undefined ? payload.isFinal : true;
  const ts = new Date().toISOString();

  if (SETTINGS.USE_FIREBASE) {
    const opd = Firebase.escapeKey(payload.opd);
    const existingJawaban = Firebase.get(`jawaban/${opd}`) || {};
    
    const updates = {};
    const validLinkJawaban = [];

    payload.jawaban.forEach(item => {
      if (item && item.id && (item.level || item.link)) {
        const escapedId = Firebase.escapeKey(item.id);
        const prevItem = existingJawaban[escapedId] || {};
        
        updates[escapedId] = {
          timestamp: ts,
          level: Number(item.level || 0),
          link: item.link || "",
          link_arsip: prevItem.link_arsip || ""
        };

        if (isFinal && item.link && item.link.trim() !== "") {
          validLinkJawaban.push({
            id: item.id,
            link: item.link.trim()
          });
        }
      }
    });
    
    if (Object.keys(updates).length > 0) {
      Firebase.patch(`jawaban/${opd}`, updates);
    }
    
    Firebase.put(`status_pengisian/${opd}`, {
      status: isFinal ? "SUBMITTED" : "DRAFT",
      updated_at: ts
    });

    // Jika Submit Final dan ada link yang perlu di-snapshot, masukkan ke antrean asinkron
    if (isFinal && validLinkJawaban.length > 0) {
      Firebase.put(`snapshot_queue/${opd}`, {
        opd: payload.opd,
        timestamp: ts,
        jawaban: validLinkJawaban
      });
      scheduleSnapshotQueueTrigger();
    }
    
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
        link: j.link || "",
        link_arsip: j.link_arsip || ""
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

/**
 * Mengambil hasil evaluasi dan penilaian OPD untuk tampilan publik / responden
 */
function getPublicEvaluasiOpd(opdName) {
  if (!opdName) return { error: "Nama OPD harus dipilih" };
  
  const masterSoal = getPertanyaan();
  const cleanOpd = opdName.toString().trim();
  let verifData = {};
  let jawabanData = {};
  
  if (SETTINGS.USE_FIREBASE) {
    const key = Firebase.escapeKey(cleanOpd);
    verifData = Firebase.get(`verifikasi/${key}`) || {};
    jawabanData = Firebase.get(`jawaban/${key}`) || {};
  } else {
    // Fallback Google Sheets
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetV = ss.getSheetByName("Verifikasi");
    if (sheetV) {
      const dataV = sheetV.getDataRange().getValues();
      for (let i = 1; i < dataV.length; i++) {
        if (dataV[i][1] === cleanOpd) {
          const idSoal = dataV[i][2].toString();
          verifData[idSoal] = {
            skala_responden: dataV[i][3],
            skala_evaluator: dataV[i][4],
            catatan_evaluator: dataV[i][5],
            skala_provinsi: dataV[i][6],
            catatan_provinsi: dataV[i][7]
          };
        }
      }
    }
  }

  // Kelompokkan masterSoal berdasarkan id_soal (11 Variabel Utama)
  const groupedSoal = {};
  masterSoal.forEach(p => {
    const idSoal = (p[1] || "").toString().trim();
    if (!groupedSoal[idSoal]) {
      groupedSoal[idSoal] = {
        id_soal: idSoal,
        indikator: p[2] || p[4] || `Variabel ${idSoal}`,
        bobot: p[7] || 0,
        levels: {}
      };
    }
    groupedSoal[idSoal].levels[p[3]] = p[4] || p[2]; // Map level (1-5) ke deskripsi pertanyaan
  });


  let totalSkalaMandiri = 0, countMandiri = 0;
  let totalSkalaEval = 0, countEval = 0;
  let totalSkalaProv = 0, countProv = 0;

  const items = Object.values(groupedSoal).map((g, index) => {
    const idSoal = g.id_soal;
    const idKey = Firebase.escapeKey ? Firebase.escapeKey(idSoal) : idSoal;
    
    const v = verifData[idKey] || verifData[idSoal] || {};
    const j = jawabanData[idKey] || jawabanData[idSoal] || {};

    const skalaResp = (v.skala_responden !== undefined && v.skala_responden !== "") 
      ? v.skala_responden 
      : (j.skala !== undefined ? j.skala : "");
      
    const skalaEval = v.skala_evaluator !== undefined ? v.skala_evaluator : "";
    const catEval = v.catatan_evaluator || "";
    const skalaProv = v.skala_provinsi !== undefined ? v.skala_provinsi : "";
    const catProv = v.catatan_provinsi || "";

    if (skalaResp !== "" && !isNaN(skalaResp)) { totalSkalaMandiri += Number(skalaResp); countMandiri++; }
    if (skalaEval !== "" && !isNaN(skalaEval)) { totalSkalaEval += Number(skalaEval); countEval++; }
    if (skalaProv !== "" && !isNaN(skalaProv)) { totalSkalaProv += Number(skalaProv); countProv++; }

    // Ambil teks pertanyaan dari level yang dipilih oleh responden
    const chosenLevel = skalaResp !== "" ? Number(skalaResp) : 0;
    const chosenText = g.levels[chosenLevel] || (chosenLevel > 0 ? `Jawaban Level ${chosenLevel}` : "Responden belum memilih jawaban pada variabel ini.");

    // Cek apakah ada perbedaan nilai antara responden vs evaluator
    const isEvalDiff = (skalaEval !== "" && Number(skalaEval) !== Number(skalaResp));
    const isProvDiff = (skalaProv !== "" && Number(skalaProv) !== Number(skalaResp));

    return {
      no: index + 1,
      id_soal: idSoal,
      indikator: g.indikator,
      bobot: g.bobot,
      pertanyaan_terpilih: chosenText,
      skala_responden: skalaResp,
      link_bukti: j.link || "",
      skala_evaluator: skalaEval,
      catatan_evaluator: catEval,
      skala_provinsi: skalaProv,
      catatan_provinsi: catProv,
      is_different_eval: isEvalDiff,
      is_different_prov: isProvDiff
    };
  });

  const idxMandiri = countMandiri > 0 ? (totalSkalaMandiri / countMandiri).toFixed(2) : "0.00";
  const idxEval = countEval > 0 ? (totalSkalaEval / countEval).toFixed(2) : "Belum Dinilai";
  const idxProv = countProv > 0 ? (totalSkalaProv / countProv).toFixed(2) : "Belum Dinilai";

  return {
    opd: cleanOpd,
    indeks: {
      mandiri: idxMandiri,
      evaluator: idxEval,
      provinsi: idxProv
    },
    items: items
  };
}


/**
 * Mengambil daftar OPD publik dari Firebase atau Google Sheets
 */
function getPublicOpdList() {
  if (SETTINGS.USE_FIREBASE) {
    const users = Firebase.get("users") || {};
    const opds = [...new Set(Object.values(users).map(u => u.nama_opd || u.opd || u.username).filter(Boolean))].sort();
    if (opds.length > 0) return opds;
  }
  
  if (typeof getListOPD === 'function') {
    return getListOPD();
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Master_OPD") || ss.getSheetByName("Users");
  if (!sheet) return [];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  return [...new Set(data.map(row => row[3] || row[0]).filter(Boolean))].sort();
}

function getOpdList() {
  return getPublicOpdList();
}


