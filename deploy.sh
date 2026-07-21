#!/bin/bash
set -e

echo "=== 1. Pushing code to Google Apps Script ==="
npx -y @google/clasp push

echo "=== 2. Updating all active deployment IDs ==="
npx -y @google/clasp deployments | grep -E '^-\s+AKfycb' | awk '{print $2}' | while read -r depId; do
  if [ "$depId" != "@HEAD" ]; then
    echo "Updating deployment: $depId"
    npx -y @google/clasp deploy -i "$depId" -d "Auto deploy update $(date +'%Y-%m-%d %H:%M:%S')"
  fi
done

echo "=== Selesai! Semua deployment telah diperbarui ke versi terbaru. ==="
