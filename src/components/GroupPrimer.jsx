import GroupDiagram from './visuals/GroupDiagram.jsx'

/**
 * What the named groups actually are.
 *
 * The lessons used "carboxyl" and "amino" as if the reader could picture
 * them. That assumption is exactly wrong for someone years out of
 * chemistry — and every later idea depends on seeing the arrangement, not
 * knowing the word.
 */
export const GROUPS = [
  {
    kind: 'hydroxyl',
    name: 'Hydroxyl',
    formula: '–OH',
    found: 'alcohols, serine, threonine, tyrosine, sugars',
    why: 'An oxygen carrying a hydrogen. It both donates and accepts hydrogen bonds, which is why alcohols dissolve in water and boil far above hydrocarbons of the same size.',
  },
  {
    kind: 'carbonyl',
    name: 'Carbonyl',
    formula: 'C=O',
    found: 'aldehydes, ketones — and inside every group below it',
    why: 'A carbon double bonded to an oxygen. Oxygen pulls the electrons, leaving that carbon δ+ and open to attack. This is the single most reactive arrangement in organic chemistry.',
  },
  {
    kind: 'carboxyl',
    name: 'Carboxyl',
    formula: '–COOH',
    found: 'carboxylic acids, aspartate, glutamate, fatty acids',
    why: 'A carbonyl and a hydroxyl on the same carbon. Losing that proton gives a carboxylate whose charge spreads over both oxygens — which is why these are the acidic groups in biology (pKa ~4).',
  },
  {
    kind: 'amino',
    name: 'Amino',
    formula: '–NH₂',
    found: 'amines, lysine, the backbone of every amino acid',
    why: "Nitrogen with a lone pair to spare, so it grabs protons. At physiological pH it is usually protonated to –NH₃⁺ and carries a positive charge.",
  },
  {
    kind: 'thiol',
    name: 'Thiol',
    formula: '–SH',
    found: 'cysteine',
    why: 'Sulfur sits directly below oxygen, so a thiol is the sulfur version of an alcohol. It is more acidic (pKa 8.3) and far more nucleophilic — and two of them oxidize into a disulfide bridge.',
  },
  {
    kind: 'amide',
    name: 'Amide',
    formula: '–CONH₂',
    found: 'asparagine, glutamine, and every peptide bond',
    why: "A carbonyl bonded to a nitrogen. The nitrogen's lone pair delocalizes into the C=O, so amides are NOT basic and the bond cannot rotate — which is what holds a protein backbone rigid.",
  },
  {
    kind: 'ester',
    name: 'Ester',
    formula: '–COOR',
    found: 'fats and oils, flavour molecules',
    why: 'A carboxyl whose acidic hydrogen has been replaced by a carbon. Three of them on a glycerol backbone is a triglyceride.',
  },
  {
    kind: 'ether',
    name: 'Ether',
    formula: 'R–O–R',
    found: 'diethyl ether, the ring oxygen in sugars',
    why: 'An oxygen bridging two carbons. It has lone pairs so it can ACCEPT a hydrogen bond, but with no O–H it cannot donate one — worth about 80 °C of boiling point against the matching alcohol.',
  },
  {
    kind: 'phosphate',
    name: 'Phosphate',
    formula: '–OPO₃²⁻',
    found: 'ATP, DNA and RNA backbones, phosphorylated proteins',
    why: 'Highly charged and strongly repelling itself, which is why breaking ATP releases so much usable energy. Kinases attach these to serine, threonine and tyrosine.',
  },
  {
    kind: 'aromatic',
    name: 'Aromatic ring',
    formula: 'C₆H₆',
    found: 'phenylalanine, tyrosine, tryptophan, benzene',
    why: 'Six carbons with fully delocalized electrons, drawn as a circle inside the ring. Flat, unusually stable, and hydrophobic unless something polar hangs off it.',
  },
]

export default function GroupPrimer() {
  return (
    <div>
      <div className="card">
        <h3 className="ref-heading">What the named groups actually look like</h3>
        <p className="muted backup-note">
          Reactivity lives in these clusters; the carbon skeleton around them is mostly inert scaffolding. R stands for
          the rest of the molecule.
        </p>
      </div>

      {GROUPS.map((g) => (
        <div className="card group-card" key={g.kind}>
          <div className="group-row">
            <GroupDiagram kind={g.kind} />
            <div className="group-main">
              <div className="aa-head">
                <strong>{g.name}</strong>
                <span className="muted">{g.formula}</span>
              </div>
              <p className="muted group-found">Found in: {g.found}</p>
            </div>
          </div>
          <p className="group-why">{g.why}</p>
        </div>
      ))}
    </div>
  )
}
