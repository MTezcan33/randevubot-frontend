#!/bin/bash
# RandevuBot Deploy Script
# Kullanim: ./scripts/deploy.sh

set -e

VERSION=$(cat .version | tr -d '[:space:]')
echo "=== RandevuBot Deploy v$VERSION ==="

# 1. Git durumunu kontrol et
if [ -n "$(git status --porcelain)" ]; then
  echo "HATA: Commit edilmemis degisiklikler var!"
  git status --short
  exit 1
fi

# 2. Build
echo ">>> Build baslatiliyor..."
npm run build
echo ">>> Build tamamlandi"

# 3. Build dogrulama
if [ ! -d "dist" ]; then
  echo "HATA: dist/ klasoru bulunamadi!"
  exit 1
fi

DIST_SIZE=$(du -sh dist | cut -f1)
echo ">>> dist/ boyutu: $DIST_SIZE"

# 4. Version bilgisi
echo ""
echo "=== Deploy Hazir ==="
echo "Versiyon: $VERSION"
echo "Build: dist/"
echo ""
echo "Hostinger VPS'e yuklemek icin:"
echo "  scp -r dist/* user@server:/path/to/randevubot/"
echo ""
echo "Veya Coolify ile:"
echo "  git push origin main"
