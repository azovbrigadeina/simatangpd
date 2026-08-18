# Portal Hasil & Catatan Evaluasi OPD Publik (Tahun Aktif) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan fitur Portal Hasil & Catatan Evaluasi OPD Publik pada halaman utama SIMatang-PD yang dapat diakses publik/responden secara real-time tanpa login, menampilkan Indeks Kematangan (Mandiri, Organisasi, Provinsi) serta rincian nilai dan catatan evaluator per indikator untuk tahun aktif.

**Architecture:** Meneruskan data verifikasi real-time dari backend (`Responden.js` / `Evaluator.js`) melalui fungsi endpoint `getPublicEvaluasiOpd(opdName)` ke view frontend baru (`UI_PublicHasil.html`) yang dipicu tombol terpusat di landing page (`Index.html`) dan dikelola oleh fungsi JavaScript pada `Scripts.html`.

**Tech Stack:** Google Apps Script, Firebase Realtime Database / Google Sheets, Bootstrap 5, HTML5/CSS3 (Neobrutalism Style), Vanilla JavaScript.

## Global Constraints

- Landing page button: Terdapat di bawah tombol Responden & Evaluator pada `PILIH AKSES MASUK`, terpusat (*centered*).
- Teks tombol: `📋 HASIL EVALUASI OPD TAHUN <TahunAktif>` (dinamis menggunakan tahun berjalan `new Date().getFullYear()`).
- Default display: Menampilkan semua indikator/soal (bercatatan maupun tidak), dengan filter opsi ke "Hanya yang Memiliki Catatan".
- Deployment Rule: `npx -y @google/clasp push -f`, lalu buat versi dan deploy ke ID `AKfycbzoScMV1ULBGAel1KHaebq7EPnz_u3m54HR3409liJgPi7qmNJ7k67rCifrkF8LJgtrgg`.

---

## File Structure & Responsibilities

- **Backend / Server:**
  - `Responden.js`: Menambahkan fungsi server `getPublicEvaluasiOpd(opdName)` untuk mengagregasi master pertanyaan, jawaban mandiri, dan verifikasi evaluator.
- **Frontend Templates:**
  - `UI_PublicHasil.html` [NEW]: Tampilan UI Neobrutalism untuk Portal Hasil Evaluasi Publik (Header navigation, Select OPD, Card Summary Indeks, List Indikator).
  - `Index.html`: Menambahkan tombol terpusat `📋 HASIL EVALUASI OPD TAHUN <YEAR>` di Landing Page dan menyertakan `<?!= include('UI_PublicHasil'); ?>`.
  - `Styles.html`: Menambahkan styling Neobrutalism tambahan dan `@media print` CSS untuk pengoptimalan halaman cetak A4.
  - `Scripts.html`: Menambahkan handler navigasi `openPublicHasil()`, pemicu prapembuatan dropdown OPD, `loadPublicOpdHasil()`, `renderPublicHasil()`, dan `printPublicHasil()`.

---

### Task 1: Implement Backend Endpoint `getPublicEvaluasiOpd(opdName)`

**Files:**
- Modify: `Responden.js`

**Interfaces:**
- Consumes: `getPertanyaan()`, `Firebase.get("verifikasi/" + opd)`, `Firebase.get("jawaban/" + opd)`
- Produces: `getPublicEvaluasiOpd(opdName)` returning `{ opd, indeks: { mandiri, evaluator, provinsi }, items: [...] }`

- [ ] **Step 1: Write backend endpoint `getPublicEvaluasiOpd(opdName)` in `Responden.js`**

```javascript
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

  let totalSkalaMandiri = 0, countMandiri = 0;
  let totalSkalaEval = 0, countEval = 0;
  let totalSkalaProv = 0, countProv = 0;

  const items = masterSoal.map(p => {
    const idSoal = (p[1] || "").toString().trim();
    const idKey = Firebase.escapeKey(idSoal);
    
    const v = verifData[idKey] || verifData[idSoal] || {};
    const j = jawabanData[idKey] || jawabanData[idSoal] || {};

    const skalaResp = v.skala_responden !== undefined ? v.skala_responden : (j.skala || "");
    const skalaEval = v.skala_evaluator !== undefined ? v.skala_evaluator : "";
    const catEval = v.catatan_evaluator || "";
    const skalaProv = v.skala_provinsi !== undefined ? v.skala_provinsi : "";
    const catProv = v.catatan_provinsi || "";

    if (skalaResp !== "" && !isNaN(skalaResp)) { totalSkalaMandiri += Number(skalaResp); countMandiri++; }
    if (skalaEval !== "" && !isNaN(skalaEval)) { totalSkalaEval += Number(skalaEval); countEval++; }
    if (skalaProv !== "" && !isNaN(skalaProv)) { totalSkalaProv += Number(skalaProv); countProv++; }

    return {
      no: p[0],
      id_soal: idSoal,
      pertanyaan: p[2],
      level: p[3],
      indikator: p[4],
      bobot: p[7],
      skala_responden: skalaResp,
      link_bukti: j.link || "",
      skala_evaluator: skalaEval,
      catatan_evaluator: catEval,
      skala_provinsi: skalaProv,
      catatan_provinsi: catProv
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
```

