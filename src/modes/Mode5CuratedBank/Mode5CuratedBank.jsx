import { useMemo } from 'react'
import StudySessionView from '../../components/StudySessionView.jsx'
import pkaComparisons from '../../data/curated/pkaComparisons.json'
import mechanismConcepts from '../../data/curated/mechanismConcepts.json'
import snsE from '../../data/curated/snsE.json'

const CURATED = [...pkaComparisons, ...mechanismConcepts, ...snsE].map((q) => ({ ...q, kind: 'mcq' }))

export default function Mode5CuratedBank() {
  const bank = useMemo(() => CURATED, [])

  return <StudySessionView mode="mode5-curated" title="Curated Orgo Bank" bank={bank} sessionSize={15} />
}
