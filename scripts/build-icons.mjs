// Rasterize the SVG icon + OG image into the various PNG/ICO sizes browsers
// and social-preview cards expect. Run: `node scripts/build-icons.mjs`.
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public");
mkdirSync(outDir, { recursive: true });

const iconSvg = readFileSync(path.join(root, "icons", "icon.svg"));
const ogSvg = readFileSync(path.join(root, "icons", "og.svg"));

async function renderPng(svg, width, height, outFile) {
  await sharp(svg, { density: 384 })
    .resize(width, height, { fit: "contain" })
    .png({ compressionLevel: 9, quality: 92 })
    .toFile(path.join(outDir, outFile));
  console.log(" ->", outFile);
}

async function main() {
  console.log("Rendering PNGs…");
  await renderPng(iconSvg, 16, 16, "favicon-16.png");
  await renderPng(iconSvg, 32, 32, "favicon-32.png");
  await renderPng(iconSvg, 48, 48, "favicon-48.png");
  await renderPng(iconSvg, 192, 192, "icon-192.png");
  await renderPng(iconSvg, 512, 512, "icon-512.png");
  await renderPng(iconSvg, 180, 180, "apple-touch-icon.png");
  await renderPng(iconSvg, 512, 512, "icon-mask.png");
  await renderPng(ogSvg, 1200, 630, "og-image.png");

  // Copy the SVG icon straight into public/ for modern browsers.
  writeFileSync(path.join(outDir, "favicon.svg"), iconSvg);
  console.log(" ->", "favicon.svg");

  // Build a multi-size .ico from the 16/32/48 PNGs so legacy Windows/browser
  // chrome treats it as a proper favicon.ico.
  const [png16, png32, png48] = await Promise.all([
    sharp(iconSvg, { density: 384 }).resize(16, 16).png().toBuffer(),
    sharp(iconSvg, { density: 384 }).resize(32, 32).png().toBuffer(),
    sharp(iconSvg, { density: 384 }).resize(48, 48).png().toBuffer(),
  ]);
  const icoBuf = buildIco([png16, png32, png48]);
  writeFileSync(path.join(outDir, "favicon.ico"), icoBuf);
  console.log(" ->", "favicon.ico");

  console.log("Done.");
}

// Minimal ICO packer accepting PNG entries.
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let totalSize = headerSize;
  for (const buf of pngBuffers) totalSize += buf.length;
  const out = Buffer.alloc(totalSize);
  // ICO header
  out.writeUInt16LE(0, 0); // reserved
  out.writeUInt16LE(1, 2); // ico
  out.writeUInt16LE(count, 4); // entries
  let offset = headerSize;
  for (let i = 0; i < count; i++) {
    const buf = pngBuffers[i];
    // Extract width/height from PNG IHDR (bytes 16..24)
    const w = buf.readUInt32BE(16) % 256;
    const h = buf.readUInt32BE(20) % 256;
    const entryOffset = 6 + i * 16;
    out.writeUInt8(w === 256 ? 0 : w, entryOffset + 0);
    out.writeUInt8(h === 256 ? 0 : h, entryOffset + 1);
    out.writeUInt8(0, entryOffset + 2);          // color palette
    out.writeUInt8(0, entryOffset + 3);          // reserved
    out.writeUInt16LE(1, entryOffset + 4);       // color planes
    out.writeUInt16LE(32, entryOffset + 6);      // bits per pixel
    out.writeUInt32LE(buf.length, entryOffset + 8);
    out.writeUInt32LE(offset, entryOffset + 12);
    buf.copy(out, offset);
    offset += buf.length;
  }
  return out;
}

main().catch((e) => { console.error(e); process.exit(1); });
