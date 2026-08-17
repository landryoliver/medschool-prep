import { AminoAcidStructure } from './SideChainStructure.jsx'

/**
 * The whole residue, drawn once.
 *
 * This used to be a generic backbone diagram with a boxed "R", stacked above
 * a second box containing the side chain drawn at its own scale in its own
 * style. One molecule shown as two disconnected pictures, and the reader had
 * to mentally paste R into the slot. Now the side chain is drawn where it
 * actually attaches, in the same coordinate space and at the same size as
 * everything else, and every residue shares one frame so they are comparable.
 *
 * The condensed formula stays as a caption: it is still the fastest way to
 * confirm what you are looking at once you have recognised the shape.
 */
export default function AminoAcidFull({ aa, hideName = false }) {
  const cyclic = aa.name === 'Proline'
  return (
    <figure className="aaf">
      <AminoAcidStructure name={aa.name} />
      <figcaption className="aaf-caption">
        {!hideName && <span className="aaf-name">{aa.name}</span>}
        <span className="muted aaf-formula">
          R = {cyclic ? 'ring closes onto the backbone N' : aa.sideChain}
        </span>
      </figcaption>
    </figure>
  )
}
