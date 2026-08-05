/**
 * generate-og-image.mjs
 *
 * Rasterises public/og-image.svg -> public/og-image.png (1200x630), the file
 * referenced by the og:image / twitter:image tags in index.html.
 *
 * Run it whenever the SVG changes:
 *   npm run og
 *
 * Note on fonts: sharp rasterises SVG text with the *system* font stack, so the
 * headline falls back to Georgia if Fraunces is not installed locally. Install
 * Fraunces (https://fonts.google.com/specimen/Fraunces) before regenerating if
 * you want the exact brand face in the PNG.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "public", "og-image.svg");
const out = path.join(root, "public", "og-image.png");

const svg = await readFile(src);

const png = await sharp(svg, { density: 144 })
  .resize(1200, 630, { fit: "fill" })
  .png({ compressionLevel: 9 })
  .toBuffer();

await writeFile(out, png);

console.log(
  `og-image.png written (${(png.length / 1024).toFixed(1)} kB) -> ${path.relative(root, out)}`
);
