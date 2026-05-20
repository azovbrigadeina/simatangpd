/**
 * Auth & User Management Module
 */

function prosesLogin(username, password) {
  const u = username.trim(); const p = password.trim();

  if (SETTINGS.USE_FIREBASE) {
    try {
      const escapedU = Firebase.escapeKey(u);
      const userData = Firebase.get(`users/${escapedU}`);
      if (userData && userData.password === p) {
        const role = userData.role;
        const nama_opd = userData.nama_opd;
        
        let sudahIsi = false;
        if (role === "Responden") {
          const escapedOPD = Firebase.escapeKey(nama_opd);
          const jawabanOPD = Firebase.get(`jawaban/${escapedOPD}`);
          sudahIsi = (jawabanOPD && Object.keys(jawabanOPD).length > 0);
        }

        return { 
          status: "success", 
          role: role, 
          nama_opd: nama_opd, 
          username: u,
          sudahIsi: sudahIsi
        };
      }
      return { status: "error", message: "Username atau Password Salah!" };
    } catch(e) {
      return { status: "error", message: "Koneksi Firebase Gagal: " + e.toString() };
    }
  }

  // Fallback ke Google Sheets
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName("Users");
  const data = userSheet.getDataRange().getValues();
  
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
  if (SETTINGS.USE_FIREBASE) {
    const users = Firebase.get("users");
    if (!users) return [];
    return Object.entries(users).map(([username, val]) => [
      Firebase.unescapeKey(username), val.password, val.role, val.nama_opd
    ]);
  }
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users").getDataRange().getValues().slice(1);
}

/**
 * Mengembalikan daftar user sebagai array objek terstruktur.
 * Digunakan oleh tab Pengaturan untuk mengisi dropdown pilihan OPD.
 */
function getDaftarUser() {
  if (SETTINGS.USE_FIREBASE) {
    const users = Firebase.get("users");
    if (!users) return [];
    return Object.entries(users).map(([username, val]) => ({
      username: Firebase.unescapeKey(username),
      role: val.role.toLowerCase(),
      opd: val.nama_opd
    }));
  }
  
  const rows = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users").getDataRange().getValues().slice(1);
  return rows.map(r => ({
    username: r[0].toString().trim(),
    role: r[2].toString().trim().toLowerCase(),
    opd: r[3].toString().trim()
  }));
}

function simpanUserBaru(payload) {
  if (SETTINGS.USE_FIREBASE) {
    const rawUsername = payload.username.toString().trim();
    const username = Firebase.escapeKey(rawUsername);
    const existing = Firebase.get(`users/${username}`);
    if (existing) {
      throw new Error("Username sudah terdaftar!");
    }
    Firebase.put(`users/${username}`, {
      password: payload.password.toString().trim(),
      role: payload.role,
      nama_opd: payload.nama_opd
    });
    return "User Berhasil Ditambahkan";
  }

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
  if (SETTINGS.USE_FIREBASE) {
    const u = Firebase.escapeKey(username.toString().trim());
    const existing = Firebase.get(`users/${u}`);
    if (!existing) {
      throw new Error("User tidak ditemukan");
    }
    Firebase.remove(`users/${u}`);
    return "User berhasil dihapus";
  }

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
