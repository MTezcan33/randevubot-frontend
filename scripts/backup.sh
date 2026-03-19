#!/bin/bash
# RandevuBot Backup Script
# Kullanim: ./scripts/backup.sh [aciklama]

set -e

DESCRIPTION=${1:-"Manual backup"}
DATE=$(date +%Y-%m-%d-%H%M)
VERSION=$(cat .version | tr -d '[:space:]')
BRANCH_NAME="backup/${VERSION}-${DATE}"

echo "=== RandevuBot Backup ==="
echo "Versiyon: $VERSION"
echo "Tarih: $DATE"

# Git durumunu kontrol et
if [ -n "$(git status --porcelain)" ]; then
  echo "UYARI: Commit edilmemis degisiklikler var!"
  echo "Once commit edin veya stash yapin."
  git status --short
  exit 1
fi

# Backup branch olustur
git branch "$BRANCH_NAME"
echo "Backup branch olusturuldu: $BRANCH_NAME"

# Tag olustur
TAG_NAME="backup-v${VERSION}-${DATE}"
git tag -a "$TAG_NAME" -m "Backup: $DESCRIPTION"
echo "Backup tag olusturuldu: $TAG_NAME"

echo ""
echo "=== Backup tamamlandi ==="
echo "Branch: $BRANCH_NAME"
echo "Tag: $TAG_NAME"
echo "Geri donmek icin: git checkout $BRANCH_NAME"
