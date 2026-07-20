import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import Icon from '../Icon.jsx'
import { geocodeAddress } from '../../lib/geo'
import { mapRef } from '../../lib/mapRef'
import { SAMPLE_MAPS } from '../../lib/samples'
import { getBasemap } from '../../lib/basemaps'

const ANN_TOOLS = [
  { k: 'pin', label: 'Pin', icon: 'pin', key: 'P' },
  { k: 'line', label: 'Line', icon: 'line', key: 'L' },
  { k: 'route', label: 'Route', icon: 'route', key: 'R' },
  { k: 'polygon', label: 'Polygon', icon: 'polygon', key: 'O' },
  { k: 'rectangle', label: 'Rectangle', icon: 'rectangle', key: 'E' },
  { k: 'circle', label: 'Circle', icon: 'circle', key: 'I' },
]
const MORE_TOOLS = [
  { k: 'text', label: 'Text', icon: 'text' },
  { k: 'note', label: 'Note', icon: 'note' },
  { k: 'marker', label: 'Marker', icon: 'marker' },
  { k: 'highlighter', label: 'Highlighter', icon: 'highlighter' },
  { k: 'link', label: 'Link', icon: 'link' },
  { k: 'video', label: 'Video', icon: 'video' },
]

export default function TopBar() {
  const { doc, tool, setTool, setTitle, goDashboard, setUI, ui, status, theme, toggleTheme, undo, redo } = useStore()
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const [menu, setMenu] = useState(null) // 'add' | 'library' | 'settings' | 'soon:<name>'
  const [editing, setEditing] = useState(false)
  const close = () => setMenu(null)

  return (
    <>
    {tool && <div className="draw-banner">{drawHint(tool)}</div>}
    <header className="topbar">
      <div className="tb-left">
        <button className="tb-logo" onClick={goDashboard} title="Back to dashboard">
          <Icon name="compass" size={20} />
        </button>
        <button className="tb-crumb" onClick={goDashboard}>All maps</button>
        <Icon name="chevronRight" size={14} style={{ color: 'var(--text-3)' }} />
        {editing ? (
          <input className="tb-title-input" autoFocus defaultValue={doc.title}
            onBlur={(e) => { setTitle(e.target.value || 'Untitled map'); setEditing(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }} />
        ) : (
          <button className="tb-title" onClick={() => setEditing(true)}>{doc.title}</button>
        )}
        <span className="tb-status">{status}</span>
      </div>

      {/* Felt-style icon toolbar */}
      <div className="tb-tools">
        <button className={'tb-tool' + (canUndo ? '' : ' disabled')} title="Undo (⌘Z)" onClick={() => canUndo && undo()}><Icon name="undo" size={18} /></button>
        <button className={'tb-tool' + (canRedo ? '' : ' disabled')} title="Redo (⌘⇧Z)" onClick={() => canRedo && redo()}><Icon name="redo" size={18} /></button>

        <div className="tb-divider" />

        <div className="tb-tool-wrap">
          <button className={'tb-tool' + (menu === 'add' || tool ? ' active' : '')} onClick={() => setMenu(menu === 'add' ? null : 'add')} title="Add to map (A)">
            <Icon name="pencil" size={18} /><Icon name="chevronDown" size={12} className="tb-caret" />
          </button>
          {menu === 'add' && <AddMenu onPick={(k) => { setTool(k); close() }} onClose={close} />}
        </div>

        <div className="tb-divider" />

        <div className="tb-tool-wrap">
          <button className={'tb-tool' + (menu === 'library' ? ' active' : '')} onClick={() => setMenu(menu === 'library' ? null : 'library')} title="Data library"><Icon name="book" size={18} /></button>
          {menu === 'library' && <DataLibrary onClose={close} />}
        </div>
        <button className="tb-tool" title="Upload data (U)" onClick={() => setUI({ uploadOpen: true })}><Icon name="upload" size={18} /></button>

        <div className="tb-tool-wrap">
          <button className={'tb-tool' + (menu === 'soon:Analysis' ? ' active' : '')} onClick={() => setMenu(menu === 'soon:Analysis' ? null : 'soon:Analysis')} title="Analysis"><Icon name="analysis" size={18} /></button>
          {menu === 'soon:Analysis' && <SoonPopover title="Spatial analysis" desc="Join, clip, buffer, and aggregate layers by geography." onClose={close} />}
        </div>
        <div className="tb-tool-wrap">
          <button className={'tb-tool' + (menu === 'soon:Dashboards' ? ' active' : '')} onClick={() => setMenu(menu === 'soon:Dashboards' ? null : 'soon:Dashboards')} title="Dashboards"><Icon name="chart" size={18} /></button>
          {menu === 'soon:Dashboards' && <SoonPopover title="Dashboards" desc="Charts and stats that update live with your map data." onClose={close} />}
        </div>
        <div className="tb-tool-wrap">
          <button className={'tb-tool' + (menu === 'soon:Developer' ? ' active' : '')} onClick={() => setMenu(menu === 'soon:Developer' ? null : 'soon:Developer')} title="Developer"><Icon name="code" size={18} /></button>
          {menu === 'soon:Developer' && <SoonPopover title="Developer platform" desc="Embed and control maps programmatically via a JS API." onClose={close} />}
        </div>

        <div className="tb-tool-wrap">
          <button className={'tb-tool' + (menu === 'settings' ? ' active' : '')} onClick={() => setMenu(menu === 'settings' ? null : 'settings')} title="Map settings"><Icon name="settings" size={18} /></button>
          {menu === 'settings' && <SettingsMenu onClose={close} />}
        </div>
      </div>

      <div className="tb-right">
        <div className="tb-tool-wrap"><Presence open={menu === 'team'} onToggle={() => setMenu(menu === 'team' ? null : 'team')} /></div>
        <BasemapButton />
        <button className="tb-tool" title="Data table" onClick={() => setUI({ tableOpen: !ui.tableOpen })}><Icon name="table" size={18} /></button>
        <PlaceSearch />
        <button className={'tb-tool' + (ui.commentsOpen ? ' active' : '')} title="Comments" onClick={() => setUI({ commentsOpen: !ui.commentsOpen })}><Icon name="comment" size={18} /></button>
        <button className="tb-tool" title="Toggle theme" onClick={toggleTheme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} /></button>
        <button className="btn primary tb-share" onClick={() => setUI({ shareOpen: true })}><Icon name="share" size={15} /> Share</button>
        <button className="btn tb-done" onClick={() => useStore.getState().setPreviewing(true)} title="Preview as viewer">Done</button>
      </div>
    </header>
    </>
  )
}

function Presence({ open, onToggle }) {
  const { workspace, inviteMember, goDashboard } = useStore()
  const ref = useDismiss(() => open && onToggle())
  const members = workspace.members
  const shown = members.slice(0, 3)
  return (
    <div className="presence" ref={ref}>
      <button className="presence-stack" onClick={onToggle} title="Workspace & team">
        {shown.map((m, i) => (
          <span key={m.id} className="avatar" style={{ background: m.color, zIndex: shown.length - i }}>{initials(m.name)}</span>
        ))}
        {members.length > 3 && <span className="avatar more">+{members.length - 3}</span>}
      </button>
      {open && (
        <div className="popover team-pop" style={{ left: 'auto', right: 0 }}>
          <div className="team-head">
            <div>
              <div className="team-name">{workspace.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{members.length} member{members.length === 1 ? '' : 's'}</div>
            </div>
            <span className="chip">Free plan</span>
          </div>
          <div className="pop-divider" />
          <div className="pop-label">Members</div>
          {members.map((m) => (
            <div key={m.id} className="team-member">
              <span className="avatar sm" style={{ background: m.color }}>{initials(m.name)}</span>
              <span className="tm-name">{m.name}{m.you && <span className="muted"> (you)</span>}</span>
              <span className="chip">{m.you ? 'Owner' : m.invited ? 'Invited' : 'Editor'}</span>
            </div>
          ))}
          <div className="pop-divider" />
          <InviteRow onInvite={inviteMember} />
        </div>
      )}
    </div>
  )
}

function InviteRow({ onInvite }) {
  const [v, setV] = useState('')
  const invite = () => { const name = v.trim(); if (!name) return; onInvite(name); setV('') }
  return (
    <div className="invite-row">
      <input className="input" placeholder="Name or email…" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && invite()} />
      <button className="btn primary sm" onClick={invite}>Invite</button>
    </div>
  )
}
const initials = (n) => (n || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

function drawHint(tool) {
  if (['line', 'route', 'polygon', 'highlighter'].includes(tool)) return `Drawing ${tool}: click points · double-click or ↵ to finish · Esc to cancel`
  if (['rectangle', 'circle'].includes(tool)) return `Drawing ${tool}: click two points · Esc to cancel`
  return `Placing ${tool}: click the map · Esc to cancel`
}

function useDismiss(onClose) {
  const ref = useRef()
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    setTimeout(() => document.addEventListener('mousedown', h))
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  return ref
}

function AddMenu({ onPick, onClose }) {
  const ref = useDismiss(onClose)
  const [more, setMore] = useState(false)
  return (
    <div className="popover add-menu" ref={ref}>
      <div className="pop-label">Annotations</div>
      {ANN_TOOLS.map((t) => (
        <button key={t.k} className="pop-item" onClick={() => onPick(t.k)}>
          <Icon name={t.icon} size={16} /> <span>{t.label}</span> <kbd>{t.key}</kbd>
        </button>
      ))}
      <button className="pop-item" onClick={() => setMore((v) => !v)}>
        <Icon name="grid" size={16} /> <span>More</span> <Icon name="chevronRight" size={13} style={{ marginLeft: 'auto' }} />
      </button>
      {more && MORE_TOOLS.map((t) => (
        <button key={t.k} className="pop-item indent" onClick={() => onPick(t.k)}>
          <Icon name={t.icon} size={16} /> <span>{t.label}</span>
        </button>
      ))}
      <div className="pop-divider" />
      <button className="pop-item" onClick={() => { useStore.getState().setUI({ uploadOpen: true }); onClose() }}>
        <Icon name="upload" size={16} /> <span>Upload data…</span>
      </button>
    </div>
  )
}

function DataLibrary({ onClose }) {
  const ref = useDismiss(onClose)
  const add = (sample) => {
    const store = useStore.getState()
    for (const l of sample.layers) {
      const layer = store.addLayer(l.name, l.data, { style: l.style })
      if (layer.bbox && mapRef.current) mapRef.current.fitBounds([[layer.bbox[0], layer.bbox[1]], [layer.bbox[2], layer.bbox[3]]], { padding: 60, duration: 800 })
    }
    onClose()
  }
  return (
    <div className="popover library-pop" ref={ref}>
      <div className="pop-label">Data library</div>
      {SAMPLE_MAPS.map((s) => (
        <button key={s.title} className="pop-item lib-item" onClick={() => add(s)}>
          <span className="lib-swatch" style={{ background: s.gradient }}><Icon name={s.icon} size={14} /></span>
          <span className="lib-text"><b>{s.title}</b><span className="muted">{s.sub}</span></span>
          <Icon name="plus" size={14} style={{ marginLeft: 'auto' }} />
        </button>
      ))}
      <div className="pop-divider" />
      <button className="pop-item" onClick={() => { useStore.getState().setUI({ uploadOpen: true }); onClose() }}><Icon name="upload" size={16} /> <span>Upload your own…</span></button>
    </div>
  )
}

function SettingsMenu({ onClose }) {
  const ref = useDismiss(onClose)
  const { doc, setTitle, setDescription, removeMap, goDashboard } = useStore()
  return (
    <div className="popover settings-pop" ref={ref}>
      <div className="pop-label">Map settings</div>
      <div className="settings-field">
        <span className="field-label">Title</span>
        <input className="input" defaultValue={doc.title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="settings-field">
        <span className="field-label">Description</span>
        <textarea className="input" style={{ height: 60, paddingTop: 8 }} defaultValue={doc.description} placeholder="Shown in the legend and shared view" onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="pop-divider" />
      <button className="pop-item danger" onClick={async () => { if (confirm(`Delete "${doc.title}"?`)) { const id = doc.id; await goDashboard(); useStore.getState().removeMap(id) } }}>
        <Icon name="trash" size={16} /> <span>Delete map</span>
      </button>
    </div>
  )
}

function SoonPopover({ title, desc, onClose }) {
  const ref = useDismiss(onClose)
  return (
    <div className="popover soon-pop" ref={ref}>
      <div className="soon-badge"><Icon name="sparkle" size={13} /> Coming soon</div>
      <div className="soon-title">{title}</div>
      <div className="soon-desc muted">{desc}</div>
    </div>
  )
}

function BasemapButton() {
  const { doc, ui, setUI } = useStore()
  const bm = getBasemap(doc.basemap)
  return (
    <button className={'tb-basemap' + (ui.basemapOpen ? ' active' : '')} title="Basemap" onClick={() => setUI({ basemapOpen: !ui.basemapOpen })}>
      {bm.thumb
        ? <img className="tb-basemap-img" src={bm.thumb} alt="" draggable="false" />
        : <span className="tb-basemap-swatch" style={{ background: bm.swatch }} />}
    </button>
  )
}

function PlaceSearch() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const go = async () => {
    if (!q.trim()) return
    setBusy(true)
    try {
      const c = await geocodeAddress(q)
      if (c && mapRef.current) mapRef.current.flyTo({ center: c, zoom: 11, duration: 1200 })
    } finally { setBusy(false); setOpen(false) }
  }
  return (
    <div className={'tb-search' + (open ? ' open' : '')}>
      <button className="tb-tool" onClick={() => setOpen((v) => !v)} title="Search places"><Icon name="search" size={18} /></button>
      {open && (
        <input className="tb-search-input" autoFocus placeholder="Search a place…" value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()}
          onBlur={() => setTimeout(() => setOpen(false), 150)} style={{ opacity: busy ? 0.6 : 1 }} />
      )}
    </div>
  )
}