- [ ] **Step 2: Save `Responden.js`**

---

### Task 2: Create UI Template `UI_PublicHasil.html` & Update Landing Page `Index.html`

**Files:**
- Create: `UI_PublicHasil.html`
- Modify: `Index.html`

**Interfaces:**
- Consumes: CSS variables `--accent`, `--brut-border`, `--brut-shadow-sm`
- Produces: HTML container `#p-public-hasil` and landing page button `[ 📋 HASIL EVALUASI OPD TAHUN <YEAR> ]`

- [ ] **Step 1: Create `UI_PublicHasil.html` file**

```html
<div id="p-public-hasil" class="hidden" style="min-height: 100vh; background: var(--bg-grid); padding-bottom: 50px;">
  <!-- Header Bar -->
  <nav class="navbar navbar-dark bg-black px-4 mb-4" style="border-bottom: var(--brut-border);">
    <div class="container-fluid d-flex justify-content-between align-items-center">
      <button class="btn btn-brut btn-sm btn-brut-pink" onclick="closePublicHasil()">
        <i class="bi bi-arrow-left me-1"></i> BERANDA
      </button>
      <span class="navbar-brand fw-bold text-uppercase fs-6 m-0" id="pub-hasil-nav-title">
        PORTAL HASIL EVALUASI KEMATANGAN OPD TAHUN <span class="pub-year-txt">2026</span>
      </span>
      <button class="btn btn-brut btn-sm btn-brut-green" onclick="window.print()">
        <i class="bi bi-printer me-1"></i> CETAK HASIL
      </button>
    </div>
  </nav>

  <div class="container" style="max-width: 950px;">
    <!-- Title Banner -->
    <div class="text-center mb-4">
      <h3 class="fw-bold text-uppercase d-inline-block px-3 py-2" style="background: var(--accent); border: 3px solid #000; box-shadow: var(--brut-shadow-sm);">
        📋 PORTAL HASIL EVALUASI KEMATANGAN OPD <span class="pub-year-txt">2026</span>
      </h3>
      <p class="small text-muted fw-bold mt-1">Transparansi Penilaian Mandiri, Evaluator Organisasi, dan Evaluator Provinsi</p>
    </div>

    <!-- Dropdown Selector OPD & Filter Card -->
    <div class="brut-card p-4 mb-4" style="background: white;">
      <div class="row align-items-center g-3">
        <div class="col-md-7">
          <label for="select-public-opd" class="form-label fw-bold text-uppercase mb-1">PILIH PERANGKAT DAERAH (OPD):</label>
          <select id="select-public-opd" class="form-select brut-input fw-bold" onchange="loadPublicOpdHasil()">
            <option value="">-- Pilih OPD --</option>
          </select>
        </div>
        <div class="col-md-5 text-md-end">
          <label class="form-label fw-bold text-uppercase mb-1 d-block">TAMPILKAN INDIKATOR:</label>
          <div class="btn-group w-100" role="group">
            <input type="radio" class="btn-check" name="pubFilter" id="pubFilterAll" value="all" checked onchange="applyPublicFilter()">
            <label class="btn btn-outline-dark btn-sm fw-bold" for="pubFilterAll">Semua Indikator</label>

            <input type="radio" class="btn-check" name="pubFilter" id="pubFilterNotes" value="notes" onchange="applyPublicFilter()">
            <label class="btn btn-outline-dark btn-sm fw-bold" for="pubFilterNotes">Ada Catatan saja</label>
          </div>
        </div>
      </div>
    </div>

    <!-- Placeholder Message (Before OPD Selected) -->
    <div id="pub-placeholder" class="brut-card text-center py-5" style="background: white;">
      <i class="bi bi-building-exclamation fs-1 text-secondary mb-2 d-block"></i>
      <h5 class="fw-bold">Silakan Pilih Perangkat Daerah (OPD) terlebih dahulu</h5>
      <p class="small text-muted mb-0">Hasil nilai dan catatan evaluator akan ditampilkan di sini.</p>
    </div>

    <!-- Loading Spinner -->
    <div id="pub-loading" class="text-center py-5 hidden">
      <div class="spinner-border text-black mb-2" role="status"></div>
      <h6 class="fw-bold text-uppercase">Memuat data evaluasi real-time...</h6>
    </div>

    <!-- Main Results Section (Visible after selecting OPD) -->
    <div id="pub-results-content" class="hidden">
      <!-- 3 Summary Index Cards -->
      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="brut-card text-center h-100" style="background: #fff9db;">
            <span class="badge bg-black text-white mb-2">PENILAIAN MANDIRI</span>
            <h2 id="pub-idx-mandiri" class="fw-bold m-0" style="font-size: 2.5rem;">0.00</h2>
            <span id="pub-lbl-mandiri" class="small fw-bold text-uppercase mt-1 d-block">-</span>
          </div>
        </div>
        <div class="col-md-4">
          <div class="brut-card text-center h-100" style="background: #e7f5ff;">
            <span class="badge bg-primary text-white mb-2">EVALUATOR ORGANISASI</span>
            <h2 id="pub-idx-eval" class="fw-bold m-0" style="font-size: 2.5rem;">-</h2>
            <span id="pub-lbl-eval" class="small fw-bold text-uppercase mt-1 d-block">-</span>
          </div>
        </div>
        <div class="col-md-4">
          <div class="brut-card text-center h-100" style="background: #ebfbee;">
            <span class="badge bg-success text-white mb-2">EVALUATOR PROVINSI</span>
            <h2 id="pub-idx-prov" class="fw-bold m-0" style="font-size: 2.5rem;">-</h2>
            <span id="pub-lbl-prov" class="small fw-bold text-uppercase mt-1 d-block">-</span>
          </div>
        </div>
      </div>

      <!-- Indicators List Container -->
      <div id="pub-soal-container" class="d-flex flex-column gap-3"></div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Update `Index.html` to add centered button on landing page & include `UI_PublicHasil`**

In `Index.html`:
1. Find `PILIH AKSES MASUK` section (around line 25-34). Add centered button row directly underneath:
```html
<div class="d-flex justify-content-center mt-3">
  <button class="btn btn-brut btn-brut-yellow d-flex align-items-center gap-2" onclick="openPublicHasil()" style="padding: 10px 24px; font-weight: bold;">
    <span style="font-size: 1.2rem;">📋</span> 
    <span style="font-size: 0.95rem;">HASIL EVALUASI OPD TAHUN <span class="pub-year-txt">2026</span></span>
  </button>
