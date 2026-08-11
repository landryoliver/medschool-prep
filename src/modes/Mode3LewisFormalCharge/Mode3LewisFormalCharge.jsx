import { useMemo } from 'react'
import StudySessionView from '../../components/StudySessionView.jsx'
import formalCharge from '../../data/genchem/formalCharge.json'

export default function Mode3LewisFormalCharge() {
  const bank = useMemo(() => formalCharge.map((q) => ({ ...q, kind: 'numeric' })), [])

  return <StudySessionView mode="mode3-formalcharge" title="Formal Charge Drills" bank={bank} sessionSize={12} />
}
