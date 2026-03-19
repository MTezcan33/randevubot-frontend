#!/bin/bash
# PWA ikon boyutlarını oluştur
# Kullanım: Bu script bir kaynak SVG/PNG'den tüm boyutları üretir
# Gereksinim: sharp-cli veya ImageMagick
#
# npx sharp-cli resize 512 512 -i source-icon.png -o icon-512x512.png
# veya
# convert source-icon.png -resize 72x72 icon-72x72.png

SIZES=(72 96 128 144 152 192 384 512)
SOURCE="source-icon.png"

for size in "${SIZES[@]}"; do
  echo "Generating ${size}x${size}..."
  # sharp kullanarak:
  # npx sharp-cli resize $size $size -i $SOURCE -o icon-${size}x${size}.png
  # veya ImageMagick:
  # convert $SOURCE -resize ${size}x${size} icon-${size}x${size}.png
done

echo "Tüm ikonlar oluşturuldu. source-icon.png dosyasını bu dizine koyun ve scripti çalıştırın."