</div>
```
2. Below `<?!= include('UI_Evaluator'); ?>` (around line 89), add:
```html
<?!= include('UI_PublicHasil'); ?>
```

---

### Task 3: Implement Client-side JS Logic in `Scripts.html` & Styling Print Optimization in `Styles.html`

**Files:**
- Modify: `Scripts.html`
- Modify: `Styles.html`

**Interfaces:**
- Consumes: `google.script.run.getPublicEvaluasiOpd(opdName)`
- Produces: Functions `openPublicHasil()`, `closePublicHasil()`, `loadPublicOpdHasil()`, `renderPublicHasil(res)`, `applyPublicFilter()`

- [ ] **Step 1: Add JavaScript functions to `Scripts.html`**

```javascript
let currentPublicData = null;

function updateActiveYearUI() {
  const year = new Date().getFullYear();
  const els = document.querySelectorAll('.pub-year-txt');
  els.forEach(el => el.textContent = year);
}

function openPublicHasil() {
  updateActiveYearUI();
  document.getElementById('p-land').classList.add('hidden');
  document.getElementById('p-public-hasil').classList.remove('hidden');
  window.scrollTo(0, 0);

  // Populate OPD Select if empty
  const select = document.getElementById('select-public-opd');
  if (select && select.options.length <= 1) {
    populatePublicOpdDropdown();
  }
}

