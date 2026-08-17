import { AminoAcidStructure } from './SideChainStructure.jsx'

/**
 * The whole residue, drawn once, in whichever notation is selected.
 *
 * This used to be a generic backbone diagram with a boxed "R", stacked above
 * a second box containing the side chain drawn at its own scale in its own
 * style. One molecule shown as two disconnected pictures, and the reader had
 * to mentally paste R into the slot.
 *
 * Two notations, because the two courses use two:
 *
 *   skeletal  vertices are carbons, hydrogens on carbon implied. What
 *             organic chemistry drills everywhere, and what the MCAT puts
 *             on the page alongside Fischer projections.
 *   written   every carbon spelled out, CH₂ stacked vertically. How the
 *             twenty appear in a biochemistry chart, and in the amino acid
 *             chapter of an organic textbook.
 *
 * Rings are drawn as rings either way; nobody writes benzene out as a chain.
 */
export default function AminoAcidFull({ aa, hideName = false, notation = 'skeletal' }) {
  return (
    <figure className="aaf">
      <AminoAcidStructure name={aa.name} notation={notation} />
      <figcaption className="aaf-caption">
        {!hideName && <span className="aaf-name">{aa.name}</span>}
        {/* The condensed formula, not the group's name. "isopropyl" and
            "benzyl (aromatic)" name a thing without saying what is in it,
            which is no use to a reader who does not already know the word. */}
        <span className="muted aaf-formula">
          R = {aa.formula}
          {aa.name === 'Proline' && ' , closing onto the backbone N'}
        </span>
      </figcaption>
    </figure>
  )
}
