import { useState } from 'react'
import NavTabs from './components/NavTabs.jsx'
import ProgressView from './components/ProgressView.jsx'
import Mode0GenChemPrep from './modes/Mode0GenChemPrep/Mode0GenChemPrep.jsx'
import Mode3LewisFormalCharge from './modes/Mode3LewisFormalCharge/Mode3LewisFormalCharge.jsx'
import Mode4SkeletalFluency from './modes/Mode4SkeletalFluency/Mode4SkeletalFluency.jsx'
import Mode5CuratedBank from './modes/Mode5CuratedBank/Mode5CuratedBank.jsx'
import { getLastMode, setLastMode } from './lib/storage.js'

const TABS = [
  { id: 'genchem', label: 'Gen-Chem Prep' },
  { id: 'formalcharge', label: 'Formal Charge' },
  { id: 'skeletal', label: 'Skeletal Fluency' },
  { id: 'curated', label: 'Curated Bank' },
  { id: 'progress', label: 'Progress' },
]

export default function App() {
  const [active, setActive] = useState(() => getLastMode() ?? 'genchem')

  function handleChange(id) {
    setActive(id)
    setLastMode(id)
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Orgo Prep</h1>
      </header>
      <NavTabs tabs={TABS} active={active} onChange={handleChange} />
      <main className="app-main">
        {active === 'genchem' && <Mode0GenChemPrep />}
        {active === 'formalcharge' && <Mode3LewisFormalCharge />}
        {active === 'skeletal' && <Mode4SkeletalFluency />}
        {active === 'curated' && <Mode5CuratedBank />}
        {active === 'progress' && <ProgressView />}
      </main>
    </div>
  )
}
