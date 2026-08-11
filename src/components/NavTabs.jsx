export default function NavTabs({ tabs, active, onChange }) {
  return (
    <nav className="nav-tabs">
      {tabs.map((tab) => (
        <button key={tab.id} className={tab.id === active ? 'active' : ''} onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
