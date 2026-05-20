/**
 * Evaluator & Admin Module
 */

function simpanVerifikasi(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ts = new Date();
  
  // 1. Batch Update Verifikasi
  const sheetV = ss.getSheetByName("Verifikasi");
  // Pastikan header ada hingga kolom 8
  if (sheetV.getLastColumn() < 8) {
    sheetV.getRange(1, 1, 1, 8).setValues([["Timestamp", "OPD", "ID_Variabel", "Skala_Responden", "Skala_Evaluator", "Catatan_Evaluator", "Skala_Provinsi", "Catatan_Provinsi"]]);
  }

  let dataV = sheetV.getDataRange().getValues();
  const headerV = dataV[0];
  let rowsV = dataV.slice(1);

  payload.items.forEach(item => {
    let found = false;
    for (let i = 0; i < rowsV.length; i++) {
      if (rowsV[i][1] === payload.opd && rowsV[i][2].toString() === item.id_soal.toString()) {
        const isProv = payload.role === 'Provinsi';
        const evalScore = isProv ? rowsV[i][4] : item.skala_evaluator;
        const evalCat = isProv ? rowsV[i][5] : item.catatan;
        const provScore = isProv ? item.skala_provinsi : (rowsV[i][6] || "");
        const provCat = isProv ? item.catatan_provinsi : (rowsV[i][7] || "");
        
        rowsV[i] = [ts, payload.opd, item.id_soal, item.skala_responden, evalScore, evalCat, provScore, provCat];
        found = true;
        break;
      }
    }
    if (!found) {
      const isProv = payload.role === 'Provinsi';
      rowsV.push([
        ts, payload.opd, item.id_soal, item.skala_responden, 
        isProv ? "" : item.skala_evaluator, 
        isProv ? "" : item.catatan, 
        isProv ? item.skala_provinsi : "", 
        isProv ? item.catatan_provinsi : ""
      ]);
    }
  });
  
  // Overwrite range langsung tanpa clearContents (hemat 1 panggilan I/O)
  const allData = [headerV, ...rowsV];
  sheetV.getRange(1, 1, allData.length, headerV.length).setValues(allData);

  return "Sukses";
}

function getStats() {
  const rekap = getRekapVerifikasi();
  
  let sumMandiri = 0;
  let sumProvinsi = 0;
  
  let listMandiri = [];
  let listKabupaten = [];
  
  rekap.forEach(r => {
    sumMandiri += r.totalMandiri || 0;
    sumProvinsi += r.totalProvinsi || 0;
    
    listMandiri.push({ opd: r.opd, nilai: r.totalMandiri || 0 });
    listKabupaten.push({ opd: r.opd, nilai: r.totalProvinsi || 0 });
  });
  
  // Sort descending (highest to lowest)
  listMandiri.sort((a, b) => b.nilai - a.nilai);
  listKabupaten.sort((a, b) => b.nilai - a.nilai);
  
  const top5Mandiri = listMandiri.slice(0, 5);
  // Copy and reverse for lowest
  const bottom5Mandiri = [...listMandiri].reverse().slice(0, 5);
  
  const top5Kab = listKabupaten.slice(0, 5);
  const bottom5Kab = [...listKabupaten].reverse().slice(0, 5);
  
  const avgMandiri = sumMandiri / 42;
  const avgProvinsi = sumProvinsi / 42;

  return { 
    avgMandiri: avgMandiri, 
    avgProvinsi: avgProvinsi,
    top5Mandiri: top5Mandiri,
    bottom5Mandiri: bottom5Mandiri,
    top5Kab: top5Kab,
    bottom5Kab: bottom5Kab
  };
}

