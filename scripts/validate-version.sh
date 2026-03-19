#!/bin/bash
# RandevuBot Version Validation Script
# Build oncesi calistirilir — tutarsizliklari yakalar

set -e

echo "=== Versiyon Dogrulama ==="

VERSION_FILE=$(cat .version | tr -d '[:space:]')
VERSIONS_JSON=$(node -e "const v=JSON.parse(require('fs').readFileSync('versions.json','utf8'));console.log(v.current)")

echo ".version: $VERSION_FILE"
echo "versions.json: $VERSIONS_JSON"

if [ "$VERSION_FILE" != "$VERSIONS_JSON" ]; then
  echo "HATA: Versiyon tutarsizligi!"
  echo ".version ($VERSION_FILE) != versions.json ($VERSIONS_JSON)"
  exit 1
fi

# Migration log kontrolu
if [ -f "database/migration_log.json" ]; then
  PENDING=$(node -e "const m=JSON.parse(require('fs').readFileSync('database/migration_log.json','utf8'));console.log(m.migrations.filter(x=>x.status==='pending').length)")
  echo "Bekleyen migration sayisi: $PENDING"
fi

echo ""
echo "Versiyon dogrulama BASARILI: v$VERSION_FILE"
