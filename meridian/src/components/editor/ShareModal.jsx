import { useState } from 'react'
import { useStore } from '../../store/useStore'
import Icon from '../Icon.jsx'
import { mapRef } from '../../lib/mapRef'
import { toCSV } from '../../lib/geo'
import { drawingsToSVG, svgToPngDataURL } from '../../lib/exportDrawings'

export default function ShareModal() {
  const { doc, setUI } = useStore()
  const [copied, setCopied] = useState('')
  const [includeLayers, setIncludeLayers] = useState(true)
  const close = () => setUI({ shareOpen: false })
  const hasDrawings = doc.annotations.length > 0 || doc.layers.length > 0

  const viewUrl = `${location.origin}${location.pathname}#/view/${doc.id}`
  const embedCode = `<iframe src="${viewUrl}?embed" width="100%" height="480" style="border:0;border-radius:12px" allowfullscreen></iframe>`

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1500) }

  const download = (name, text, type = 'application/json') => {
    const blob = new Blob([text], { type })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = name; a.click()
    URL.revokeObjectURL(a.href)
  }

  const exportGeoJSON = () => {
    const merged = { type: 'FeatureCollection', features: [] }
    for (const l of doc.layers) merged.features.push(...l.data.features.map((f) => ({ ...f, properties: { ...f.properties, __layer: l.name } })))
    merged.features.push(...doc.annotations)
    download(`${slug(doc.title)}.geojson`, JSON.stringify(merged))
  }
  const exportMapFile = () => download(`${slug(doc.title)}.meridian.json`, JSON.stringify(doc))
  const exportCSV = () => {
    const l = doc.layers[0]
    if (!l) return alert('No layers to export.')
    download(`${slug(l.name)}.csv`, toCSV(l.data), 'text/csv')
  }
  const exportPNG = () => {
    const map = mapRef.current
    if (!map) return
    map.redraw?.()
    requestAnimationFrame(() => {
      const url = map.getCanvas().toDataURL('image/png')
      const a = document.createElement('a'); a.href = url; a.download = `${slug(doc.title)}.png`; a.click()
    })
  }

  // ---- drawings-only exports (clean vector, no basemap) ----
  const drawingsGeoJSON = () => {
    const features = [...doc.annotations]
    if (includeLayers) for (const l of doc.layers) features.push(...l.data.features.map((f) => ({ ...f, properties: { ...f.properties, __layer: l.name } })))
    download(`${slug(doc.title)}-drawings.geojson`, JSON.stringify({ type: 'FeatureCollection', features }))
  }
  const drawingsSVG = () => {
    const map = mapRef.current; if (!map) return
    const { svg, count } = drawingsToSVG(map, doc, { includeLayers, background: 'transparent' })
    if (!count) return alert('Nothing to export in the current view.')
    download(`${slug(doc.title)}-drawings.svg`, svg, 'image/svg+xml')
  }
  const drawingsPNG = async () => {
    const map = mapRef.current; if (!map) return
    const { svg, W, H, count } = drawingsToSVG(map, doc, { includeLayers, background: 'transparent' })
    if (!count) return alert('Nothing to export in the current view.')
    const url = await svgToPngDataURL(svg, W, H)
    const a = document.createElement('a'); a.href = url; a.download = `${slug(doc.title)}-drawings.png`; a.click()
  }

  return (
    <div className="modal-scrim" onClick={close}>
      <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3><Icon name="share" size={18} /> Share “{doc.title}”</h3>
          <button className="btn icon sm ghost" onClick={close}><Icon name="close" size={16} /></button>
        </div>

        <div className="share-access card">
          <div className="sa-row">
            <div className="sa-icon"><Icon name="globe" size={18} /></div>
            <div>
              <div className="sa-title">Anyone with the link can view</div>
              <div className="sa-sub muted">This preview link opens the read-only map in this browser.</div>
            </div>
            <span className="chip">View</span>
          </div>
        </div>

        <div className="field-label">Map link</div>
        <div className="copy-row">
          <input className="input" readOnly value={viewUrl} onFocus={(e) => e.target.select()} />
          <button className="btn primary" onClick={() => copy(viewUrl, 'link')}>{copied === 'link' ? <><Icon name="check" size={15} /> Copied</> : 'Copy'}</button>
        </div>

        <div className="field-label" style={{ marginTop: 16 }}>Embed on a website</div>
        <div className="copy-row">
          <input className="input" readOnly value={embedCode} onFocus={(e) => e.target.select()} />
          <button className="btn" onClick={() => copy(embedCode, 'embed')}>{copied === 'embed' ? 'Copied' : 'Copy'}</button>
        </div>

        <div className="export-head">
          <span className="field-label">Export drawings only</span>
          <label className="incl-toggle" title="Include uploaded data layers, not just annotations">
            <input type="checkbox" checked={includeLayers} onChange={(e) => setIncludeLayers(e.target.checked)} /> Include data layers
          </label>
        </div>
        <div className="export-grid">
          <button className="export-btn hero" onClick={drawingsSVG} disabled={!hasDrawings}><Icon name="polygon" size={16} /> SVG (vector)</button>
          <button className="export-btn hero" onClick={drawingsPNG} disabled={!hasDrawings}><Icon name="download" size={16} /> PNG (transparent)</button>
          <button className="export-btn" onClick={drawingsGeoJSON} disabled={!hasDrawings}><Icon name="download" size={16} /> Drawings GeoJSON</button>
        </div>
        <div className="share-note muted"><Icon name="target" size={13} /> Exports exactly what’s in the current map view — frame your drawings first, then export.</div>

        <div className="field-label" style={{ marginTop: 18 }}>Export full map</div>
        <div className="export-grid">
          <button className="export-btn" onClick={exportGeoJSON}><Icon name="download" size={16} /> GeoJSON</button>
          <button className="export-btn" onClick={exportCSV}><Icon name="table" size={16} /> CSV</button>
          <button className="export-btn" onClick={exportPNG}><Icon name="download" size={16} /> PNG (with map)</button>
          <button className="export-btn" onClick={exportMapFile}><Icon name="copy" size={16} /> Map file</button>
        </div>
      </div>
    </div>
  )
}
const slug = (s) => (s || 'map').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
