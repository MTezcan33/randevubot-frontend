#!/bin/bash
# RandevuBot Version Bump Script
# Kullanim: ./scripts/version-bump.sh [major|minor|patch] "Degisiklik aciklamasi"

set -e

BUMP_TYPE=${1:-patch}
DESCRIPTION=${2:-"Version bump"}
VERSION_FILE=".version"
VERSIONS_JSON="versions.json"

# Mevcut versiyonu oku
CURRENT_VERSION=$(cat "$VERSION_FILE" | tr -d '[:space:]')
echo "Mevcut versiyon: $CURRENT_VERSION"

# Semantic versiyonu parcala
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

case $BUMP_TYPE in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo "Hatali bump tipi: $BUMP_TYPE (major|minor|patch)"
    exit 1
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
DATE=$(date +%Y-%m-%d)
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "Yeni versiyon: $NEW_VERSION"

# .version dosyasini guncelle
echo "$NEW_VERSION" > "$VERSION_FILE"

# versions.json guncelle (node ile)
node -e "
const fs = require('fs');
const v = JSON.parse(fs.readFileSync('$VERSIONS_JSON', 'utf8'));
v.current = '$NEW_VERSION';
v.history.unshift({
  version: '$NEW_VERSION',
  date: '$DATE',
  description: '$DESCRIPTION',
  commit: '$COMMIT'
});
fs.writeFileSync('$VERSIONS_JSON', JSON.stringify(v, null, 2));
"

echo "Versiyon guncellendi: $CURRENT_VERSION -> $NEW_VERSION"
echo "Git tag olusturmak icin: git tag -a v$NEW_VERSION -m \"$DESCRIPTION\""
