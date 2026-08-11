import { useMemo } from 'react'
import StudySessionView from '../../components/StudySessionView.jsx'
import lewisStructures from '../../data/genchem/lewisStructures.json'
import vsepr from '../../data/genchem/vsepr.json'
import acidBase from '../../data/genchem/acidBase.json'
import { generateTrendQuestionBank } from './generateTrendQuestion.js'

const CURATED = [...lewisStructures, ...vsepr, ...acidBase].map((q) => ({ ...q, kind: 'mcq' }))
const GENERATED_TREND_COUNT = 40 // fixed seed range so ids/progress stay stable across sessions

export default function Mode0GenChemPrep() {
  const bank = useMemo(() => [...CURATED, ...generateTrendQuestionBank(GENERATED_TREND_COUNT)], [])

  return <StudySessionView mode="mode0-genchem" title="Gen-Chem Prep" bank={bank} sessionSize={15} />
}
