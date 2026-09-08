/**
 * A real vector settings glyph, not the ⚙ emoji it replaces. Matches
 * TopicIcon.jsx's convention in spirit — simple, geometric, not decorative —
 * though this one is filled rather than stroked, since a gear's teeth read
 * far more cleanly as solid shapes than as open outlines.
 *
 * One tooth rectangle, replicated at eight 45° rotations via SVG's own
 * transform — SVG does that arithmetic, not a hand-typed path string, which
 * is the same "derive it, do not guess it" reasoning the chemistry diagrams
 * already use, applied to an icon instead of a molecule. The hole is a true
 * transparent cutout via a mask, so it reads correctly on any background —
 * flat, translucent, or blurred — rather than a circle painted to match one
 * background color that stops working the moment the surface changes.
 */
export default function GearIcon({ size = 18, color = 'currentColor' }) {
  const id = 'gear-hole-mask'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <mask id={id}>
        <rect x="0" y="0" width="24" height="24" fill="white" />
        <circle cx="12" cy="12" r="3.4" fill="black" />
      </mask>
      <g mask={`url(#${id})`} fill={color}>
        <circle cx="12" cy="12" r="6.2" />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="10.2" y="0.7" width="3.6" height="3.6" rx="0.8" transform={`rotate(${i * 45} 12 12)`} />
        ))}
      </g>
    </svg>
  )
}
