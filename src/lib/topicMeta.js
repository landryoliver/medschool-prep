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

/** Same hue, heavily dimmed — for card tints and rails. */
export const topicTint = (id, alpha = 0.14) => `hsl(${metaFor(id).hue} 70% 55% / ${alpha})`
