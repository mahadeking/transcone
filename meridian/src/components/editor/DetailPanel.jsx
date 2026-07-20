import { useState } from 'react'
import { useStore } from '../../store/useStore'
import Icon from '../Icon.jsx'
import { RAMP_LIST, PALETTE_LIST } from '../../lib/mapStyle'
import { SEQUENTIAL, CATEGORICAL } from '../../lib/palettes'
import { mapRef } from '../../lib/mapRef'

const STYLE_TYPES = {
  point: [['simple', 'Simple'], ['categories', 'Categories'], ['colorRange', 'Color range'], ['sizeRange', 'Size range'], ['heatmap', 'Heatmap']],
  line: [['simple', 'Simple'], ['categories', 'Categories'], ['colorRange', 'Color range']],
  polygon: [['simple', 'Simple'], ['categories', 'Categories'], ['colorRange', 'Color range']],
}

export default function DetailPanel() {
  const selection = useStore((s) => s.selection)
  if (selection?.kind === 'annotation') return <AnnotationPanel />
  return <LayerPanel />
}

function LayerPanel() {
  const layer = useStore((s) => s.selectedLayer())
  const { updateLayer, updateLayerStyle, removeLayer, clearSelection } = useStore()
  const [tab, setTab] = useState('style')
  if (!layer) return null
  const s = layer.style
  const types = STYLE_TYPES[layer.geomType] || STYLE_TYPES.point
  const numericFields = layer.fields.filter((f) => f.numeric)
  const allFields = layer.fields

  const setS = (patch) => updateLayerStyle(layer.id, patch)
  const zoomTo = () => layer.bbox && mapRef.current?.fitBounds([[layer.bbox[0], layer.bbox[1]], [layer.bbox[2], layer.bbox[3]]], { padding: 60, duration: 800 })

  return (
    <aside className="detail">
      <div className="detail-head">
        <input className="detail-title" value={layer.name} onChange={(e) => updateLayer(layer.id, { name: e.target.value })} />
        <button className="btn icon sm ghost" onClick={clearSelection}><Icon name="close" size={16} /></button>
      </div>
      <div className="detail-toolrow">
        <button className="btn icon sm ghost" title="Zoom to" onClick={zoomTo}><Icon name="target" size={15} /></button>
        <button className="btn icon sm ghost" title="Data table" onClick={() => useStore.getState().setUI({ tableOpen: true })}><Icon name="table" size={15} /></button>
        <button className="btn icon sm ghost" title="Delete layer" onClick={() => removeLayer(layer.id)}><Icon name="trash" size={15} /></button>
      </div>

      <div className="detail-tabs">
        {['style', 'filter', 'data'].map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{cap(t)}</button>
        ))}
      </div>

      <div className="detail-body">
        {tab === 'style' && (
          <>
            <Section title="General">
              <Row label="Type">
                <select className="input" value={s.type} onChange={(e) => setS({ type: e.target.value, field: e.target.value === 'simple' ? null : (s.field || (numericFields[0] || allFields[0])?.name) })}>
                  {types.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Row>
              {s.type !== 'simple' && s.type !== 'heatmap' && (
                <Row label="Color by">
                  <select className="input" value={s.field || ''} onChange={(e) => setS({ field: e.target.value })}>
                    {(s.type === 'colorRange' || s.type === 'sizeRange' ? numericFields : allFields).map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
                  </select>
                </Row>
              )}
              {s.type === 'heatmap' && (
                <Row label="Weight by">
                  <select className="input" value={s.field || ''} onChange={(e) => setS({ field: e.target.value || null })}>
                    <option value="">Uniform</option>
                    {numericFields.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
                  </select>
                </Row>
              )}
            </Section>

            {/* palette / ramp */}
            {s.type === 'categories' && (
              <Section title="Palette">
                <div className="palette-choices">
                  {PALETTE_LIST.map((p) => (
                    <button key={p} className={'palette-chip' + (s.palette === p ? ' sel' : '')} onClick={() => setS({ palette: p })}>
                      <span className="pal-swatches">{CATEGORICAL[p].slice(0, 6).map((c, i) => <span key={i} style={{ background: c }} />)}</span>
                      {p}
                    </button>
                  ))}
                </div>
              </Section>
            )}
            {(s.type === 'colorRange' || s.type === 'heatmap') && (
              <Section title="Color ramp">
                <div className="palette-choices">
                  {RAMP_LIST.map((r) => (
                    <button key={r} className={'palette-chip' + (s.ramp === r ? ' sel' : '')} onClick={() => setS({ ramp: r })}>
                      <span className="ramp-mini" style={{ background: `linear-gradient(90deg, ${SEQUENTIAL[r].join(',')})` }} />
                      {r}
                    </button>
                  ))}
                </div>
              </Section>
            )}

            <Section title={layer.geomType === 'point' ? 'Points' : layer.geomType === 'line' ? 'Line' : 'Fill'}>
              {s.type === 'simple' || s.type === 'sizeRange' || s.type === 'heatmap' ? (
                (s.type !== 'categories' && s.type !== 'colorRange') && (
                  <Row label="Color"><ColorInput value={s.color} onChange={(v) => setS({ color: v })} /></Row>
                )
              ) : null}
              {layer.geomType === 'point' && s.type !== 'heatmap' && (
                <Row label={s.type === 'sizeRange' ? 'Max size' : 'Size'}>
                  <Slider min={2} max={40} value={s.size} onChange={(v) => setS({ size: v })} />
                </Row>
              )}
              {layer.geomType === 'line' && <Row label="Width"><Slider min={1} max={12} value={s.size} onChange={(v) => setS({ size: v })} /></Row>}
              {s.type === 'heatmap' && <Row label="Radius"><Slider min={2} max={30} value={s.size} onChange={(v) => setS({ size: v })} /></Row>}
              <Row label="Opacity"><Slider min={0} max={100} value={Math.round((s.opacity ?? 1) * 100)} onChange={(v) => setS({ opacity: v / 100 })} suffix="%" /></Row>
              {(layer.geomType === 'point' || layer.geomType === 'polygon') && s.type !== 'heatmap' && (
                <>
                  <Row label="Stroke"><ColorInput value={s.strokeColor} onChange={(v) => setS({ strokeColor: v })} /></Row>
                  <Row label="Stroke width"><Slider min={0} max={6} step={0.5} value={s.strokeWidth} onChange={(v) => setS({ strokeWidth: v })} /></Row>
                </>
              )}
            </Section>

            <Section title="Labels">
              <Row label="Label by">
                <select className="input" value={s.labelField || ''} onChange={(e) => setS({ labelField: e.target.value || null })}>
                  <option value="">None</option>
                  {allFields.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
                </select>
              </Row>
            </Section>
          </>
        )}

        {tab === 'filter' && <FilterTab layer={layer} />}
        {tab === 'data' && <DataTab layer={layer} />}
      </div>
    </aside>
  )
}

function FilterTab({ layer }) {
  const { updateLayer } = useStore()
  const [field, setField] = useState(layer.fields[0]?.name || '')
  const numeric = layer.fields.find((f) => f.name === field)?.numeric
  const applyText = (val) => {
    const data = filterFC(layer.__orig || layer.data, field, val)
    updateLayer(layer.id, { __orig: layer.__orig || layer.data, data })
  }
  const clear = () => updateLayer(layer.id, { data: layer.__orig || layer.data, __orig: undefined })
  return (
    <div className="filter-tab">
      <p className="muted" style={{ marginTop: 0 }}>Show only features where a field matches. (Simple contains-match.)</p>
      <Row label="Field">
        <select className="input" value={field} onChange={(e) => setField(e.target.value)}>
          {layer.fields.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
        </select>
      </Row>
      <Row label="Contains"><input className="input" placeholder="value…" onChange={(e) => applyText(e.target.value)} /></Row>
      <button className="btn sm" onClick={clear} style={{ marginTop: 8 }}>Clear filter</button>
    </div>
  )
}

function DataTab({ layer }) {
  const f0 = layer.data.features[0]?.properties || {}
  return (
    <div className="data-tab">
      <div className="data-meta"><b>{layer.data.features.length}</b> features · <b>{layer.fields.length}</b> fields</div>
      <div className="field-list">
        {layer.fields.map((f) => (
          <div key={f.name} className="field-row">
            <Icon name={f.numeric ? 'chart' : 'text'} size={13} />
            <span>{f.name}</span>
            <span className="chip" style={{ marginLeft: 'auto' }}>{f.numeric ? 'number' : 'text'}</span>
          </div>
        ))}
      </div>
      <div className="field-label" style={{ marginTop: 14 }}>Sample values</div>
      <pre className="data-sample">{JSON.stringify(Object.fromEntries(Object.entries(f0).slice(0, 8)), null, 2)}</pre>
    </div>
  )
}

const NAMED_COLORS = [
  { name: 'Red', hex: '#e0563b' }, { name: 'Orange', hex: '#ff7a59' }, { name: 'Yellow', hex: '#f4b740' },
  { name: 'Green', hex: '#16c79a' }, { name: 'Blue', hex: '#4f7cff' }, { name: 'Purple', hex: '#a06bff' },
  { name: 'Pink', hex: '#ff5d8f' }, { name: 'Slate', hex: '#6b7280' },
]

function AnnotationPanel() {
  const ann = useStore((s) => s.selectedAnnotation())
  const { updateAnnotation, removeAnnotation, clearSelection, duplicateAnnotation, toggleLockAnnotation } = useStore()
  if (!ann) return null
  const p = ann.properties
  const gt = ann.geometry?.type
  const isLine = gt === 'LineString'
  const isArea = gt === 'Polygon'
  const setP = (patch) => updateAnnotation(ann.id, { properties: patch })
  const named = NAMED_COLORS.find((c) => c.hex.toLowerCase() === (p.__color || '').toLowerCase())?.name

  return (
    <aside className="detail">
      <div className="detail-head">
        <div className="detail-title-static"><Icon name={p.__kind} size={16} /> {cap(p.__kind)}{p.__locked && <Icon name="target" size={13} style={{ color: 'var(--text-3)' }} />}</div>
        <button className="btn icon sm ghost" onClick={clearSelection}><Icon name="close" size={16} /></button>
      </div>
      <div className="detail-toolrow">
        <button className="btn icon sm ghost" title="Duplicate (⌘D)" onClick={() => duplicateAnnotation(ann.id)}><Icon name="copy" size={15} /></button>
        <button className="btn icon sm ghost" title={p.__locked ? 'Unlock' : 'Lock (⌘⇧L)'} onClick={() => toggleLockAnnotation(ann.id)}><Icon name={p.__locked ? 'eyeOff' : 'target'} size={15} /></button>
        <button className="btn icon sm ghost" title="Delete (Del)" onClick={() => removeAnnotation(ann.id)}><Icon name="trash" size={15} /></button>
      </div>
      <div className="detail-body">
        <Section title="Content">
          <input className="ann-name" value={p.title || ''} placeholder="Add a name" onChange={(e) => setP({ title: e.target.value })} />
          {p.__kind === 'text' && <Row label="Text"><input className="input" value={p.__text || ''} onChange={(e) => setP({ __text: e.target.value })} /></Row>}
          <textarea className="ann-desc" value={p.description || ''} placeholder="Add a description" onChange={(e) => setP({ description: e.target.value })} />
          {(p.__kind === 'link' || p.__kind === 'video') && (
            <Row label="URL"><input className="input" value={p.url || ''} placeholder="https://…" onChange={(e) => setP({ url: e.target.value })} /></Row>
          )}
        </Section>

        <Section title="Style">
          <Row label="Color">
            <div className="named-color">
              <span className="nc-name">{named || 'Custom'}</span>
              <label className="nc-custom" title="Custom color"><input type="color" value={p.__color || '#4f7cff'} onChange={(e) => setP({ __color: e.target.value })} /><span style={{ background: p.__color }} /></label>
            </div>
          </Row>
          <div className="swatch-row">
            {NAMED_COLORS.map((c) => (
              <button key={c.name} title={c.name} className={'swatch' + (p.__color?.toLowerCase() === c.hex.toLowerCase() ? ' sel' : '')} style={{ background: c.hex }} onClick={() => setP({ __color: c.hex })} />
            ))}
          </div>
          {p.__opacity != null && <Row label="Opacity"><Slider min={0} max={100} value={Math.round(p.__opacity * 100)} onChange={(v) => setP({ __opacity: v / 100 })} suffix="%" /></Row>}
          <Row label={isArea ? 'Border' : gt === 'Point' ? 'Size' : 'Width'}><Slider min={1} max={30} value={p.__size} onChange={(v) => setP({ __size: v })} /></Row>
          {(isLine || isArea) && (
            <Row label="Line style">
              <select className="input" value={p.__linestyle || 'solid'} onChange={(e) => setP({ __linestyle: e.target.value })}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
              </select>
            </Row>
          )}
        </Section>

        {(isLine || isArea) && (
          <Section title="Measurements">
            {isLine && <div className="measure-row"><span className="muted">Distance</span><b>{fmtDist(lineLength(ann.geometry))}</b></div>}
            {isArea && <div className="measure-row"><span className="muted">Area</span><b>{fmtArea(polyArea(ann.geometry))}</b></div>}
          </Section>
        )}
      </div>
    </aside>
  )
}

// ---- primitives ----
function Section({ title, children }) {
  return <div className="d-section"><div className="d-section-title">{title}</div>{children}</div>
}
function Row({ label, children }) {
  return <div className="d-row"><span className="d-row-label">{label}</span><div className="d-row-control">{children}</div></div>
}
function Slider({ min, max, step = 1, value, onChange, suffix = '' }) {
  return (
    <div className="slider-row">
      <input type="range" min={min} max={max} step={step} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="slider-val">{value}{suffix}</span>
    </div>
  )
}
function ColorInput({ value, onChange }) {
  return (
    <label className="color-input">
      <input type="color" value={value || '#4f7cff'} onChange={(e) => onChange(e.target.value)} />
      <span className="color-swatch" style={{ background: value }} />
      <span className="color-hex">{value}</span>
    </label>
  )
}
function filterFC(fc, field, val) {
  if (!val) return fc
  const v = val.toLowerCase()
  return { type: 'FeatureCollection', features: fc.features.filter((f) => String(f.properties?.[field] ?? '').toLowerCase().includes(v)) }
}
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '')

// ---- measurements ----
function haversine(a, b) {
  const R = 6371000, toR = (d) => (d * Math.PI) / 180
  const dLat = toR(b[1] - a[1]), dLng = toR(b[0] - a[0])
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[1])) * Math.cos(toR(b[1])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}
function lineLength(geom) {
  const c = geom.coordinates
  let m = 0
  for (let i = 1; i < c.length; i++) m += haversine(c[i - 1], c[i])
  return m
}
function polyArea(geom) {
  const ring = geom.coordinates[0]
  // spherical excess approximation → m²
  const R = 6378137
  let area = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng1, lat1] = ring[i], [lng2, lat2] = ring[i + 1]
    area += ((lng2 - lng1) * Math.PI / 180) * (2 + Math.sin(lat1 * Math.PI / 180) + Math.sin(lat2 * Math.PI / 180))
  }
  return Math.abs((area * R * R) / 2)
}
function fmtDist(m) {
  if (m >= 1000) return (m / 1000).toFixed(2) + ' km'
  return Math.round(m) + ' m'
}
function fmtArea(m2) {
  if (m2 >= 1e6) return (m2 / 1e6).toFixed(2) + ' km²'
  if (m2 >= 10000) return (m2 / 10000).toFixed(2) + ' ha'
  return Math.round(m2) + ' m²'
}
