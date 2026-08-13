import { metaFor, topicColor } from '../lib/topicMeta.js'

/**
 * A small glyph per topic, drawn rather than lettered so the cards read as
 * a set. Each one gestures at what the topic actually is — a zigzag for
 * skeletal structures, a balance for pH, a reflected pair for isomers —
 * which makes them recognisable rather than decorative.
 */
const PATHS = {
  // periodic table: a block of cells
  grid: (c) => (
    <>
      <rect x="3" y="5" width="5" height="5" rx="1" stroke={c} fill="none" strokeWidth="1.6" />
      <rect x="10" y="5" width="5" height="5" rx="1" stroke={c} fill="none" strokeWidth="1.6" />
      <rect x="17" y="5" width="4" height="5" rx="1" stroke={c} fill="none" strokeWidth="1.6" />
      <rect x="3" y="12" width="5" height="5" rx="1" stroke={c} fill="none" strokeWidth="1.6" />
      <rect x="10" y="12" width="11" height="5" rx="1" stroke={c} fill="none" strokeWidth="1.6" />
    </>
  ),
  // bond polarity: a dipole arrow
  arrow: (c) => (
    <>
      <circle cx="6" cy="11" r="3.2" stroke={c} fill="none" strokeWidth="1.6" />
      <circle cx="18" cy="11" r="3.2" stroke={c} fill="none" strokeWidth="1.6" />
      <line x1="9.5" y1="11" x2="14.5" y2="11" stroke={c} strokeWidth="1.6" />
      <path d="M13 8.6 L15.4 11 L13 13.4" stroke={c} fill="none" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  // lewis: an atom with lone pairs
  dots: (c) => (
    <>
      <circle cx="12" cy="11" r="4.2" stroke={c} fill="none" strokeWidth="1.6" />
      <circle cx="12" cy="3.6" r="1.3" fill={c} />
      <circle cx="12" cy="18.4" r="1.3" fill={c} />
      <circle cx="4.6" cy="11" r="1.3" fill={c} />
      <circle cx="19.4" cy="11" r="1.3" fill={c} />
    </>
  ),
  // vsepr: a tetrahedral centre
  tetra: (c) => (
    <>
      <circle cx="12" cy="11" r="2.4" fill={c} />
      <line x1="12" y1="11" x2="12" y2="3.5" stroke={c} strokeWidth="1.6" />
      <line x1="12" y1="11" x2="5" y2="16" stroke={c} strokeWidth="1.6" />
      <line x1="12" y1="11" x2="19" y2="16" stroke={c} strokeWidth="1.6" />
      <circle cx="12" cy="3.5" r="1.6" stroke={c} fill="none" strokeWidth="1.4" />
      <circle cx="5" cy="16" r="1.6" stroke={c} fill="none" strokeWidth="1.4" />
      <circle cx="19" cy="16" r="1.6" stroke={c} fill="none" strokeWidth="1.4" />
    </>
  ),
  // imf: two molecules attracting
  link: (c) => (
    <>
      <circle cx="6.5" cy="11" r="3.4" stroke={c} fill="none" strokeWidth="1.6" />
      <circle cx="17.5" cy="11" r="3.4" stroke={c} fill="none" strokeWidth="1.6" />
      <line x1="10.4" y1="11" x2="13.6" y2="11" stroke={c} strokeWidth="1.6" strokeDasharray="2 2" />
    </>
  ),
  // acid-base: a proton handed from one atom to another
  proton: (c) => (
    <>
      <circle cx="5" cy="14" r="3.2" stroke={c} fill="none" strokeWidth="1.6" />
      <circle cx="19" cy="14" r="3.2" stroke={c} fill="none" strokeWidth="1.6" />
      <path d="M7 9.5 C 10 4, 14 4, 17 9.5" stroke={c} fill="none" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15 9 L17.4 10.2 L17.8 7.6" stroke={c} fill={c} strokeWidth="1.2" strokeLinejoin="round" />
      <text x="12" y="4.5" fill={c} fontSize="6.5" textAnchor="middle" fontWeight="700">H⁺</text>
    </>
  ),
  // amino acids: a peptide chain
  chain: (c) => (
    <>
      <path d="M3 14 L8 8 L13 14 L18 8 L21 11" stroke={c} fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.5" fill={c} />
      <circle cx="18" cy="8" r="1.5" fill={c} />
    </>
  ),
  // buffers: a balance
  scale: (c) => (
    <>
      <line x1="12" y1="4" x2="12" y2="17" stroke={c} strokeWidth="1.6" />
      <line x1="4" y1="8" x2="20" y2="8" stroke={c} strokeWidth="1.6" />
      <path d="M4 8 L1.8 13 h4.4 Z" stroke={c} fill="none" strokeWidth="1.4" />
      <path d="M20 8 L17.8 13 h4.4 Z" stroke={c} fill="none" strokeWidth="1.4" />
      <line x1="8" y1="18" x2="16" y2="18" stroke={c} strokeWidth="1.6" />
    </>
  ),
  // biomolecules: a helix
  helix: (c) => (
    <>
      <path d="M7 3 C 17 7, 7 12, 17 16 M17 3 C 7 7, 17 12, 7 16" stroke={c} fill="none" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="9.5" y1="6" x2="14.5" y2="6" stroke={c} strokeWidth="1.2" />
      <line x1="9.5" y1="13" x2="14.5" y2="13" stroke={c} strokeWidth="1.2" />
    </>
  ),
  // energy: a reaction coordinate
  curve: (c) => (
    <>
      <path d="M3 16 C 7 16, 8 5, 12 5 C 16 5, 17 14, 21 14" stroke={c} fill="none" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="5" r="1.6" fill={c} />
    </>
  ),
  // isomers: mirror images
  mirror: (c) => (
    <>
      <line x1="12" y1="3" x2="12" y2="19" stroke={c} strokeWidth="1.3" strokeDasharray="2 2" />
      <path d="M9 6 L4 11 L9 16" stroke={c} fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 6 L20 11 L15 16" stroke={c} fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // skeletal: line-angle chain
  zigzag: (c) => (
    <path d="M2 15 L7 8 L12 15 L17 8 L22 15" stroke={c} fill="none" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  ),
  // functional groups: a highlighted cluster
  group: (c) => (
    <>
      <path d="M3 14 L8 9 L13 14" stroke={c} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17" cy="9" r="4.2" stroke={c} fill="none" strokeWidth="1.6" strokeDasharray="2.5 2" />
      <line x1="13" y1="14" x2="15" y2="12" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  // nomenclature: a label
  tag: (c) => (
    <>
      <path d="M3 8 h11 l6 3.5 l-6 3.5 H3 Z" stroke={c} fill="none" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="7" cy="11.5" r="1.3" fill={c} />
    </>
  ),
  // resonance: the double-headed arrow
  resonance: (c) => (
    <>
      <line x1="5" y1="11" x2="19" y2="11" stroke={c} strokeWidth="1.7" />
      <path d="M8 8 L5 11 L8 14" stroke={c} fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 8 L19 11 L16 14" stroke={c} fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // curved arrows: a pushed pair
  curly: (c) => (
    <>
      <path d="M4 15 C 6 6, 16 6, 19 12" stroke={c} fill="none" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16.4 11.6 L19.4 12.6 L18.4 9.4" stroke={c} fill={c} strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="4" cy="15" r="1.4" fill={c} />
    </>
  ),
  // preview: a branching path
  branch: (c) => (
    <>
      <path d="M4 11 h6" stroke={c} fill="none" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M10 11 L16 6" stroke={c} fill="none" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M10 11 L16 16" stroke={c} fill="none" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="17.6" cy="5.4" r="1.7" fill={c} />
      <circle cx="17.6" cy="16.6" r="1.7" fill={c} />
    </>
  ),
}

export default function TopicIcon({ topicId, size = 24 }) {
  const { icon } = metaFor(topicId)
  const color = topicColor(topicId)
  const draw = PATHS[icon] ?? PATHS.grid

  return (
    <svg viewBox="0 0 24 22" width={size} height={size} aria-hidden="true">
      {draw(color)}
    </svg>
  )
}
