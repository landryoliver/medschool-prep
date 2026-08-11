import { useMemo } from 'react'
import StudySessionView from '../../components/StudySessionView.jsx'
import skeletalDrills from '../../data/skeletal/skeletalDrills.json'

export default function Mode4SkeletalFluency() {
  const bank = useMemo(() => skeletalDrills.map((q) => ({ ...q, kind: 'mcq' })), [])

  return <StudySessionView mode="mode4-skeletal" title="Skeletal Fluency" bank={bank} sessionSize={10} />
}
