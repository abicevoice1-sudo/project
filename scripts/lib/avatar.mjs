// Uploads branded monogram avatars to the seeded demo profiles.
//
// NOT photorealistic faces. These are invented people on a matrimonial site
// where families make real decisions; attaching synthetic human photographs to
// them would mislead in a way a typographic monogram does not. Real members
// upload their own photographs through this same endpoint.
import zlib from 'node:zlib';
import fs from 'node:fs';

const API = 'https://shiarishta.com/api';
const PASSWORD = 'DemoRishta!2026';
const GRADIENTS = [
  ['#33604F', '#1B3D31'], ['#B98334', '#8A5A20'], ['#8C5A3B', '#5C3A26'],
  ['#3E5C76', '#22384A'], ['#6B4E71', '#3E2C42'], ['#4A7C59', '#27452F'],
];

const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hexRgb = (h) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').substr(i, 2), 16));

function pngEncode(w, h, rgb) {
  const chunk = (type, data) => {
    const l = Buffer.alloc(4); l.writeUInt32BE(data.length);
    const b = Buffer.concat([Buffer.from(type), data]);
    const k = Buffer.alloc(4); k.writeUInt32BE(zlib.crc32(b));
    return Buffer.concat([l, b, k]);
  };
  const raw = [];
  for (let y = 0; y < h; y++) raw.push(Buffer.from([0]), rgb.subarray(y * w * 3, (y + 1) * w * 3));
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(raw), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function renderAvatar(initials, from, to) {
  const size = 400;
  const [r1, g1, b1] = hexRgb(from); const [r2, g2, b2] = hexRgb(to);
  const [fr, fg, fb] = hexRgb('#FFFAF4');
  const scale = 26, gw = 5 * scale, gh = 7 * scale, gap = 26;
  const glyphs = [...initials.toUpperCase()].map((c) => FONT[c] || FONT.A);
  const totalW = glyphs.length * gw + (glyphs.length - 1) * gap;
  const ox = Math.floor((size - totalW) / 2), oy = Math.floor((size - gh) / 2);
  const ink = new Set();
  glyphs.forEach((rows, gi) => rows.forEach((row, ry) => [...row].forEach((bit, cx) => {
    if (bit !== '1') return;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      ink.add((oy + ry * scale + dy) * size + (ox + gi * (gw + gap) + cx * scale + dx));
    }
  })));
  const buf = Buffer.alloc(size * size * 3);
  let o = 0;
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const r = Math.round(r1 + (r2 - r1) * t), g = Math.round(g1 + (g2 - g1) * t), b = Math.round(b1 + (b2 - b1) * t);
    for (let x = 0; x < size; x++) {
      const on = ink.has(y * size + x);
      buf[o++] = on ? fr : r; buf[o++] = on ? fg : g; buf[o++] = on ? fb : b;
    }
  }
  return pngEncode(size, size, buf);
}

export { API, PASSWORD, renderAvatar, sleep };