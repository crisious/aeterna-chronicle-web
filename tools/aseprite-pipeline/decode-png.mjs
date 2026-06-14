import { readFileSync } from 'node:fs';
import zlib from 'node:zlib';

/**
 * Minimal dependency-free PNG decoder for the Aseprite pipeline.
 *
 * Aseprite exports 8-bit RGBA (bit depth 8, color type 6), non-interlaced, so
 * that is the only form supported here. Returns { width, height, data } where
 * data is a Buffer of RGBA bytes (length = width * height * 4). Throws on any
 * unsupported PNG variant so quality gates fail loudly rather than silently
 * mis-reading pixels.
 */
export function decodePng(filePath) {
  const buf = readFileSync(filePath);
  const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < SIGNATURE.length; i += 1) {
    if (buf[i] !== SIGNATURE[i]) {
      throw new Error(`Not a PNG file: ${filePath}`);
    }
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks = [];

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset += 12 + length;
  }

  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(
      `Unsupported PNG (need 8-bit RGBA, non-interlaced): ${filePath} (bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace})`,
    );
  }

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const out = Buffer.alloc(height * stride);

  let rawPos = 0;
  for (let y = 0; y < height; y += 1) {
    const filterType = raw[rawPos];
    rawPos += 1;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[rawPos];
      rawPos += 1;
      const a = x >= bytesPerPixel ? out[y * stride + x - bytesPerPixel] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bytesPerPixel && y > 0 ? out[(y - 1) * stride + x - bytesPerPixel] : 0;
      let recon;
      switch (filterType) {
        case 0:
          recon = value;
          break;
        case 1:
          recon = value + a;
          break;
        case 2:
          recon = value + b;
          break;
        case 3:
          recon = value + ((a + b) >> 1);
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          recon = value + pred;
          break;
        }
        default:
          throw new Error(`Unsupported PNG filter type ${filterType} in ${filePath}`);
      }
      out[y * stride + x] = recon & 0xff;
    }
  }

  return { width, height, data: out };
}