function getOPDSudahKirim() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetJ = ss.getSheetByName("Jawaban");
  if (sheetJ.getLastRow() < 2) return [];

  const dataJ = sheetJ.getDataRange().getValues().slice(1);
  const sheetV = ss.getSheetByName("Verifikasi");
  const dataV = (sheetV && sheetV.getLastRow() > 1) ? sheetV.getDataRange().getValues().slice(1) : [];

  // Hitung jumlah variabel per OPD dari Jawaban
  const opdMap = {};
  dataJ.forEach(r => {
    const opd = r[1];
    if (!opdMap[opd]) opdMap[opd] = { totalVar: 0, verifKab: 0, verifProv: 0 };
    opdMap[opd].totalVar++;
  });

  // Hitung variabel yang sudah diverifikasi per OPD
  dataV.forEach(r => {
    const opd = r[1];
    if (!opdMap[opd]) return;
    if (r[4] !== "" && r[4] !== null && r[4] !== undefined) opdMap[opd].verifKab++;
    if (r[6] !== "" && r[6] !== null && r[6] !== undefined) opdMap[opd].verifProv++;
  });

  return Object.entries(opdMap).map(([opd, info]) => ({
    opd: opd,
    totalVar: info.totalVar,
    verifKab: info.verifKab,
    verifProv: info.verifProv
  }));
}

function getJawabanByOPD(namaOPD) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dj = ss.getSheetByName("Jawaban").getDataRange().getValues().slice(1);
  const ds = ss.getSheetByName("Master_Pertanyaan").getDataRange().getValues().slice(1);
  const sheetVerif = ss.getSheetByName("Verifikasi");
  const dv = (sheetVerif && sheetVerif.getLastRow() > 1) ? sheetVerif.getDataRange().getValues().slice(1) : [];

  // Pre-build Map untuk lookup O(1)
  const masterMap = new Map();
  ds.forEach(s => masterMap.set(s[1].toString() + "_" + s[3].toString(), s));

  const verifMap = new Map();
  dv.forEach(v => verifMap.set(v[1] + "_" + v[2].toString(), v));

  return {
    items: dj.filter(r => r[1] === namaOPD).map(j => {
      const detail = masterMap.get(j[2].toString() + "_" + j[3].toString());
      const verif = verifMap.get(namaOPD + "_" + j[2].toString());
      return {
        id_soal: j[2], 
        pertanyaan: detail ? detail[2] : "Variabel Tidak Ditemukan", 
        indikator: detail ? detail[4] : "-",
        skala_responden: j[3], 
        link: j[4],
        skala_evaluator: verif ? verif[4] : "", 
        catatan: verif ? verif[5] : "",
        skala_provinsi: verif ? (verif[6] || "") : "",
        catatan_provinsi: verif ? (verif[7] || "") : ""
      };
    })
  };
}

function getRekapVerifikasi() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataV = ss.getSheetByName("Verifikasi").getDataRange().getValues().slice(1);
  const dataS = ss.getSheetByName("Master_Pertanyaan").getDataRange().getValues().slice(1);
  
  // Pre-build Map untuk lookup O(1) — key: "idSoal_level"
  const masterMap = new Map();
  dataS.forEach(s => masterMap.set(s[1].toString() + "_" + Number(s[3]), s));

  const rekap = {};
  dataV.forEach(r => {
    const opd = r[1]; 
    const idSoal = r[2].toString(); 
    const skalaResp = Number(r[3] || 0);
    const skalaEval = Number(r[4] || 0);
    const skalaProv = Number(r[6] || 0);

    // Lookup O(1) via Map
    const detailResp = masterMap.get(idSoal + "_" + skalaResp);
    const detailEval = masterMap.get(idSoal + "_" + skalaEval);
    const detailProv = masterMap.get(idSoal + "_" + skalaProv);

    const bobotMandiri = detailResp ? Number(detailResp[7] || 0) : 0;
    const bobotVerif = detailEval ? Number(detailEval[7] || 0) : 0;
    const bobotProv = detailProv ? Number(detailProv[7] || 0) : 0;
    
    const namaVar = detailResp ? detailResp[2] : (detailEval ? detailEval[2] : "Variabel Tidak Ditemukan");

    if (!rekap[opd]) rekap[opd] = { opd: opd, rincian: [], totalMandiri: 0, totalVerifikasi: 0, totalProvinsi: 0 };
    
    rekap[opd].rincian.push({ 
      id_soal: idSoal, 
      pertanyaan: namaVar, 
      skala_responden: skalaResp,
      indikator_responden: detailResp ? detailResp[4] : "",
      nilai_mandiri: bobotMandiri,
      skala_evaluator: skalaEval, 
      indikator_evaluator: detailEval ? detailEval[4] : "",
      nilai_verifikasi: bobotVerif,
      catatan: r[5] || "",
      skala_provinsi: skalaProv,
      indikator_provinsi: detailProv ? detailProv[4] : "",
      nilai_provinsi: bobotProv,
      catatan_provinsi: r[7] || ""
    });
    
    rekap[opd].totalMandiri += bobotMandiri;
    rekap[opd].totalVerifikasi += bobotVerif;
    rekap[opd].totalProvinsi += bobotProv;
  });

  return Object.values(rekap);
}

