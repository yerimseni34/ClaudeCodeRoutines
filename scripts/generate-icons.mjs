// Bağımlılıksız PNG ikon üretici — FitLog için basit dumbbell logosu.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

mkdirSync(new URL("../public/icons", import.meta.url), { recursive: true });

function crc32(buf) {
  let c, table = crc32.t;
  if (!table) {
    table = crc32.t = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function make(size) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  };
  const radius = size * 0.22;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // rounded-rect background with vertical gradient (indigo -> teal)
      const inCorner = (cx, cy) => Math.hypot(x - cx, y - cy) > radius;
      let outside = false;
      if (x < radius && y < radius && inCorner(radius, radius)) outside = true;
      if (x > size - radius && y < radius && inCorner(size - radius, radius)) outside = true;
      if (x < radius && y > size - radius && inCorner(radius, size - radius)) outside = true;
      if (x > size - radius && y > size - radius && inCorner(size - radius, size - radius)) outside = true;
      if (outside) { set(x, y, 0, 0, 0, 0); continue; }
      const t = y / size;
      const r = Math.round(56 + t * (16 - 56));
      const g = Math.round(70 + t * (185 - 70));
      const b = Math.round(220 + t * (170 - 220));
      set(x, y, r, g, b, 255);
    }
  }
  // dumbbell drawn from rectangles, centered
  const c = size / 2;
  const white = (x0, y0, x1, y1) => {
    for (let y = Math.round(y0); y < y1; y++)
      for (let x = Math.round(x0); x < x1; x++) set(x, y, 255, 255, 255, 255);
  };
  const u = size / 16;
  // bar
  white(c - 5 * u, c - 0.7 * u, c + 5 * u, c + 0.7 * u);
  // inner plates
  white(c - 5 * u, c - 2.2 * u, c - 3.6 * u, c + 2.2 * u);
  white(c + 3.6 * u, c - 2.2 * u, c + 5 * u, c + 2.2 * u);
  // outer plates
  white(c - 6.4 * u, c - 3.4 * u, c - 5 * u, c + 3.4 * u);
  white(c + 5 * u, c - 3.4 * u, c + 6.4 * u, c + 3.4 * u);
  return encodePng(size, px);
}

writeFileSync(new URL("../public/icons/icon-192.png", import.meta.url), make(192));
writeFileSync(new URL("../public/icons/icon-512.png", import.meta.url), make(512));
console.log("Icons generated.");
