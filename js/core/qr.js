/**
 * Generador de Códigos QR en SVG 100% offline (Modo Byte, Nivel L, Versiones 1-20).
 * Sin dependencias externas para funcionar en GitHub Pages y modo sin conexión.
 */

// Tabla de bloques EC Nivel L: [totalCodewords, numBlocks1, dataPerBlock1, numBlocks2, dataPerBlock2]
const VERSION_L = [
  null,
  [26, 1, 19, 0, 0],     // V1
  [44, 1, 34, 0, 0],     // V2
  [70, 1, 55, 0, 0],     // V3
  [100, 1, 80, 0, 0],    // V4
  [134, 1, 108, 0, 0],   // V5
  [172, 2, 68, 0, 0],    // V6
  [196, 2, 78, 0, 0],    // V7
  [242, 2, 97, 0, 0],    // V8
  [292, 2, 116, 0, 0],   // V9
  [346, 2, 68, 2, 69],   // V10
  [404, 4, 81, 0, 0],    // V11
  [466, 2, 92, 2, 93],   // V12
  [532, 4, 107, 0, 0],   // V13
  [581, 3, 115, 1, 116], // V14
  [655, 5, 87, 1, 88],   // V15
  [733, 5, 98, 1, 99],   // V16
  [815, 1, 107, 5, 108], // V17
  [901, 5, 120, 1, 121], // V18
  [991, 3, 113, 4, 114], // V19
  [1085, 3, 107, 5, 108] // V20
];

const ALIGNMENT_POS = [
  null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54],
  [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70],
  [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90]
];

