/**
 * Skrip Migrasi Data Satu-Kali-Jalan (One-Time Migration)
 * Menjalankan fungsi ini akan menyalin seluruh data dari Google Sheets saat ini ke Firebase Realtime Database.
 */
function migrateDataToFirebase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Users
  const userSheet = ss.getSheetByName("Users");
  if (userSheet) {
    const data = userSheet.getDataRange().getValues().slice(1);
    const usersObj = {};
    data.forEach(r => {
      if (r[0]) {
        const escapedUser = Firebase.escapeKey(r[0].toString().trim());
        usersObj[escapedUser] = {
          password: r[1].toString().trim(),
          role: r[2].toString().trim(),
          nama_opd: r[3].toString().trim()
        };
      }
    });
    Firebase.put("users", usersObj);
    Logger.log("Tabel Users berhasil dimigrasikan.");
  }

  // 2. Master OPD
  const opdSheet = ss.getSheetByName("Master_OPD");
  if (opdSheet) {
    const data = opdSheet.getRange(2, 1, opdSheet.getLastRow() - 1, 1).getValues();
    const opdList = data.map(r => r[0].toString().trim()).filter(n => n !== "");
    Firebase.put("master_opd", opdList);
    Logger.log("Tabel Master OPD berhasil dimigrasikan.");
  }

  // 3. Master Pertanyaan
  const pertSheet = ss.getSheetByName("Master_Pertanyaan");
  if (pertSheet) {
    const data = pertSheet.getRange(2, 1, pertSheet.getLastRow() - 1, 8).getValues();
    const pertObj = {};
    data.forEach(r => {
      const idSoal = Firebase.escapeKey(r[1].toString().trim());
      const level = Number(r[3]);
      const key = `${idSoal}_${level}`;
      pertObj[key] = {
        no: r[0],
        id_soal: r[1].toString().trim(), // Simpan ID asli yang belum diescape untuk data dalam objek jika diperlukan
        pertanyaan: r[2].toString(),
        level: level,
        indikator: r[4].toString(),
        kolom5: r[5],
        kolom6: r[6],
        bobot: Number(r[7] || 0)
      };
    });
    Firebase.put("master_pertanyaan", pertObj);
    Logger.log("Tabel Master Pertanyaan berhasil dimigrasikan.");
  }

  // 4. Jawaban
  const jawSheet = ss.getSheetByName("Jawaban");
  if (jawSheet && jawSheet.getLastRow() > 1) {
    const data = jawSheet.getDataRange().getValues().slice(1);
    const jawObj = {};
    data.forEach(r => {
      const opd = Firebase.escapeKey(r[1].toString().trim());
      const idSoal = Firebase.escapeKey(r[2].toString().trim());
      if (!jawObj[opd]) jawObj[opd] = {};
      jawObj[opd][idSoal] = {
        timestamp: r[0],
        level: Number(r[3]),
        link: r[4] ? r[4].toString() : ""
      };
    });
    
    // Upload per OPD agar tidak melebihi payload request UrlFetch
    for (let opd in jawObj) {
      Firebase.put(`jawaban/${opd}`, jawObj[opd]);
    }
    Logger.log("Tabel Jawaban berhasil dimigrasikan.");
  }

  // 5. Verifikasi
  const verSheet = ss.getSheetByName("Verifikasi");
  if (verSheet && verSheet.getLastRow() > 1) {
    const data = verSheet.getDataRange().getValues().slice(1);
    const verObj = {};
    data.forEach(r => {
      const opd = Firebase.escapeKey(r[1].toString().trim());
      const idSoal = Firebase.escapeKey(r[2].toString().trim());
      if (!verObj[opd]) verObj[opd] = {};
      verObj[opd][idSoal] = {
        timestamp: r[0],
        skala_responden: Number(r[3] || 0),
        skala_evaluator: r[4] !== "" ? Number(r[4]) : "",
        catatan_evaluator: r[5] ? r[5].toString() : "",
        skala_provinsi: r[6] !== "" ? Number(r[6]) : "",
        catatan_provinsi: r[7] ? r[7].toString() : ""
      };
    });
    
    for (let opd in verObj) {
      Firebase.put(`verifikasi/${opd}`, verObj[opd]);
    }
    Logger.log("Tabel Verifikasi berhasil dimigrasikan.");
  }

  // 6. Pengaturan
  const pengSheet = ss.getSheetByName("Pengaturan");
  if (pengSheet && pengSheet.getLastRow() > 1) {
    const data = pengSheet.getRange(2, 1, pengSheet.getLastRow() - 1, 3).getValues();
    const pengObj = {};
    data.forEach(r => {
      if (r[0]) {
        const scope = Firebase.escapeKey(r[0].toString().trim().toUpperCase());
        pengObj[scope] = {
          scope: r[0].toString().trim().toUpperCase(), // Nilai asli tanpa escape untuk data dalam objek
          tgl_buka: r[1],
          tgl_tutup: r[2]
        };
      }
    });
    Firebase.put("pengaturan", pengObj);
    Logger.log("Tabel Pengaturan berhasil dimigrasikan.");
  }

  // 7. Catatan Komponen
  const ckSheet = ss.getSheetByName("Catatan_Komponen");
  if (ckSheet && ckSheet.getLastRow() > 1) {
    const data = ckSheet.getDataRange().getValues().slice(1);
    const ckObj = {};
    data.forEach(r => {
      const opd = Firebase.escapeKey(r[1].toString().trim());
      ckObj[opd] = {
        pt_p: r[2] ? r[2].toString() : "",
        pt_r: r[3] ? r[3].toString() : "",
        ai_p: r[4] ? r[4].toString() : "",
        ai_r: r[5] ? r[5].toString() : "",
        pm_p: r[6] ? r[6].toString() : "",
        pm_r: r[7] ? r[7].toString() : "",
        ep_p: r[8] ? r[8].toString() : "",
        ep_r: r[9] ? r[9].toString() : ""
      };
    });
    Firebase.put("catatan_komponen", ckObj);
    Logger.log("Tabel Catatan Komponen berhasil dimigrasikan.");
  }

  return "Migrasi Selesai!";
}

