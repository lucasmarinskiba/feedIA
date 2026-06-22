/**
 * Rasterizer — SVG/slide → PNG en TypeScript puro (sin dependencias)
 * ─────────────────────────────────────────────────────────────────────────
 * Instagram vía Upload-Post necesita ráster (PNG), no SVG. Acá renderizamos
 * el MISMO layout branded del slide a un PNG real:
 *   • Encoder PNG propio (color type 2 RGB) con deflate "stored" (sin
 *     compresión) → CRC32 + Adler32 correctos, 100% válido.
 *   • Fuente bitmap 5x7 escalable para los textos (fallback legible).
 *
 * No reemplaza al SVG (que es la versión "linda" para preview); es la
 * versión publicable. Determinista, sin red, sin libs.
 */

import type { BrandProfile } from '../../config/types.js';
import type { CarruselSlide } from '../content/carrusel.js';

const W = 1080;
const H = 1350;

// ── Fuente bitmap 5x7 (subconjunto; minúsculas → mayúsculas) ───────────────
// Cada glifo: 7 filas de 5 chars ('#', '.'). Suficiente para títulos/cuerpo.
const G: Record<string, string[]> = {
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '####.', '#...#', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '####.', '#....', '#....', '#....', '#####'],
  F: ['#####', '#....', '####.', '#....', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#####', '#...#', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['#####', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '#####'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '...#.', '..#..', '..#..', '.....', '..#..'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '(': ['..#..', '.#...', '#....', '#....', '#....', '.#...', '..#..'],
  ')': ['..#..', '...#.', '....#', '....#', '....#', '...#.', '..#..'],
  '%': ['##..#', '##.#.', '..#..', '.#...', '#..##', '..#.#', '...##'],
  '#': ['.#.#.', '#####', '.#.#.', '.#.#.', '#####', '.#.#.', '.....'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.###.'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
};
const FALLBACK = ['#####', '#...#', '#...#', '#...#', '#...#', '#...#', '#####'];

const glyph = (ch: string): string[] => G[ch] ?? G[ch.toUpperCase()] ?? FALLBACK;

// ── Lienzo RGB ────────────────────────────────────────────────────────────
interface RGB {
  r: number;
  g: number;
  b: number;
}

const hexToRgb = (hex: string, fb: RGB): RGB => {
  const c = hex.replace('#', '');
  const full =
    c.length === 3
      ? c
          .split('')
          .map((x) => x + x)
          .join('')
      : c;
  if (full.length !== 6 || /[^0-9a-f]/i.test(full)) return fb;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

class Canvas {
  private buf: Uint8Array;
  constructor(
    private w: number,
    private h: number,
    bg: RGB,
  ) {
    this.buf = new Uint8Array(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      this.buf[i * 3] = bg.r;
      this.buf[i * 3 + 1] = bg.g;
      this.buf[i * 3 + 2] = bg.b;
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = y; yy < y + h; yy++) {
      if (yy < 0 || yy >= this.h) continue;
      for (let xx = x; xx < x + w; xx++) {
        if (xx < 0 || xx >= this.w) continue;
        const i = (yy * this.w + xx) * 3;
        this.buf[i] = c.r;
        this.buf[i + 1] = c.g;
        this.buf[i + 2] = c.b;
      }
    }
  }
  text(s: string, x: number, y: number, scale: number, c: RGB): void {
    let cx = x;
    for (const ch of s) {
      const gl = glyph(ch);
      for (let row = 0; row < 7; row++) {
        const line = gl[row]!;
        for (let col = 0; col < 5; col++) {
          if (line[col] === '#') this.rect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
      cx += 6 * scale;
    }
  }
  /** Ancho en px de un texto a una escala dada. */
  static textWidth(s: string, scale: number): number {
    return s.length * 6 * scale;
  }
  raw(): Uint8Array {
    return this.buf;
  }
}

// ── PNG encoder (RGB, deflate stored) ─────────────────────────────────────
const CRC_TABLE = ((): Uint32Array => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (b: Uint8Array): number => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const adler32 = (b: Uint8Array): number => {
  let a = 1;
  let s = 0;
  for (let i = 0; i < b.length; i++) {
    a = (a + b[i]!) % 65521;
    s = (s + a) % 65521;
  }
  return ((s << 16) | a) >>> 0;
};
const u32 = (n: number): Uint8Array => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);

const chunk = (type: string, data: Uint8Array): Uint8Array => {
  const t = new Uint8Array(type.split('').map((c) => c.charCodeAt(0)));
  const td = new Uint8Array(t.length + data.length);
  td.set(t);
  td.set(data, t.length);
  return concat([u32(data.length), td, u32(crc32(td))]);
};
const concat = (parts: Uint8Array[]): Uint8Array => {
  const len = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

const zlibStored = (data: Uint8Array): Uint8Array => {
  const blocks: Uint8Array[] = [new Uint8Array([0x78, 0x01])];
  const MAX = 65535;
  for (let off = 0; off < data.length; off += MAX) {
    const slice = data.subarray(off, Math.min(off + MAX, data.length));
    const last = off + MAX >= data.length ? 1 : 0;
    const len = slice.length;
    blocks.push(new Uint8Array([last, len & 255, (len >> 8) & 255, ~len & 255, (~len >> 8) & 255]));
    blocks.push(slice);
  }
  blocks.push(u32(adler32(data)));
  return concat(blocks);
};

const encodePng = (w: number, h: number, rgb: Uint8Array): Uint8Array => {
  // raw scanlines: 1 filter byte (0) + w*3 RGB por fila
  const raw = new Uint8Array(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0;
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (1 + w * 3) + 1);
  }
  const ihdr = concat([u32(w), u32(h), new Uint8Array([8, 2, 0, 0, 0])]);
  return concat([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlibStored(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]);
};

// ── Render del slide branded a PNG ────────────────────────────────────────
const wrap = (text: string, maxChars: number, maxLines: number): string[] => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else cur = (cur + ' ' + w).trim();
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur.trim());
  return lines;
};

export const renderCarruselSlidePng = (
  slide: CarruselSlide,
  brand: BrandProfile,
  total: number,
): { buffer: Uint8Array; dataUri: string } => {
  const pal = brand.visual.palette;
  const bg = hexToRgb(pal[0] ?? '#0a0a0a', { r: 10, g: 10, b: 10 });
  const fg = hexToRgb(pal[1] ?? '#f5f5f5', { r: 245, g: 245, b: 245 });
  const accent = hexToRgb(pal[2] ?? '#ff5f1f', { r: 255, g: 95, b: 31 });

  const cv = new Canvas(W, H, bg);
  cv.rect(64, 150, 96, 8, accent); // barra de acento
  cv.text(`${slide.numero} / ${total}`, 64, 96, 4, accent);

  let y = 230;
  const tScale = 11;
  for (const line of wrap(slide.titulo, 18, 4)) {
    cv.text(line.toUpperCase(), 64, y, tScale, fg);
    y += tScale * 9;
  }
  y += 30;
  const bScale = 6;
  for (const line of wrap(slide.cuerpo, 34, 9)) {
    cv.text(line, 64, y, bScale, fg);
    y += bScale * 9;
  }
  const tag = `@${brand.name}`;
  cv.text(tag, W - 64 - Canvas.textWidth(tag, 4), H - 90, 4, accent);

  const buffer = encodePng(W, H, cv.raw());
  const dataUri = `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
  return { buffer, dataUri };
};
