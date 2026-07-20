import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { loadMap } from '../../lib/storage'
import { getBasemap } from '../../lib/basemaps'
import { buildLayerSpecs, computeLegend } from '../../lib/mapStyle'
import Icon from '../Icon.jsx'
import './viewer.css'

export default function Viewer({ mapId, embed, keepTheme }) {
  const container = useRef(null)
  const [doc, setDoc] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [legendOpen, setLegendOpen] = useState(true)

  useEffect(() => {
    loadMap(mapId).then((d) => { d ? setDoc(d) : setNotFound(true) })
  }, [mapId])

  useEffect(() => {
    if (!doc || !container.current) return
    if (!keepTheme) document.documentElement.dataset.theme = doc.basemap === 'dark' || doc.basemap === 'satellite' ? 'dark' : 'light'
    const map = new maplibregl.Map({
      container: container.current,
      style: getBasemap(doc.basemap).style,
      center: doc.view.center, zoom: doc.view.zoom, bearing: doc.view.bearing || 0, pitch: doc.view.pitch || 0,
      attributionControl: false,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), 'bottom-left')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    map.on('load', () => {
      // annotations
      map.addSource('ann', { type: 'geojson', data: { type: 'FeatureCollection', features: doc.annotations } })
      map.addLayer({ id: 'ann-fill', type: 'fill', source: 'ann', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': ['get', '__color'], 'fill-opacity': ['coalesce', ['get', '__opacity'], 0.35] } })
      map.addLayer({ id: 'ann-line', type: 'line', source: 'ann', filter: ['any', ['==', ['geometry-type'], 'LineString'], ['==', ['geometry-type'], 'Polygon']], paint: { 'line-color': ['get', '__color'], 'line-width': ['coalesce', ['get', '__size'], 3] } })
      map.addLayer({ id: 'ann-point', type: 'circle', source: 'ann', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': ['coalesce', ['get', '__size'], 7], 'circle-color': ['get', '__color'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } })
      for (const layer of [...doc.layers].reverse()) {
        if (!layer.visible) continue
        const { source, layers } = buildLayerSpecs(layer)
        if (!map.getSource(source.id)) map.addSource(source.id, source.spec)
        for (const spec of layers) map.addLayer(spec)
      }
      // popups
      const clickable = doc.layers.flatMap((l) => ['-circle', '-fill', '-line'].map((s) => l.id + s)).filter((id) => map.getLayer(id))
      map.on('click', (e) => {
        const hits = clickable.length ? map.queryRenderedFeatures(e.point, { layers: clickable }) : []
        if (!hits.length) return
        const p = hits[0].properties
        const rows = Object.entries(p).filter(([k]) => !k.startsWith('__')).slice(0, 10)
        new maplibregl.Popup({ offset: 12, maxWidth: '280px' }).setLngLat(e.lngLat)
          .setHTML(`<div class="ml-pop">${rows.map(([k, v]) => `<div class="ml-pop-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`).addTo(map)
      })
    })
    return () => map.remove()
  }, [doc])

  if (notFound) return <div className="viewer-missing"><Icon name="compass" size={40} /><h2>Map not found</h2><p className="muted">This map isn’t available in this browser. Meridian preview links are device-local.</p></div>
  if (!doc) return <div className="viewer-missing"><div className="spinner" /></div>

  return (
    <div className={'viewer' + (embed ? ' embed' : '')}>
      <div ref={container} className="viewer-map" />
      {!embed && (
        <div className="viewer-top">
          <span className="viewer-brand"><Icon name="compass" size={18} /> Meridian</span>
          <span className="viewer-title">{doc.title}</span>
        </div>
      )}
      {(doc.layers.length > 0) && (
        <div className={'viewer-legend' + (legendOpen ? '' : ' collapsed')}>
          <button className="vl-toggle" onClick={() => setLegendOpen((v) => !v)}>
            <b>Legend</b><Icon name={legendOpen ? 'chevronDown' : 'chevronRight'} size={14} />
          </button>
          {legendOpen && (
            <div className="vl-body">
              {doc.description && <p className="vl-desc">{doc.description}</p>}
              {doc.layers.filter((l) => l.visible).map((l) => <ViewerLegend key={l.id} layer={l} />)}
            </div>
          )}
        </div>
      )}
      {embed && <a className="embed-badge" href={`${location.origin}${location.pathname}#/view/${doc.id}`} target="_blank" rel="noreferrer"><Icon name="compass" size={13} /> Meridian</a>}
    </div>
  )
}

function ViewerLegend({ layer }) {
  const legend = computeLegend(layer)
  return (
    <div className="vl-card">
      <div className="vl-name">{layer.name}</div>
      {legend.kind === 'categories' && legend.items.map((it) => <div key={it.label} className="vl-row"><span className="dot" style={{ background: it.color }} />{it.label}</div>)}
      {legend.kind === 'ramp' && <><div className="ramp-bar" style={{ background: `linear-gradient(90deg,${legend.stops.map((s) => s.color).join(',')})`, height: 10, borderRadius: 5 }} /><div className="vl-scale"><span>{fmt(legend.stops[0].from)}</span><span>{fmt(legend.stops.at(-1).to)}</span></div></>}
      {legend.kind === 'size' && <div className="vl-row"><span className="dot" style={{ background: legend.color }} /> {fmt(legend.min)} – {fmt(legend.max)}</div>}
      {legend.kind === 'simple' && <div className="vl-row"><span className="dot" style={{ background: legend.color }} /> {layer.data.features.length} features</div>}
      {legend.kind === 'heatmap' && <div className="ramp-bar heat" style={{ height: 10, borderRadius: 5 }} />}
    </div>
  )
}
const fmt = (n) => (typeof n === 'number' ? (Math.abs(n) >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : +n.toFixed(2)) : n)
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
