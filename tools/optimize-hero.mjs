import sharp from "sharp";

await sharp("src/assets/hero.png")
  .resize({ width: 1600, withoutEnlargement: true })
  .webp({ quality: 75 })
  .toFile("src/assets/hero.webp");

console.log("OK -> src/assets/hero.webp created");