function hapusJawabanOPD(namaOPD) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ["Jawaban", "Verifikasi"].forEach(shName => {
    let sh = ss.getSheetByName(shName);
    if (!sh) return;
    let d = sh.getDataRange().getValues();
    if (d.length < 2) return;
    
    const header = d[0];
    const filtered = d.slice(1).filter(row => row[1] !== namaOPD);
    
    sh.clearContents();
    if (filtered.length > 0) {
      sh.getRange(1, 1, filtered.length + 1, header.length).setValues([header, ...filtered]);
    } else {
      sh.getRange(1, 1, 1, header.length).setValues([header]);
    }
  });
  return "Sukses";
}

function getListOPD() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Master_OPD");
  if (!sheet) return [];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  return data.map(row => row[0]).filter(name => name !== "");
}

/**
 * Generate Berita Acara based on Google Docs Template (Mail Merge)
 */
function generateBeritaAcara(namaOPD) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Ambil Data Rekap
    const rekapData = getRekapVerifikasi();
    const data = rekapData.find(h => h.opd === namaOPD);
    if (!data) throw new Error("Data rekap untuk OPD ini tidak ditemukan.");
    
    // 2. Ambil Data Catatan Komponen
    const ckSheet = ss.getSheetByName("Catatan_Komponen");
    const ds_ck = (ckSheet && ckSheet.getLastRow() > 1) ? ckSheet.getDataRange().getValues().slice(1) : [];
    const ckRow = ds_ck.find(s => s[1].toString().trim() === namaOPD.toString().trim());
    
    const getVal = (val) => (val !== undefined && val !== null && val.toString().trim() !== "") ? val.toString().trim() : "-";
    
    const ck = ckRow ? {
      pt_p: getVal(ckRow[2]), pt_r: getVal(ckRow[3]),
      ai_p: getVal(ckRow[4]), ai_r: getVal(ckRow[5]),
      pm_p: getVal(ckRow[6]), pm_r: getVal(ckRow[7]),
      ep_p: getVal(ckRow[8]), ep_r: getVal(ckRow[9])
    } : { pt_p:'-', pt_r:'-', ai_p:'-', ai_r:'-', pm_p:'-', pm_r:'-', ep_p:'-', ep_r:'-' };

    // 3. Construct HTML
    const getPredikatServer = (v) => {
      const n = parseFloat(v);
      if (n >= 4.51) return "PELAYANAN PRIMA (A)";
      if (n >= 4.01) return "SANGAT BAIK (A-)";
      if (n >= 3.51) return "BAIK (B)";
      if (n >= 3.01) return "BAIK DENGAN CATATAN (B-)";
      if (n >= 2.51) return "CUKUP (C)";
      if (n >= 2.01) return "CUKUP DENGAN CATATAN (C-)";
      if (n >= 1.51) return "BURUK (D)";
      if (n >= 1.01) return "SANGAT BURUK (E)";
      return "GAGAL (F)";
    };

    const ippop = parseFloat(data.nilaiIPPOP || 0).toFixed(3);
    const predikat = getPredikatServer(ippop);
    const tanggalCetak = Utilities.formatDate(new Date(), "GMT+7", "dd MMMM yyyy");
    const opdBersih = data.opd.toString().trim();
    const fileName = `Berita_Acara_PEKPPP_${opdBersih.replace(/\\s+/g, '_')}_${new Date().getTime()}`;

    // Ambil logo sebagai Base64 agar MS Word tidak memblokir gambar eksternal
    let logoSrc = "https://upload.wikimedia.org/wikipedia/commons/4/47/Lambang_Kabupaten_Muaro_Jambi.png";
    try {
      // Menggunakan User-Agent agar tidak diblokir oleh Wikimedia
      const imgFetch = UrlFetchApp.fetch(logoSrc, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      logoSrc = "data:image/png;base64," + Utilities.base64Encode(imgFetch.getBlob().getBytes());
    } catch(e) {}

    // Kop surat dengan logo Base64 dan garis bawah tebal
    const htmlContent = `
      <table style="width: 100%; border: none; margin-bottom: 5px;">
        <tr>
          <td style="width: 15%; text-align: center; border: none; vertical-align: middle;">
            <img src="${logoSrc}" width="80" height="100" />
          </td>
          <td style="width: 85%; text-align: center; border: none; vertical-align: middle;">
            <p style="margin: 0; font-weight: bold; font-size: 14pt; line-height: 1.2;">
              PEMERINTAH KABUPATEN MUARO JAMBI<br>SEKRETARIAT DAERAH
            </p>
            <p style="margin: 0; font-size: 10pt; line-height: 1.1; font-weight: normal;">
              Kompleks Perkantoran Bukit Cinto Kenang,<br>
              Jalan Lintas Timur, Sengeti 36381<br>
              Telepon (0741) 590022, 590023; Faksimile. (0741) 590028<br>
              Laman <span style="color: blue;">www.muarojambikab.go.id</span>; pos-el <span style="color: blue;">pemkab@muarojambikab.go.id</span>
            </p>
          </td>
        </tr>
      </table>
      
      <div style="border-bottom: 2pt solid black; width: 100%; margin-top: 5px; margin-bottom: 20px; font-size: 1px; line-height: 1px;">&nbsp;</div>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <p style="margin: 0; font-weight: bold; font-size: 12pt; line-height: 1.1; letter-spacing: 0.5px; text-transform: uppercase;">
          LAPORAN HASIL PEMBINAAN DAN PENGENDALIAN PENATAAN PERANGKAT DAERAH KABUPATEN MUARO JAMBI<br>
          PADA ${opdBersih.toUpperCase()}<br>
          TAHUN ${new Date().getFullYear()}
        </p>
      </div>

      <p style="font-family: 'Times New Roman', Times, serif; text-align: justify; line-height: 1.5;">
        Pada Tanggal ${tanggalCetak} Pemantauan dan Evaluasi Kinerja Penyelenggaraan Pelayanan Publik, berdasarkan hasil pengamatan di lapangan menyatakan sebagai berikut :
      </p>

      <table style="width: 100%; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; margin-bottom: 20px;" border="1" cellpadding="5">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="width: 5%; text-align: center;">No</th>
            <th style="width: 25%; text-align: center;">Komponen</th>
            <th style="width: 35%; text-align: center;">Pengamatan Lapangan</th>
            <th style="width: 35%; text-align: center;">Rekomendasi</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">1</td>
            <td>PONDASI TEKNIS</td>
            <td style="white-space: pre-wrap;">${ck.pt_p}</td>
            <td style="white-space: pre-wrap;">${ck.pt_r}</td>
          </tr>
          <tr>
            <td style="text-align: center;">2</td>
            <td>AKSESIBILITAS DAN INKLUSIF</td>
            <td style="white-space: pre-wrap;">${ck.ai_p}</td>
            <td style="white-space: pre-wrap;">${ck.ai_r}</td>
          </tr>
          <tr>
            <td style="text-align: center;">3</td>
            <td>PELIBATAN MASYARAKAT</td>
            <td style="white-space: pre-wrap;">${ck.pm_p}</td>
            <td style="white-space: pre-wrap;">${ck.pm_r}</td>
          </tr>
          <tr>
            <td style="text-align: center;">4</td>
            <td>EFEKTIVITAS PEMERINTAHAN</td>
            <td style="white-space: pre-wrap;">${ck.ep_p}</td>
            <td style="white-space: pre-wrap;">${ck.ep_r}</td>
          </tr>
        </tbody>
      </table>

      <p style="font-family: 'Times New Roman', Times, serif; text-align: justify; margin-bottom: 30px;">
        Demikian Berita Acara ini dibuat sebagaimana mestinya.
      </p>

      <!-- Page Break untuk Tanda Tangan -->
      <br clear="all" style="page-break-before: always" />

      <div style="font-family: 'Times New Roman', Times, serif; width: 100%; margin-top: 30px;">
        <p style="text-align: center; font-weight: bold; margin-bottom: 30px;">Tim Evaluator</p>
        
        <table style="width: 100%; border: none; text-align: center; margin-bottom: 50px;">
          <tr>
            <td style="width: 50%; border: none;">
              Evaluator 1<br><br><br><br><br>
              <span style="text-decoration: underline;">(...............................................)</span>
            </td>
            <td style="width: 50%; border: none;">
              Evaluator 2<br><br><br><br><br>
              <span style="text-decoration: underline;">(...............................................)</span>
            </td>
          </tr>
        </table>

        <p style="text-align: center; font-weight: bold; margin-bottom: 30px;">Mengetahui,</p>
        
        <table style="width: 100%; border: none; text-align: center;">
          <tr>
            <td style="width: 50%; border: none;">
              Ketua Evaluator<br>
              Kepala Bagian Organisasi<br><br><br><br><br>
              <span style="text-decoration: underline;">(...............................................)</span><br>
              NIP. ........................................
            </td>
            <td style="width: 50%; border: none;">
              Kepala ........................................<br><br><br><br><br><br>
              <span style="text-decoration: underline;">(...............................................)</span><br>
              NIP. ........................................
            </td>
          </tr>
        </table>
      </div>
    `;

    return {
      status: "success",
      html: htmlContent,
      fileName: fileName + ".doc"
    };

  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

/**
 * Simpan atau update pengaturan periode pengisian.
 * @param {{ tipe: 'GLOBAL'|string, tglBuka: string, tglTutup: string }} payload
 */
function simpanPeriodePengisian(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Pengaturan");

  if (!sheet) {
    sheet = ss.insertSheet("Pengaturan");
    sheet.getRange(1, 1, 1, 3).setValues([["OPD/Scope", "Tanggal Buka", "Tanggal Tutup"]]);
    sheet.getRange(1, 1, 1, 3).setFontWeight("bold");
  }

  const tipe = payload.tipe.trim().toUpperCase() === "GLOBAL" ? "GLOBAL" : payload.tipe.trim();
  const tglBuka = new Date(payload.tglBuka);
  const tglTutup = new Date(payload.tglTutup);

  if (tglTutup <= tglBuka) throw new Error("Tanggal tutup harus lebih besar dari tanggal buka.");

  const data = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues() : [];
  let found = false;
  for (let i = 0; i < data.length; i++) {
    if (data[i][0].toString().trim().toUpperCase() === tipe) {
      sheet.getRange(i + 2, 1, 1, 3).setValues([[tipe, tglBuka, tglTutup]]);
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.appendRow([tipe, tglBuka, tglTutup]);
  }

  return { status: "success", pesan: `Pengaturan periode untuk "${tipe}" berhasil disimpan.` };
}

/**
 * Ambil semua pengaturan periode yang ada di sheet Pengaturan.
 */
function getPengaturanPeriode() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Pengaturan");
  if (!sheet || sheet.getLastRow() < 2) return [];

  const fmt = (d) => {
    if (!d || d === "") return "";
    try {
      return Utilities.formatDate(new Date(d), "GMT+7", "yyyy-MM-dd'T'HH:mm");
    } catch(e) { return ""; }
  };

  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues()
    .filter(r => r[0] !== "")
    .map(r => ({
      tipe: r[0].toString().trim(),
      tglBuka: fmt(r[1]),
      tglTutup: fmt(r[2])
    }));
}

/**
 * Hapus satu baris pengaturan periode berdasarkan tipe/nama OPD.
 */
function hapusPeriodePengisian(tipe) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Pengaturan");
  if (!sheet || sheet.getLastRow() < 2) return;

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0].toString().trim().toUpperCase() === tipe.toString().trim().toUpperCase()) {
      sheet.deleteRow(i + 2);
      return { status: "success" };
    }
  }
  return { status: "notfound" };
}