// Aritmética GF(256) con polinomio 0x11D
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(deg) {
  let poly = [1];
  for (let i = 0; i < deg; i++) {
    const next = new Array(poly.length + 1).fill(0);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function rsComputeEc(data, ecLen) {
  const gen = rsGeneratorPoly(ecLen);
  const res = new Uint8Array(data.length + ecLen);
  res.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return res.slice(data.length);
}

function selectVersion(byteLen) {
  for (let v = 1; v <= 20; v++) {
    const [, n1, d1, n2, d2] = VERSION_L[v];
    const dataBytes = n1 * d1 + n2 * d2;
    const countBits = v <= 9 ? 8 : 16;
    const maxBytes = Math.floor((dataBytes * 8 - 4 - countBits) / 8);
    if (byteLen <= maxBytes) return v;
  }
  return -1;
}

function encodeDataCodewords(bytes, version) {
  const [, n1, d1, n2, d2] = VERSION_L[version];
  const totalDataBytes = n1 * d1 + n2 * d2;
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  pushBits(0b0100, 4); // Byte mode
  pushBits(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) pushBits(b, 8);

  const maxBits = totalDataBytes * 8;
  const termLen = Math.min(4, maxBits - bits.length);
  pushBits(0, termLen);
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (codewords.length < totalDataBytes) {
    codewords.push(padBytes[padIdx % 2]);
    padIdx++;
  }
  return new Uint8Array(codewords);
}

function interleaveBlocks(dataCodewords, version) {
  const [totalCw, n1, d1, n2, d2] = VERSION_L[version];
  const totalBlocks = n1 + n2;
  const totalData = n1 * d1 + n2 * d2;
  const ecPerBlock = (totalCw - totalData) / totalBlocks;

  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;

  for (let i = 0; i < n1; i++) {
    const blk = dataCodewords.slice(offset, offset + d1);
    dataBlocks.push(blk);
    ecBlocks.push(rsComputeEc(blk, ecPerBlock));
    offset += d1;
  }
  for (let i = 0; i < n2; i++) {
    const blk = dataCodewords.slice(offset, offset + d2);
    dataBlocks.push(blk);
    ecBlocks.push(rsComputeEc(blk, ecPerBlock));
    offset += d2;
  }

  const out = [];
  const maxDataLen = Math.max(d1, d2);
  for (let i = 0; i < maxDataLen; i++) {
    for (const blk of dataBlocks) {
      if (i < blk.length) out.push(blk[i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const blk of ecBlocks) {
      out.push(blk[i]);
    }
  }
  return out;
}

function buildMatrix(version, codewords) {
  const size = version * 4 + 17;
  const grid = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
  const reserved = Array.from({ length: size }, () => new Uint8Array(size));

  const setFixed = (r, c, val) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      grid[r][c] = val;
      reserved[r][c] = 1;
    }
  };

  const drawFinder = (top, left) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          setFixed(top + r, left + c, 0);
        } else {
          const isEdge = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          setFixed(top + r, left + c, isEdge || isCenter ? 1 : 0);
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFixed(6, i, i % 2 === 0 ? 1 : 0);
    setFixed(i, 6, i % 2 === 0 ? 1 : 0);
  }

  // Alignment patterns
  const pos = ALIGNMENT_POS[version];
  for (const r of pos) {
    for (const c of pos) {
      if (reserved[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const val = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0) ? 1 : 0;
          setFixed(r + dr, c + dc, val);
        }
      }
    }
  }

  // Dark module & reserve format/version areas
  setFixed(size - 8, 8, 1);
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      reserved[8][i] = 1;
      reserved[i][8] = 1;
    }
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = 1;
    reserved[size - 1 - i][8] = 1;
  }
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
    const vBits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = (vBits >> i) & 1;
      const a = Math.floor(i / 3);
      const b = size - 11 + (i % 3);
      setFixed(a, b, bit);
      setFixed(b, a, bit);
    }
  }

  // Place data bits (zigzag) + mask 0 ((r + c) % 2 === 0)
  const bitStream = [];
  for (const cw of codewords) {
    for (let b = 7; b >= 0; b--) bitStream.push((cw >> b) & 1);
  }

  let bitIdx = 0;
  let up = true;
  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col--;
    for (let step = 0; step < size; step++) {
      const r = up ? size - 1 - step : step;
      for (let dc = 0; dc < 2; dc++) {
        const c = col - dc;
        if (!reserved[r][c]) {
          const bit = bitIdx < bitStream.length ? bitStream[bitIdx++] : 0;
          grid[r][c] = ((r + c) % 2 === 0) ? (bit ^ 1) : bit;
        }
      }
    }
    up = !up;
  }

  // Format info for Level L (01) + Mask 0 (000) => 5-bit data 0b01000 => BCH + XOR 0x5412 = 0x77C4
  const fmtBits = 0x77c4;
  for (let i = 0; i < 15; i++) {
    const bit = (fmtBits >> i) & 1;
    if (i < 6) grid[8][i] = bit;
    else if (i < 8) grid[8][i + 1] = bit;
    else grid[8][size - 15 + i] = bit;

    if (i < 8) grid[size - 1 - i][8] = bit;
    else if (i < 9) grid[7][8] = bit;
    else grid[14 - i][8] = bit;
  }

  return grid;
}

/**
 * Genera un SVG del código QR para el texto dado, o null si excede la capacidad (V20-L).
 * @param {string} text
 * @returns {string|null}
 */
export function generateQrSvg(text) {
  const bytes = new TextEncoder().encode(text);
  const version = selectVersion(bytes.length);
  if (version === -1) return null;

  const dataCw = encodeDataCodewords(bytes, version);
  const allCw = interleaveBlocks(dataCw, version);
  const matrix = buildMatrix(version, allCw);
  const size = matrix.length;
  const quiet = 4;
  const total = size + quiet * 2;

  let pathData = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) {
        pathData += `M${c + quiet},${r + quiet}h1v1h-1z`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="QR Code" style="width: 100%; max-width: 220px; height: auto; display: block; margin: 0 auto; background: #ffffff; border-radius: 12px;"><rect width="${total}" height="${total}" fill="#ffffff"/><path d="${pathData}" fill="#0f172a"/></svg>`;
}
