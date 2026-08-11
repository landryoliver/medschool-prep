import SkeletalDiagram from './SkeletalDiagram.jsx'
import LewisDiagram from './LewisDiagram.jsx'
import VseprDiagram from './VseprDiagram.jsx'
import BondPolarityDiagram from './BondPolarityDiagram.jsx'
import CurvedArrowDiagram from './CurvedArrowDiagram.jsx'

/** Renders whatever visual a question carries. `revealed` lets a diagram
 *  show its answer annotations once the question has been graded. */
export default function QuestionVisual({ visual, revealed = false }) {
  if (!visual) return null

  switch (visual.type) {
    case 'skeletal':
      return (
        <SkeletalDiagram
          molecule={visual.molecule}
          highlightVertex={visual.highlightVertex ?? null}
          showVertexNumbers={visual.showVertexNumbers ?? false}
          numberFromRight={visual.numberFromRight ?? false}
        />
      )
    case 'lewis':
      return <LewisDiagram structure={visual.structure} />
    case 'vsepr':
      return (
        <VseprDiagram
          geometry={visual.geometry}
          centerLabel={visual.centerLabel ?? 'A'}
          ligandLabel={visual.ligandLabel ?? 'X'}
        />
      )
    case 'bondPolarity':
      return (
        <BondPolarityDiagram
          a={visual.a}
          b={visual.b}
          deltaOn={visual.deltaOn}
          showDeltas={revealed || visual.showDeltas}
        />
      )
    case 'curvedArrow':
      return <CurvedArrowDiagram scene={visual.scene} />
    default:
      return null
  }
}
