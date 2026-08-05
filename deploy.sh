#!/bin/bash
set -e

echo "=== 1. Pushing code to Google Apps Script ==="
npx -y @google/clasp push

echo "=== 2. Resolving target version ==="
V_OUTPUT=$(npx -y @google/clasp version "Auto version $(date +'%Y-%m-%d %H:%M:%S')" 2>&1 || true)
V_NUM=$(echo "$V_OUTPUT" | grep -oE '[0-9]+' | tail -n 1)

if [ -z "$V_NUM" ]; then
  echo "Catatan: Menggunakan versi tertinggi yang tersedia."
  V_NUM=$(npx -y @google/clasp deployments | grep -oE '@[0-9]+' | tr -d '@' | sort -n | tail -n 1)
fi

echo "Menggunakan versi: @$V_NUM"

echo "=== 3. Updating all active deployment IDs to version @$V_NUM ==="
npx -y @google/clasp deployments | grep -E '^-\s+AKfycb' | awk '{print $2}' | while read -r depId; do
  if [ "$depId" != "@HEAD" ]; then
    echo "Updating deployment: $depId -> @$V_NUM"
    npx -y @google/clasp deploy -i "$depId" -V "$V_NUM" -d "Auto deploy update $(date +'%Y-%m-%d %H:%M:%S')"
  fi
done

echo "=== Selesai! Semua deployment telah diperbarui ke versi @$V_NUM. ==="
