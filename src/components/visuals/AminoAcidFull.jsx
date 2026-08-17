import AminoAcidDiagram from './AminoAcidDiagram.jsx'
import SideChainStructure from './SideChainStructure.jsx'

/**
 * The backbone with R, then R drawn out properly.
 *
 * Showing the side chain as "–CH₂CH₂COO⁻" gave a formula to read rather
 * than a shape to recognise, which is the wrong currency: exams put
 * skeletal structures on the page, and a course that asks you to draw the
 * twenty is asking for shapes. The formula stays underneath as a caption,
 * since it is still the fastest way to check what you are looking at.
 */
export default function AminoAcidFull({ aa, hideName = false }) {
  const cyclic = aa.name === 'Proline'
  return (
    <div className="aaf">
      <AminoAcidDiagram sideChain="R" name={hideName ? '?' : aa.name} cyclic={false} />
      {/* Label, structure and caption stack instead of sitting in a row, so
          the drawing gets the full width of the card rather than whatever is
          left over between two pieces of text. */}
      <div className="aaf-side">
        <span className="aaf-eq">R =</span>
        <SideChainStructure name={aa.name} />
        <span className="muted aaf-formula">{cyclic ? 'ring closes onto the backbone N' : aa.sideChain}</span>
      </div>
    </div>
  )
}
