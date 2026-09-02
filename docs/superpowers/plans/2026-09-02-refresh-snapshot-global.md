# Global Refresh Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global "Refresh Semua Snapshot" button in the verification modal header to re-process and update all Drive evidence snapshots recursively for an OPD.

**Architecture:** Implement `resnapshotAllByOPD` in `Evaluator.js`, and add the `Refresh Semua Snapshot` button and frontend handler `doResnapshotAll` in `Scripts.html`.

**Tech Stack:** Google Apps Script (GAS), Vanilla JS, Bootstrap 5, SweetAlert2.

## Global Constraints
- Preserve all existing Firebase structures and API signatures.
- Deploy using clasp rules: `npx -y @google/clasp push -f` -> `version` -> `deploy -i "AKfycbzoScMV1ULBGAel1KHaebq7EPnz_u3m54HR3409liJgPi7qmNJ7k67rCifrkF8LJgtrgg"`.

---

### Task 1: Add `resnapshotAllByOPD` Backend Function in `Evaluator.js`

**Files:**
- Modify: `Evaluator.js`

**Interfaces:**
- Consumes: `namaOPD` string parameter.
- Produces: `resnapshotAllByOPD(namaOPD)` returning `{ success: true, count: N }`.

- [ ] **Step 1: Implement `resnapshotAllByOPD` in `Evaluator.js`**

```javascript
function resnapshotAllByOPD(namaOPD) {
  if (!SETTINGS.USE_FIREBASE) return { success: false, message: "Hanya berlaku untuk Firebase." };
  if (!namaOPD) return { success: false, message: "Nama OPD tidak valid." };

  try {
    const escapedOPD = Firebase.escapeKey(namaOPD);
    const jawabanOPD = Firebase.get(`jawaban/${escapedOPD}`) || {};
    const cleanOpd = namaOPD.toString().trim();
    
    let updatedCount = 0;
    const updates = {};

    Object.entries(jawabanOPD).forEach(([idSoal, item]) => {
      if (item && item.link && item.link.trim() !== "") {
        const newArsip = snapshotDriveFolder(cleanOpd, item.link.trim());
        if (newArsip) {
          updates[`${idSoal}/link_arsip`] = newArsip;
          updatedCount++;
        }
      }
    });

    if (Object.keys(updates).length > 0) {
      Firebase.patch(`jawaban/${escapedOPD}`, updates);
    }

    return { success: true, count: updatedCount, message: `Berhasil memperbarui ${updatedCount} snapshot bukti dukung.` };
  } catch (e) {
    Logger.log("Error pada resnapshotAllByOPD: " + e.toString());
    return { success: false, message: e.toString() };
  }
}
```

- [ ] **Step 2: Commit backend changes**

```bash
git add Evaluator.js
git commit -m "feat(evaluator): add resnapshotAllByOPD backend function"
```

---

### Task 2: Add "Refresh Semua Snapshot" Button and Handler in `Scripts.html`

**Files:**
- Modify: `Scripts.html`

**Interfaces:**
- Consumes: `google.script.run.resnapshotAllByOPD(opdName)`.
- Produces: Interactive button `<button onclick="doResnapshotAll('${opdName}')">` and modal UI refresh.

- [ ] **Step 1: Add `doResnapshotAll` handler in `Scripts.html`**

```javascript
function doResnapshotAll(opdName) {
  if (!opdName) return;
  Swal.fire({
    title: 'Memproses Snapshot Ulang...',
    html: 'Sistem sedang menyalin seluruh folder & subfolder bukti dukung OPD <b>' + escapeHtml(opdName) + '</b> secara rekursif...',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });

  google.script.run.withSuccessHandler(res => {
    if (res && res.success) {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: res.message || 'Snapshot bukti dukung berhasil diperbarui.',
        timer: 2000,
        showConfirmButton: false
      });
      pilihOPD(opdName);
    } else {
      Swal.fire('Gagal', res.message || 'Gagal memperbarui snapshot.', 'error');
    }
  }).withFailureHandler(err => {
    Swal.fire('Error', 'Gagal memproses snapshot: ' + (err.message || err), 'error');
  }).resnapshotAllByOPD(opdName);
}
```

- [ ] **Step 2: Add "Refresh Semua Snapshot" button in `renderVList` toolbar**

Add button to the right-aligned button group in the header control card:

```html
<button class="btn btn-sm btn-outline-info fw-bold" onclick="doResnapshotAll('${opdName}')" title="Buat ulang seluruh snapshot bukti dukung OPD ini secara rekursif">
  <i class="bi bi-arrow-repeat me-1"></i>Refresh Semua Snapshot
</button>
```

- [ ] **Step 3: Commit frontend changes**

```bash
git add Scripts.html
git commit -m "feat(ui): add Refresh Semua Snapshot button and frontend handler"
```

---

### Task 3: Deploy & Verify Apps Script Deployment

**Files:**
- Execute deployment script according to `<RULE[AGENTS.md]>`.

- [ ] **Step 1: Push code with clasp**

Run: `npx -y @google/clasp push -f`

- [ ] **Step 2: Create new version and deploy**

Run:
```bash
V_NUM=$(npx -y @google/clasp version "Add Global Refresh Snapshot feature for verification" | grep -oE '[0-9]+' | tail -n 1)
npx -y @google/clasp deploy -i "AKfycbzoScMV1ULBGAel1KHaebq7EPnz_u3m54HR3409liJgPi7qmNJ7k67rCifrkF8LJgtrgg" -V "$V_NUM" -d "Release @$V_NUM"
```

- [ ] **Step 3: Commit final plan verification**

```bash
git add docs/superpowers/plans/2026-09-02-refresh-snapshot-global.md
git commit -m "docs: complete implementation plan for Global Refresh Snapshot feature"
```