function closePublicHasil() {
  document.getElementById('p-public-hasil').classList.add('hidden');
  document.getElementById('p-land').classList.remove('hidden');
  window.scrollTo(0, 0);
}

function populatePublicOpdDropdown() {
  const select = document.getElementById('select-public-opd');
  select.innerHTML = '<option value="">-- Pilih OPD --</option>';

  if (SETTINGS.USE_FIREBASE) {
    const users = Firebase.getCachedMasterUser();
    if (users) {
      const opds = [...new Set(Object.values(users).map(u => u.opd || u.username).filter(Boolean))].sort();
      opds.forEach(opd => {
        const opt = document.createElement('option');
        opt.value = opd;
        opt.textContent = opd;
        select.appendChild(opt);
      });
      return;
    }
  }

  // Fallback via google.script.run
  google.script.run.withSuccessHandler(function(list) {
    if (list && Array.isArray(list)) {
      list.forEach(opd => {
        const opt = document.createElement('option');
        opt.value = opd;
        opt.textContent = opd;
        select.appendChild(opt);
      });
    }
  }).getOpdList();
}

function loadPublicOpdHasil() {
  const select = document.getElementById('select-public-opd');
  const opdName = select ? select.value : '';

  const placeholder = document.getElementById('pub-placeholder');
  const loading = document.getElementById('pub-loading');
  const results = document.getElementById('pub-results-content');

  if (!opdName) {
    placeholder.classList.remove('hidden');
    loading.classList.add('hidden');
    results.classList.add('hidden');
    currentPublicData = null;
    return;
  }

  placeholder.classList.add('hidden');
  loading.classList.remove('hidden');
  results.classList.add('hidden');

  google.script.run
    .withSuccessHandler(function(res) {
      loading.classList.add('hidden');
      if (!res || res.error) {
        alert(res ? res.error : 'Gagal memuat data evaluasi OPD.');
        return;
      }
      currentPublicData = res;
      results.classList.remove('hidden');
      renderPublicHasil(res);
    })
    .withFailureHandler(function(err) {
      loading.classList.add('hidden');
      alert('Terjadi kesalahan: ' + err.message);
    })
    .getPublicEvaluasiOpd(opdName);
}

function renderPublicHasil(data) {
  if (!data) return;

  // Render Index Cards
  document.getElementById('pub-idx-mandiri').textContent = data.indeks.mandiri || '0.00';
  document.getElementById('pub-lbl-mandiri').textContent = getPredikat(Number(data.indeks.mandiri) || 0);

  document.getElementById('pub-idx-eval').textContent = data.indeks.evaluator || 'Belum Dinilai';
  document.getElementById('pub-lbl-eval').textContent = data.indeks.evaluator !== 'Belum Dinilai' ? getPredikat(Number(data.indeks.evaluator) || 0) : 'Belum Diverifikasi';

  document.getElementById('pub-idx-prov').textContent = data.indeks.provinsi || 'Belum Dinilai';
  document.getElementById('pub-lbl-prov').textContent = data.indeks.provinsi !== 'Belum Dinilai' ? getPredikat(Number(data.indeks.provinsi) || 0) : 'Belum Diverifikasi';

  applyPublicFilter();
}

