import { useStore } from '../../store/useStore'
import Icon from '../Icon.jsx'
import { computeLegend } from '../../lib/mapStyle'
import { mapRef } from '../../lib/mapRef'

export default function LeftPanel() {
  const { doc, ui, setUI, selection, select, toggleLayer, removeLayer, reorderLayers } = useStore()
  const tab = ui.leftTab

  return (
    <aside className="left-panel">
      <div className="lp-tabs">
        <button className={tab === 'legend' ? 'active' : ''} onClick={() => setUI({ leftTab: 'legend' })}>Legend</button>
        <button className={tab === 'list' ? 'active' : ''} onClick={() => setUI({ leftTab: 'list' })}>List</button>
      </div>

      <div className="lp-body">
        {doc.description && tab === 'legend' && <p className="lp-desc">{doc.description}</p>}

        {doc.layers.length === 0 && doc.annotations.length === 0 && (
          <div className="lp-empty">
            <div className="lp-empty-icon"><Icon name="layers" size={26} /></div>
            <div className="lp-empty-title">No layers yet</div>
            <p>Upload a dataset or drop a file on the map to get started.</p>
            <button className="btn primary sm" onClick={() => setUI({ uploadOpen: true })}><Icon name="upload" size={14} /> Upload data</button>
          </div>
        )}

        {tab === 'legend'
          ? doc.layers.map((l) => <LegendCard key={l.id} layer={l} />)
          : <ListView />}

        {tab === 'legend' && doc.annotations.length > 0 && (
          <div className="legend-card">
            <div className="legend-head"><Icon name="pin" size={15} /> <b>Annotations</b><span className="count">{doc.annotations.length}</span></div>
          </div>
        )}
      </div>

      {(doc.layers.length > 0 || doc.annotations.length > 0) && (
        <div className="lp-foot muted">Made with Meridian</div>
      )}
    </aside>
  )
}

function LegendCard({ layer }) {
  const { select, toggleLayer } = useStore()
  const legend = computeLegend(layer)
  const zoomTo = () => {
    if (layer.bbox && mapRef.current) mapRef.current.fitBounds([[layer.bbox[0], layer.bbox[1]], [layer.bbox[2], layer.bbox[3]]], { padding: 60, duration: 900 })
  }
  return (
    <div className={'legend-card' + (layer.visible ? '' : ' dim')}>
      <div className="legend-head">
        <button className="legend-title" onClick={() => select('layer', layer.id)}>
          <span className="legend-swatch" style={{ background: swatchColor(layer) }} />
          <b>{layer.name}</b>
        </button>
        <div className="legend-actions">
          <button className="btn icon sm ghost" title="Zoom to layer" onClick={zoomTo}><Icon name="target" size={14} /></button>
          <button className="btn icon sm ghost" title={layer.visible ? 'Hide' : 'Show'} onClick={() => toggleLayer(layer.id)}>
            <Icon name={layer.visible ? 'eye' : 'eyeOff'} size={14} />
          </button>
        </div>
      </div>
      <LegendBody legend={legend} layer={layer} />
    </div>
  )
}

function LegendBody({ legend, layer }) {
  if (legend.kind === 'categories') {
    const counts = countBy(layer.data, legend.field)
    return (
      <div className="legend-list">
        <div className="legend-field">{legend.field}</div>
        {legend.items.map((it) => (
          <div key={it.label} className="legend-row">
            <span className="dot" style={{ background: it.color }} />
            <span className="lr-label">{it.label}</span>
            <span className="lr-val">{counts[it.label] || 0}</span>
          </div>
        ))}
      </div>
    )
  }
  if (legend.kind === 'ramp') {
    return (
      <div className="legend-ramp">
        <div className="legend-field">{legend.field}</div>
        <div className="ramp-bar" style={{ background: `linear-gradient(90deg, ${legend.stops.map((s) => s.color).join(',')})` }} />
        <div className="ramp-scale"><span>{fmt(legend.stops[0].from)}</span><span>{fmt(legend.stops.at(-1).to)}</span></div>
      </div>
    )
  }
  if (legend.kind === 'size') {
    return (
      <div className="legend-size">
        <div className="legend-field">{legend.field}</div>
        <div className="size-demo">
          <span className="size-dot" style={{ width: legend.minSize * 2, height: legend.minSize * 2, background: legend.color }} />
          <span className="size-dot" style={{ width: legend.maxSize * 2, height: legend.maxSize * 2, background: legend.color }} />
          <span className="muted" style={{ fontSize: 11 }}>{fmt(legend.min)} – {fmt(legend.max)}</span>
        </div>
      </div>
    )
  }
  if (legend.kind === 'heatmap') {
    return <div className="legend-ramp"><div className="ramp-bar heat" /><div className="ramp-scale"><span>Low</span><span>High</span></div></div>
  }
  return <div className="legend-simple"><span className="dot" style={{ background: legend.color }} /> <span className="muted">{layer.data.features.length} features</span></div>
}

function ListView() {
  const { doc, selection, select, toggleLayer, removeLayer, reorderLayers, removeAnnotation } = useStore()
  return (
    <div className="list-view">
      <div className="list-group-label">Layers</div>
      {doc.layers.map((l, i) => (
        <div key={l.id} className={'list-item' + (selection?.id === l.id ? ' sel' : '')} onClick={() => select('layer', l.id)}>
          <span className="li-drag"><Icon name="drag" size={14} /></span>
          <span className="legend-swatch" style={{ background: swatchColor(l) }} />
          <span className="li-name">{l.name}</span>
          <span className="li-count">{l.geomType}</span>
          <button className="btn icon sm ghost" onClick={(e) => { e.stopPropagation(); toggleLayer(l.id) }}><Icon name={l.visible ? 'eye' : 'eyeOff'} size={14} /></button>
          <button className="btn icon sm ghost" onClick={(e) => { e.stopPropagation(); removeLayer(l.id) }}><Icon name="trash" size={14} /></button>
        </div>
      ))}
      {doc.layers.length === 0 && <div className="list-none muted">No layers</div>}

      <div className="list-group-label">Annotations</div>
      {doc.annotations.map((a) => (
        <div key={a.id} className={'list-item' + (selection?.id === a.id ? ' sel' : '')} onClick={() => select('annotation', a.id)}>
          <span className="legend-swatch" style={{ background: a.properties.__color }} />
          <span className="li-name">{a.properties.title || a.properties.__text || cap(a.properties.__kind)}</span>
          <span className="li-count">{a.properties.__kind}</span>
          <button className="btn icon sm ghost" onClick={(e) => { e.stopPropagation(); removeAnnotation(a.id) }}><Icon name="trash" size={14} /></button>
        </div>
      ))}
      {doc.annotations.length === 0 && <div className="list-none muted">No annotations</div>}
    </div>
  )
}

// helpers
function swatchColor(layer) {
  const s = layer.style
  if (s.type === 'categories') return 'conic-gradient(#4f7cff,#16c79a,#ff7a59,#f4b740,#a06bff)'
  if (s.type === 'colorRange' || s.type === 'heatmap') return 'linear-gradient(90deg,#eff6ff,#4f7cff,#2f4fc4)'
  return s.color
}
function countBy(fc, field) {
  const c = {}
  for (const f of fc.features || []) { const v = f.properties?.[field]; if (v != null) c[v] = (c[v] || 0) + 1 }
  return c
}
const fmt = (n) => (typeof n === 'number' ? (Math.abs(n) >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : +n.toFixed(2)) : n)
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '')
