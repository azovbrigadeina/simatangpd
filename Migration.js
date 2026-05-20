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