function applyPublicFilter() {
  if (!currentPublicData || !currentPublicData.items) return;

  const container = document.getElementById('pub-soal-container');
  container.innerHTML = '';

  const filterRadio = document.querySelector('input[name="pubFilter"]:checked');
  const filterVal = filterRadio ? filterRadio.value : 'all';

  const filtered = currentPublicData.items.filter(item => {
    if (filterVal === 'notes') {
      return (item.catatan_evaluator && item.catatan_evaluator.trim() !== '') ||
             (item.catatan_provinsi && item.catatan_provinsi.trim() !== '');
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="brut-card text-center py-4 bg-white"><p class="mb-0 fw-bold">Tidak ada indikator yang sesuai dengan filter.</p></div>';
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'brut-card p-3 bg-white';
    
    const catEvalHtml = item.catatan_evaluator 
      ? `<div class="p-2 mt-2 bg-light border border-dark rounded small"><b>Catatan Evaluator Organisasi:</b> ${escapeHtml(item.catatan_evaluator)}</div>`
      : `<div class="text-muted small mt-1"><i>Catatan Evaluator Organisasi: -</i></div>`;

    const catProvHtml = item.catatan_provinsi
      ? `<div class="p-2 mt-2 bg-light border border-dark rounded small"><b>Catatan Evaluator Provinsi:</b> ${escapeHtml(item.catatan_provinsi)}</div>`
      : `<div class="text-muted small mt-1"><i>Catatan Evaluator Provinsi: -</i></div>`;

    const buktiHtml = item.link_bukti 
      ? `<a href="${escapeHtml(item.link_bukti)}" target="_blank" class="btn btn-sm btn-outline-primary py-0 px-2 mt-1 fw-bold"><i class="bi bi-link-45deg"></i> Bukti Dukung</a>`
      : `<span class="small text-muted mt-1 d-inline-block">Bukti Dukung: -</span>`;

    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start mb-2 pb-2 border-bottom border-black">
        <div>
          <span class="badge bg-black text-white me-2">No. ${item.no}</span>
          <span class="fw-bold text-uppercase">${escapeHtml(item.indikator || item.id_soal)}</span>
        </div>
        <span class="badge bg-secondary">Bobot: ${item.bobot || 0}</span>
      </div>
      <p class="small mb-3 fw-semibold">${escapeHtml(item.pertanyaan)}</p>
      
      <div class="row g-2">
        <!-- Mandiri -->
        <div class="col-md-4">
          <div class="p-2 border border-2 border-black rounded h-100" style="background: #fff9db;">
            <div class="d-flex justify-content-between align-items-center">
              <span class="small fw-bold text-uppercase">Mandiri</span>
              <span class="badge bg-dark fs-6">${item.skala_responden !== "" ? 'Level ' + item.skala_responden : '-'}</span>
            </div>
            ${buktiHtml}
          </div>
        </div>
        
        <!-- Evaluator Organisasi -->
        <div class="col-md-4">
          <div class="p-2 border border-2 border-black rounded h-100" style="background: #e7f5ff;">
            <div class="d-flex justify-content-between align-items-center">
              <span class="small fw-bold text-uppercase">Evaluator Organisasi</span>
              <span class="badge ${item.skala_evaluator !== "" ? 'bg-primary' : 'bg-secondary'} fs-6">
                ${item.skala_evaluator !== "" ? 'Level ' + item.skala_evaluator : 'Belum Dinilai'}
              </span>
            </div>
            ${catEvalHtml}
          </div>
        </div>

        <!-- Evaluator Provinsi -->
        <div class="col-md-4">
          <div class="p-2 border border-2 border-black rounded h-100" style="background: #ebfbee;">
            <div class="d-flex justify-content-between align-items-center">
              <span class="small fw-bold text-uppercase">Evaluator Provinsi</span>
              <span class="badge ${item.skala_provinsi !== "" ? 'bg-success' : 'bg-secondary'} fs-6">
                ${item.skala_provinsi !== "" ? 'Level ' + item.skala_provinsi : 'Belum Dinilai'}
              </span>
            </div>
            ${catProvHtml}
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}
```

- [ ] **Step 2: Add `@media print` styling to `Styles.html`**

In `Styles.html`:
```css
@media print {
  body {
    background: white !important;
    color: black !important;
  }
  .navbar, #btn-back-to-land, #btn-print-public-hasil, .btn-group, select, footer {
    display: none !important;
  }
  #p-public-hasil {
    display: block !important;
    padding: 0 !important;
    background: none !important;
  }
  .brut-card {
    border: 1px solid #000 !important;
    box-shadow: none !important;
    page-break-inside: avoid;
  }
}
```

---

### Task 4: Push Code, Versioning & Deployment to Google Apps Script

**Files:** All modified files
- Commands: `npx -y @google/clasp push -f`, clasp version, clasp deploy.

- [ ] **Step 1: Push code to Apps Script**

```bash
npx -y @google/clasp push -f
```

- [ ] **Step 2: Create new version and deploy to primary active deployment ID**

```bash
V_NUM=$(npx -y @google/clasp version "Release Portal Hasil Evaluasi OPD Publik" | grep -oE '[0-9]+' | tail -n 1)
npx -y @google/clasp deploy -i "AKfycbzoScMV1ULBGAel1KHaebq7EPnz_u3m54HR3409liJgPi7qmNJ7k67rCifrkF8LJgtrgg" -V "$V_NUM" -d "Release @$V_NUM"
```

- [ ] **Step 3: Commit plan and changes to Git**

```bash
git add .
git commit -m "feat: add public OPD evaluation results portal with real-time feedback"
```