/**
 * Fungsi Wrapper untuk Push Data secara Interaktif dengan Umpan Balik UI
 */
function syncSheetsToFirebaseInteractive() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    "Konfirmasi Push Data",
    "Apakah Anda yakin ingin MENGIRIM seluruh data dari Sheets saat ini untuk menimpa database Firebase?\n\n(Tindakan ini akan menimpa data di Firebase dengan data dari Sheets ini)",
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    const res = migrateDataToFirebase();
    ui.alert("Sukses", "Seluruh data Sheets berhasil dikirim dan disinkronkan ke Firebase!", ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("Gagal", "Terjadi kesalahan saat sinkronisasi: " + e.message, ui.ButtonSet.OK);
  }
}

/**
 * Menarik seluruh data dari Firebase RTDB kembali ke Google Sheets untuk SIMatang
 */
function pullFirebaseToSheetsInteractive() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    "Konfirmasi Tarik Data (Pull)",
    "Apakah Anda yakin ingin MENARIK seluruh data dari Firebase?\n\n(Tindakan ini akan MEMBERSIHKAN dan MENIMPA data pada Sheets saat ini dengan data terbaru dari Firebase)",
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    // 1. Pull Users
    const shUsers = ss.getSheetByName("Users");
    if (shUsers) {
      const usersData = Firebase.get("users") || {};
      const rows = [["Username", "Password", "Role", "Nama_OPD"]];
      Object.keys(usersData).forEach(escapedKey => {
        const u = usersData[escapedKey];
        rows.push([
          Firebase.unescapeKey(escapedKey),
          u.password || "",
          u.role || "",
          u.nama_opd || ""
        ]);
      });
      shUsers.clearContents();
      shUsers.getRange(1, 1, rows.length, 4).setValues(rows);
      Logger.log("Users pulled successfully.");
    }

    // 2. Pull Master OPD
    const shOPD = ss.getSheetByName("Master_OPD");
    if (shOPD) {
      const opdData = Firebase.get("master_opd") || {};
      const rows = [["Nama OPD"]];
      if (Array.isArray(opdData)) {
        opdData.forEach(name => { if (name) rows.push([name]); });
      } else {
        Object.keys(opdData).forEach(escapedKey => {
          rows.push([opdData[escapedKey].nama || Firebase.unescapeKey(escapedKey)]);
        });
      }
      shOPD.clearContents();
      shOPD.getRange(1, 1, rows.length, 1).setValues(rows);
      Logger.log("Master OPD pulled successfully.");
    }

    // 3. Pull Master Pertanyaan
    const shPert = ss.getSheetByName("Master_Pertanyaan");
    if (shPert) {
      const pertData = Firebase.get("master_pertanyaan") || {};
      const rows = [["No", "id_soal", "pertanyaan", "level", "indikator", "kolom5", "kolom6", "bobot"]];
      Object.keys(pertData).forEach(k => {
        const p = pertData[k];
        rows.push([
          p.no || "",
          Firebase.unescapeKey(p.id_soal || k.split("_")[0]),
          p.pertanyaan || "",
          p.level || 0,
          p.indikator || "",
          p.kolom5 || "",
          p.kolom6 || "",
          p.bobot || 0
        ]);
      });
      shPert.clearContents();
      shPert.getRange(1, 1, rows.length, 8).setValues(rows);
      Logger.log("Master Pertanyaan pulled successfully.");
    }

    // 4. Pull Jawaban
    const shJawaban = ss.getSheetByName("Jawaban");
    if (shJawaban) {
      const jawData = Firebase.get("jawaban") || {};
      const rows = [["Timestamp", "Nama OPD", "ID Soal", "Skala Pilihan / Jawaban", "Link Bukti Dukung"]];
      Object.keys(jawData).forEach(opdEscaped => {
        const opdName = Firebase.unescapeKey(opdEscaped);
        const opdAnswers = jawData[opdEscaped] || {};
        Object.keys(opdAnswers).forEach(idSoalEscaped => {
          const ans = opdAnswers[idSoalEscaped] || {};
          rows.push([
            ans.timestamp || new Date().toISOString(),
            opdName,
            Firebase.unescapeKey(idSoalEscaped),
            ans.level || ans.skala || "",
            ans.link || ""
          ]);
        });
      });
      shJawaban.clearContents();
      if (rows.length > 1) {
        shJawaban.getRange(1, 1, rows.length, 5).setValues(rows);
      } else {
        shJawaban.getRange(1, 1, 1, 5).setValues(rows);
      }
      Logger.log("Jawaban pulled successfully.");
    }

    // 5. Pull Verifikasi
    const shVerif = ss.getSheetByName("Verifikasi");
    if (shVerif) {
      const verifData = Firebase.get("verifikasi") || {};
      const rows = [["Timestamp", "Nama OPD", "ID Soal", "Skala Responden", "Skala Evaluator", "Catatan Evaluator", "Skala Provinsi", "Catatan Provinsi"]];
      Object.keys(verifData).forEach(opdEscaped => {
        const opdName = Firebase.unescapeKey(opdEscaped);
        const opdVerif = verifData[opdEscaped] || {};
        Object.keys(opdVerif).forEach(idSoalEscaped => {
          const v = opdVerif[idSoalEscaped] || {};
          rows.push([
            v.timestamp || new Date().toISOString(),
            opdName,
            Firebase.unescapeKey(idSoalEscaped),
            v.skala_responden || "",
            v.skala_evaluator || "",
            v.catatan_evaluator || "",
            v.skala_provinsi || "",
            v.catatan_provinsi || ""
          ]);
        });
      });
      shVerif.clearContents();
      if (rows.length > 1) {
        shVerif.getRange(1, 1, rows.length, 8).setValues(rows);
      } else {
        shVerif.getRange(1, 1, 1, 8).setValues(rows);
      }
      Logger.log("Verifikasi pulled successfully.");
    }

    // 6. Pull Pengaturan
    const shPeng = ss.getSheetByName("Pengaturan");
    if (shPeng) {
      const pengData = Firebase.get("pengaturan") || {};
      const rows = [["Scope", "Tanggal Buka", "Tanggal Tutup"]];
      Object.keys(pengData).forEach(scopeEscaped => {
        const p = pengData[scopeEscaped] || {};
        rows.push([
          p.scope || Firebase.unescapeKey(scopeEscaped),
          p.tgl_buka || "",
          p.tgl_tutup || ""
        ]);
      });
      shPeng.clearContents();
      shPeng.getRange(1, 1, rows.length, 3).setValues(rows);
      Logger.log("Pengaturan pulled successfully.");
    }

    // 7. Pull Catatan Komponen
    const shCK = ss.getSheetByName("Catatan_Komponen");
    if (shCK) {
      const ckData = Firebase.get("catatan_komponen") || {};
      const rows = [["Timestamp", "Nama OPD", "pt_p", "pt_r", "ai_p", "ai_r", "pm_p", "pm_r", "ep_p", "ep_r"]];
      Object.keys(ckData).forEach(opdEscaped => {
        const opdName = Firebase.unescapeKey(opdEscaped);
        const ck = ckData[opdEscaped] || {};
        rows.push([
          ck.timestamp || new Date().toISOString(),
          opdName,
          ck.pt_p || "",
          ck.pt_r || "",
          ck.ai_p || "",
          ck.ai_r || "",
          ck.pm_p || "",
          ck.pm_r || "",
          ck.ep_p || "",
          ck.ep_r || ""
        ]);
      });
      shCK.clearContents();
      if (rows.length > 1) {
        shCK.getRange(1, 1, rows.length, 10).setValues(rows);
      } else {
        shCK.getRange(1, 1, 1, 10).setValues(rows);
      }
      Logger.log("Catatan Komponen pulled successfully.");
    }

    ui.alert("Sukses", "Seluruh data berhasil ditarik dari Firebase ke Google Sheets!", ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("Gagal", "Terjadi kesalahan saat menarik data: " + e.message, ui.ButtonSet.OK);
  }
}

