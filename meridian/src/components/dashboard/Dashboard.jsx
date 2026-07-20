import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import Icon from '../Icon.jsx'
import MapThumb from './MapThumb.jsx'
import { SAMPLE_MAPS } from '../../lib/samples'
import './dashboard.css'

export default function Dashboard() {
  const { index, theme, toggleTheme, createMap, openMap, duplicateMap, removeMap } = useStore()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('updated')

  const maps = useMemo(() => {
    let m = index.filter((x) => x.title.toLowerCase().includes(q.toLowerCase()))
    m.sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title) : b.updatedAt - a.updatedAt))
    return m
  }, [index, q, sort])

  const newBlank = async () => { await createMap('Untitled map') }
  const newSample = async (s) => {
    const id = await createMap(s.title)
    // add layers after creation
    const store = useStore.getState()
    for (const l of s.layers) store.addLayer(l.name, l.data, { style: l.style })
    if (s.view) store.setView(s.view)
    if (s.basemap) store.setBasemap(s.basemap)
    store.clearSelection()
  }

  return (
    <div className="dash">
      <aside className="dash-side">
        <div className="brand">
          <span className="brand-mark"><Icon name="compass" size={22} /></span>
          <span className="brand-name">Meridian</span>
        </div>

        <div className="side-workspace">
          <div className="ws-avatar">M</div>
          <div className="ws-meta">
            <div className="ws-name">My workspace</div>
            <div className="ws-plan">Free plan</div>
          </div>
        </div>

        <nav className="side-nav">
          <div className="nav-group">Maps</div>
          <button className="nav-item active"><Icon name="folder" size={17} /> All maps</button>
          <button className="nav-item"><Icon name="clock" size={17} /> Recent</button>
          <button className="nav-item"><Icon name="users" size={17} /> Shared with me</button>
          <div className="nav-group">Data</div>
          <button className="nav-item"><Icon name="database" size={17} /> Global library</button>
          <button className="nav-item"><Icon name="upload" size={17} /> Uploads</button>
        </nav>

        <div className="side-bottom">
          <button className="nav-item" onClick={toggleTheme}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} /> {theme === 'dark' ? 'Light' : 'Dark'} mode
          </button>
          <button className="nav-item"><Icon name="settings" size={17} /> Settings</button>
          <div className="upsell">
            <div className="upsell-title">Meridian Pro</div>
            <div className="upsell-sub">Unlimited layers, real-time collaboration, and custom domains.</div>
            <button className="btn primary sm" style={{ width: '100%', justifyContent: 'center' }}>Upgrade</button>
          </div>
        </div>
      </aside>

      <main className="dash-main">
        <header className="dash-head">
          <div>
            <h1>All maps</h1>
            <p className="muted">{index.length} map{index.length === 1 ? '' : 's'} in your workspace</p>
          </div>
          <div className="dash-head-actions">
            <div className="dash-search">
              <Icon name="search" size={16} />
              <input placeholder="Search maps…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="input sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="updated">Last edited</option>
              <option value="title">Name</option>
            </select>
            <button className="btn primary" onClick={newBlank}><Icon name="plus" size={16} /> New map</button>
          </div>
        </header>

        {index.length === 0 && (
          <section className="templates">
            <h2>Start from a template</h2>
            <div className="template-row">
              <button className="template blank" onClick={newBlank}>
                <div className="template-thumb blank-thumb"><Icon name="plus" size={26} /></div>
                <div className="template-title">Blank map</div>
                <div className="template-sub muted">Start from scratch</div>
              </button>
              {SAMPLE_MAPS.map((s) => (
                <button key={s.title} className="template" onClick={() => newSample(s)}>
                  <div className="template-thumb" style={{ background: s.gradient }}>
                    <Icon name={s.icon} size={24} />
                  </div>
                  <div className="template-title">{s.title}</div>
                  <div className="template-sub muted">{s.sub}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="map-grid">
          {maps.map((m) => (
            <div key={m.id} className="map-card" onClick={() => openMap(m.id)}>
              <div className="map-card-thumb"><MapThumb meta={m} /></div>
              <div className="map-card-body">
                <div className="map-card-title">{m.title}</div>
                <div className="map-card-meta muted">
                  Edited {timeAgo(m.updatedAt)} · {m.layerCount || 0} layer{m.layerCount === 1 ? '' : 's'}
                </div>
              </div>
              <div className="map-card-actions" onClick={(e) => e.stopPropagation()}>
                <button className="btn icon sm ghost" title="Duplicate" onClick={() => duplicateMap(m.id)}><Icon name="copy" size={15} /></button>
                <button className="btn icon sm ghost" title="Delete" onClick={() => { if (confirm(`Delete "${m.title}"?`)) removeMap(m.id) }}><Icon name="trash" size={15} /></button>
              </div>
            </div>
          ))}
        </div>

        {index.length > 0 && maps.length === 0 && <div className="empty muted">No maps match “{q}”.</div>}
      </main>
    </div>
  )
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`
  return new Date(ts).toLocaleDateString()
}
