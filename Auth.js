/**
 * Auth & User Management Module
 */

function prosesLogin(username, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName("Users");
  const data = userSheet.getDataRange().getValues();
  const u = username.trim(); const p = password.trim();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === u && data[i][1].toString() === p) {
      const role = data[i][2];
      const nama_opd = data[i][3];
      
      let sudahIsi = false;
      if (role === "Responden") {
        const jawabanSheet = ss.getSheetByName("Jawaban");
        if (jawabanSheet && jawabanSheet.getLastRow() > 1) {
          const dataJawaban = jawabanSheet.getDataRange().getValues();
          sudahIsi = dataJawaban.some(row => row[1] === nama_opd);
        }
      }

      return { 
        status: "success", 
        role: role, 
        nama_opd: nama_opd, 
        username: data[i][0],
        sudahIsi: sudahIsi
      };
    }
  }
  return { status: "error", message: "Username atau Password Salah!" };
}

function getAllUsers() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users").getDataRange().getValues().slice(1);
}

/**
 * Mengembalikan daftar user sebagai array objek terstruktur.
 * Digunakan oleh tab Pengaturan untuk mengisi dropdown pilihan OPD.
 */
function getDaftarUser() {
  const rows = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users").getDataRange().getValues().slice(1);
  return rows.map(r => ({
    username: r[0].toString().trim(),
    role: r[2].toString().trim().toLowerCase(),
    opd: r[3].toString().trim()
  }));
}

function simpanUserBaru(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Users");
  const data = sheet.getDataRange().getValues();
  const usernameExist = data.some(row => row[0].toString() === payload.username.toString());
  
  if (usernameExist) {
    throw new Error("Username sudah terdaftar!");
  }
  
  sheet.appendRow([
    payload.username, 
    payload.password, 
    payload.role, 
    payload.nama_opd
  ]);
  
  return "User Berhasil Ditambahkan";
}

function hapusUser(username) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Users");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === username.toString()) {
      sheet.deleteRow(i + 1);
      return "User berhasil dihapus";
    }
  }
  throw new Error("User tidak ditemukan");
}
