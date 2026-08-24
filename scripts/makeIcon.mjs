import fs from 'node:fs'
import zlib from 'node:zlib'

/**
 * Draws the app icon and writes the PNG directly.
 *
 * No image library and no rasteriser is available on this machine, and adding
 * one for a handful of static files is a poor trade. The icon is simple
 * geometry, so it is drawn into a pixel buffer here and deflated into a PNG by
 * hand. That also makes it reproducible: same script, same bytes, every time.
 *
 * App Store rules the output has to satisfy: exactly 1024x1024, no alpha
 * channel, and no rounded corners of its own — iOS applies the mask, and a
 * corner drawn into the image shows up as a dark halo inside Apple's.
 *
 *   node scripts/makeIcon.mjs
 */

const BG = [0x0b, 0x12, 0x20] // --bg
const RING = [0x38, 0xbd, 0xf8] // --accent
const INNER = [0x7d, 0xd3, 0xfc] // a lighter tint of the same hue

const SS = 4 // supersampling factor; 4x4 per pixel is plenty for line art

/** Signed distance from p to the segment ab — the whole drawing is built from
 *  this, so stroke width is one number rather than per-shape maths. */
function distToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax
  const vy = by - ay
  const wx = px - ax
  const wy = py - ay
  const len2 = vx * vx + vy * vy
  let t = len2 ? (wx * vx + wy * vy) / len2 : 0
  t = Math.max(0, Math.min(1, t))
  const dx = px - (ax + t * vx)
  const dy = py - (ay + t * vy)
  return Math.hypot(dx, dy)
}

function hexVertices(cx, cy, r) {
  const pts = []
  for (let i = 0; i < 6; i++) {
    // Start at -90deg so the hexagon sits point-up, which is how a ring is
    // drawn in every textbook this app is built from.
    const a = (Math.PI / 180) * (-90 + i * 60)
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  return pts
}

export function drawIcon(size) {
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.3
  const stroke = size * 0.052
  const innerR = size * 0.155
  const innerStroke = size * 0.038

  const outer = hexVertices(cx, cy, R)
  const segs = outer.map((p, i) => [...p, ...outer[(i + 1) % 6]])

  const px = Buffer.alloc(size * size * 3)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rSum = 0
      let gSum = 0
      let bSum = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x + (sx + 0.5) / SS
          const fy = y + (sy + 0.5) / SS

          let d = Infinity
          for (const [ax, ay, bx, by] of segs) d = Math.min(d, distToSegment(fx, fy, ax, ay, bx, by))
          const onRing = d <= stroke / 2

          // The aromatic circle. Drawn as a ring rather than three inner
          // double bonds because at 60px on a home screen the doubles turn to
          // mush and this stays legible.
          const dc = Math.abs(Math.hypot(fx - cx, fy - cy) - innerR)
          const onCircle = dc <= innerStroke / 2

          const c = onRing ? RING : onCircle ? INNER : BG
          rSum += c[0]
          gSum += c[1]
          bSum += c[2]
        }
      }
      const n = SS * SS
      const o = (y * size + x) * 3
      px[o] = Math.round(rSum / n)
      px[o + 1] = Math.round(gSum / n)
      px[o + 2] = Math.round(bSum / n)
    }
  }
  return px
}

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

/** Colour type 2 is truecolour with NO alpha channel, which is what the App
 *  Store requires and what type 6 (RGBA) would fail on. */
export function encodePng(px, size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour, no alpha
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0 // filter: none
    px.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const OUTPUTS = [
  ['public/icons/icon-1024.png', 1024], // App Store / TestFlight
  ['public/icons/icon-512.png', 512],
  ['public/icons/icon-192.png', 192],
  ['public/icons/apple-touch-icon.png', 180],
]

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('makeIcon.mjs')) {
  for (const [path, size] of OUTPUTS) {
    fs.writeFileSync(path, encodePng(drawIcon(size), size))
    console.log(`${path.padEnd(36)} ${size}x${size}  ${fs.statSync(path).size} bytes`)
  }
}
