/**
 * Per-topic colour and glyph.
 *
 * Seventeen identically-styled cards are a wall to scan. Giving each topic
 * a hue and a mark makes the list navigable by recognition rather than by
 * reading every heading — and after a week of use, "the green one with the
 * ring" is faster than "Intermolecular Forces".
 *
 * Hues are spread around the wheel but kept at similar saturation and
 * lightness so nothing shouts louder than its neighbours on a dark ground.
 */
export const TOPIC_META = {
  periodic: { hue: 199, icon: 'grid' },
  polarity: { hue: 172, icon: 'arrow' },
  lewis: { hue: 152, icon: 'dots' },
  vsepr: { hue: 128, icon: 'tetra' },
  imf: { hue: 96, icon: 'link' },
  acidbase: { hue: 68, icon: 'proton' },
  aminoacids: { hue: 44, icon: 'chain' },
  buffers: { hue: 28, icon: 'scale' },
  biomolecules: { hue: 12, icon: 'helix' },
  energy: { hue: 350, icon: 'curve' },
  isomers: { hue: 326, icon: 'mirror' },
  skeletal: { hue: 300, icon: 'zigzag' },
  functional: { hue: 276, icon: 'group' },
  nomenclature: { hue: 254, icon: 'tag' },
  resonance: { hue: 232, icon: 'resonance' },
  arrows: { hue: 214, icon: 'curly' },
  orgopreview: { hue: 188, icon: 'branch' },
}

const FALLBACK = { hue: 199, icon: 'grid' }

export const metaFor = (id) => TOPIC_META[id] ?? FALLBACK

/** Accent colour for a topic, tuned for legibility on the dark panel. */
export const topicColor = (id, { lightness = 62, saturation = 70 } = {}) =>
  `hsl(${metaFor(id).hue} ${saturation}% ${lightness}%)`

// --- Readable button backgrounds -------------------------------------
//
// Buttons print near-black text on the topic colour, and blue contributes
// far less to perceived luminance than green or yellow. At a fixed
// lightness the blue-ish hues (nomenclature, resonance) fell to ~3.9:1,
// below the 4.5:1 needed for body text. Rather than hand-tuning each one,
// solve for the lightness that clears the bar.

const BUTTON_TEXT_LUM = 0.0064 // #06121f
const TARGET = 4.6 // a little headroom over the 4.5 minimum

function hslLuminance(h, s, l) {
  s /= 100
  l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(f(0)) + 0.7152 * lin(f(8)) + 0.0722 * lin(f(4))
}

const contrastWithText = (h, l) => (hslLuminance(h, 70, l) + 0.05) / (BUTTON_TEXT_LUM + 0.05)

/** Lowest lightness at or above 62 that keeps dark button text readable. */
function readableLightness(hue) {
  for (let l = 62; l <= 92; l += 1) {
    if (contrastWithText(hue, l) >= TARGET) return l
  }
  return 92
}

const buttonLightness = new Map()

export function topicButtonColor(id) {
  const { hue } = metaFor(id)
  if (!buttonLightness.has(hue)) buttonLightness.set(hue, readableLightness(hue))
  return `hsl(${hue} 70% ${buttonLightness.get(hue)}%)`
}

/** Exposed so validation can assert every topic clears the contrast bar. */
export const buttonContrast = (id) => {
  const { hue } = metaFor(id)
  if (!buttonLightness.has(hue)) buttonLightness.set(hue, readableLightness(hue))
  return contrastWithText(hue, buttonLightness.get(hue))
}

/** Same hue, heavily dimmed — for card tints and rails. */
export const topicTint = (id, alpha = 0.14) => `hsl(${metaFor(id).hue} 70% 55% / ${alpha})`
