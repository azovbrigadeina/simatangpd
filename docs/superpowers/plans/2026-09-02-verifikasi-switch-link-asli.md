# Cek Link Evd. Asli Switch & Audit Timestamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Cek Link Evd. Asli" switch control and submission audit timestamp display to the data verification modal in SIMATANG PD.

**Architecture:** Update `Evaluator.js` to pass `submittedAt` timestamp in `getJawabanByOPD`, and update `Scripts.html` to add the toggle switch, submission timestamp badge, and dual-link rendering logic.

**Tech Stack:** Google Apps Script (GAS), Vanilla JS, Bootstrap 5 UI.

## Global Constraints

- Preserve all existing API signatures and return structures in `Evaluator.js`.
- Follow the deployment workflow rule: `clasp push -f` -> `clasp version` -> `clasp deploy -i "AKfycbzoScMV1ULBGAel1KHaebq7EPnz_u3m54HR3409liJgPi7qmNJ7k67rCifrkF8LJgtrgg"`.

---

### Task 1: Update `Evaluator.js` Backend for Audit Timestamps

**Files:**
- Modify: `Evaluator.js:237-278`

**Interfaces:**
- Consumes: `status_pengisian/${escapedOPD}` (Firebase data) containing `updated_at`, and `jawaban/${escapedOPD}` containing `timestamp`.
- Produces: `getJawabanByOPD` payload with `submittedAt` property and `items[].item_timestamp`.

- [x] **Step 1: Inspect `Evaluator.js` around `getJawabanByOPD`**

Check exact lines around 240-278 in `Evaluator.js`.

- [x] **Step 2: Modify `getJawabanByOPD` in `Evaluator.js`**

Include `submittedAt` from `statusData.updated_at` and `item_timestamp` from `j.timestamp`.

```javascript
    const submittedAt = statusData ? (statusData.updated_at || "") : "";
    const items = Object.entries(jawabanOPD).map(([idSoal, j]) => {
      const level = j.level;
      const key = `${idSoal}_${level}`;
      const detail = pert[key];
      const verif = verifOPD[idSoal];
      const rawIdSoal = Firebase.unescapeKey(idSoal);
      
      const effectiveLink = j.link_arsip || j.link || "";
      return {
        id_soal: rawIdSoal,
        pertanyaan: detail ? detail.pertanyaan : "Variabel Tidak Ditemukan",
        indikator: detail ? detail.indikator : "-",
        skala_responden: level,
        link: effectiveLink,
        link_original: j.link || "",
        is_arsip: Boolean(j.link_arsip),
        item_timestamp: j.timestamp || "",
        skala_evaluator: verif ? (verif.skala_evaluator !== undefined ? verif.skala_evaluator : "") : "",
        catatan: verif ? (verif.catatan_evaluator || "") : "",
        skala_provinsi: verif ? (verif.skala_provinsi !== undefined ? verif.skala_provinsi : "") : "",
        catatan_provinsi: verif ? (verif.catatan_provinsi || "") : ""
      };
    });
    
    // Urutkan secara natural berdasarkan id_soal
    items.sort((a, b) => {
      return String(a.id_soal).localeCompare(String(b.id_soal), undefined, { numeric: true, sensitivity: 'base' });
    });
    
    return { items: items, status: statusStr, isFinal: statusStr === "SUBMITTED", submittedAt: submittedAt };
```

- [x] **Step 3: Commit backend changes**

```bash
git add Evaluator.js
git commit -m "feat(evaluator): pass submittedAt and item_timestamp for verification audit"
```

---

### Task 2: Update `Scripts.html` Frontend for Switch & Timestamp Rendering

**Files:**
- Modify: `Scripts.html:690-820`

**Interfaces:**
- Consumes: `res.submittedAt` and `vData[].link_original` from `getJawabanByOPD`.
- Produces: Interactive switch `switch-link-asli` and audit badge in verification view.

- [x] **Step 1: Add global state and toggle handler in `Scripts.html`**

Define `let showOriginalLink = false;` and `function toggleLinkAsli(checked)` to re-render link buttons.

- [x] **Step 2: Capture `res.submittedAt` in `pilihOPD`**

Store `currentSelectedOPDSubmittedAt = res.submittedAt || '';`.

- [x] **Step 3: Update `renderVList` Header HTML**

Add the "Cek Link Evd. Asli" switch control and formatted timestamp badge to `renderVList`.

```html
<div class="form-check form-switch d-inline-block ms-2 me-2 align-middle" title="Aktifkan untuk melihat link bukti dukung asli milik responden">
  <input class="form-check-input" type="checkbox" id="switch-link-asli" onchange="showOriginalLink=this.checked; renderVList('${opdName}');" ${showOriginalLink ? 'checked' : ''}>
  <label class="form-check-label fw-bold text-dark small" for="switch-link-asli">
    <i class="bi bi-folder-symlink me-1"></i>Cek Link Evd. Asli
  </label>
</div>
```

- [x] **Step 4: Update `linkHtml` rendering per item**

Render both Snapshot Admin link and Original Link when `showOriginalLink` is true:

```javascript
      let linkHtml = '';
      if (it.link) {
        const snapBtn = `<a href="${it.link}" target="_blank" class="btn btn-sm btn-outline-success text-truncate me-1" style="max-width: 250px;"><i class="bi bi-shield-check me-1"></i> Bukti Snapshot</a>`;
        let origBtn = '';
        if (showOriginalLink && it.link_original) {
          origBtn = `<a href="${it.link_original}" target="_blank" class="btn btn-sm btn-outline-warning text-dark text-truncate me-1" style="max-width: 250px;" title="Link Drive Asli milik Responden"><i class="bi bi-folder-symlink me-1"></i> Link Evd. Asli</a>`;
        }
        linkHtml = snapBtn + origBtn + archiveBadge;
      } else {
        linkHtml = `<span class="badge bg-light text-muted border">Tidak Ada Link</span>`;
      }
```

- [x] **Step 5: Commit frontend changes**

```bash
git add Scripts.html
git commit -m "feat(ui): add Cek Link Evd. Asli switch and submission audit timestamp"
```

---

### Task 3: Deploy & Verify Apps Script Deployment

**Files:**
- Execute deployment script according to `<RULE[AGENTS.md]>`.

- [x] **Step 1: Push code with clasp**

Run: `npx -y @google/clasp push -f`

- [x] **Step 2: Create new version and deploy**

Run:
```bash
V_NUM=$(npx -y @google/clasp version "Add Cek Link Evd Asli switch and audit timestamp" | grep -oE '[0-9]+' | tail -n 1)
npx -y @google/clasp deploy -i "AKfycbzoScMV1ULBGAel1KHaebq7EPnz_u3m54HR3409liJgPi7qmNJ7k67rCifrkF8LJgtrgg" -V "$V_NUM" -d "Release @$V_NUM"
```

- [x] **Step 3: Commit final plan verification**

```bash
git add docs/superpowers/plans/2026-09-02-verifikasi-switch-link-asli.md
git commit -m "docs: complete implementation plan for Cek Link Evd Asli switch"
```
