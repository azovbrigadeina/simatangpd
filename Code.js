/**
 * FILE INI SUDAH DIMODULARISASI.
 * Silakan lihat file-file berikut untuk logika backend:
 * - Main.gs (Entry point & helper)
 * - Auth.gs (Login & User management)
 * - Responden.gs (Logika Responden)
 * - Evaluator.gs (Logika Evaluator & Admin)
 */

function debugData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ckSheet = ss.getSheetByName("Catatan_Komponen");
  const ds_ck = (ckSheet && ckSheet.getLastRow() > 1) ? ckSheet.getDataRange().getValues().slice(1) : [];
  return JSON.stringify(ds_ck);
}