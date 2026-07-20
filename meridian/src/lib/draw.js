// Lightweight click-based drawing for annotations on a MapLibre map.
import { nanoid } from 'nanoid'

export const POINT_TOOLS = ['pin', 'text', 'note', 'marker', 'link', 'video']
export const LINE_TOOLS = ['line', 'route']

const DEFAULTS = {
  pin: { color: '#4f7cff', size: 7 },
  marker: { color: '#ff7a59', size: 6 },
  text: { color: '#10151d', size: 16 },
  note: { color: '#f4b740', size: 7 },
  link: { color: '#4f7cff', size: 6 },
  video: { color: '#a06bff', size: 6 },
  line: { color: '#4f7cff', size: 3 },
  route: { color: '#16c79a', size: 4 },
  polygon: { color: '#4f7cff', size: 2, opacity: 0.35 },
  rectangle: { color: '#ff7a59', size: 2, opacity: 0.3 },
  circle: { color: '#a06bff', size: 2, opacity: 0.3 },
  highlighter: { color: '#f4b740', size: 10, opacity: 0.4 },
}

export function makeAnnotation(kind, geometry, extra = {}) {
  const d = DEFAULTS[kind] || DEFAULTS.pin
  return {
    type: 'Feature',
    id: nanoid(8),
    geometry,
    properties: {
      __kind: kind,
      __color: d.color,
      __size: d.size,
      __opacity: d.opacity ?? 1,
      __text: kind === 'text' ? 'Double-click to edit' : '',
      title: '',
      description: '',
      ...extra,
    },
  }
}

function circlePolygon(center, radiusKm, points = 64) {
  const coords = []
  const [lng, lat] = center
  const dx = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))
  const dy = radiusKm / 110.574
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * 2 * Math.PI
    coords.push([lng + dx * Math.cos(a), lat + dy * Math.sin(a)])
  }
  return { type: 'Polygon', coordinates: [coords] }
}

function haversineKm(a, b) {
  const R = 6371, toR = (d) => (d * Math.PI) / 180
  const dLat = toR(b[1] - a[1]), dLng = toR(b[0] - a[0])
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[1])) * Math.cos(toR(b[1])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Interaction manager. onComplete(feature) fires when a shape is done.
export class DrawSession {
  constructor(map, kind, onComplete, onPreview) {
    this.map = map
    this.kind = kind
    this.onComplete = onComplete
    this.onPreview = onPreview
    this.pts = []
    this.style = DEFAULTS[kind] || DEFAULTS.pin
    this.map.getCanvas().style.cursor = 'crosshair'
    this._click = this._onClick.bind(this)
    this._move = this._onMove.bind(this)
    this._dbl = this._onDbl.bind(this)
    this._key = this._onKey.bind(this)
    map.on('click', this._click)
    map.on('mousemove', this._move)
    map.on('dblclick', this._dbl)
    window.addEventListener('keydown', this._key)
    this._prevDoubleZoom = map.doubleClickZoom.isEnabled()
    map.doubleClickZoom.disable()
  }

  _onKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); this._commitPath() }
  }

  // finish an in-progress line/polygon (Enter or double-click)
  _commitPath() {
    const k = this.kind
    const pts = dedupe(this.pts)
    if (LINE_TOOLS.includes(k) || k === 'highlighter') {
      if (pts.length >= 2) this._finish(makeAnnotation(k, { type: 'LineString', coordinates: pts }))
    } else if (k === 'polygon') {
      if (pts.length >= 3) this._finish(makeAnnotation('polygon', { type: 'Polygon', coordinates: [[...pts, pts[0]]] }))
    }
  }

  _ll(e) { return [e.lngLat.lng, e.lngLat.lat] }

  _onClick(e) {
    const p = this._ll(e)
    const k = this.kind
    if (POINT_TOOLS.includes(k)) {
      this._finish(makeAnnotation(k, { type: 'Point', coordinates: p }))
      return
    }
    if (k === 'rectangle') {
      this.pts.push(p)
      if (this.pts.length === 2) {
        const [a, b] = this.pts
        const geom = { type: 'Polygon', coordinates: [[[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]], [a[0], a[1]]]] }
        this._finish(makeAnnotation('rectangle', geom))
      }
      return
    }
    if (k === 'circle') {
      this.pts.push(p)
      if (this.pts.length === 2) {
        const r = haversineKm(this.pts[0], this.pts[1])
        this._finish(makeAnnotation('circle', circlePolygon(this.pts[0], r), { __radiusKm: r }))
      }
      return
    }
    // line / route / polygon / highlighter — accumulate vertices
    this.pts.push(p)
    this._preview(p)
  }

  _onMove(e) {
    if (!this.pts.length) return
    this._preview(this._ll(e))
  }

  _onDbl() { this._commitPath() }

  _preview(cursor) {
    const k = this.kind
    let geom
    if (k === 'rectangle' && this.pts.length === 1) {
      const a = this.pts[0], b = cursor
      geom = { type: 'Polygon', coordinates: [[[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]], [a[0], a[1]]]] }
    } else if (k === 'circle' && this.pts.length === 1) {
      geom = circlePolygon(this.pts[0], haversineKm(this.pts[0], cursor))
    } else if (k === 'polygon') {
      geom = { type: 'Polygon', coordinates: [[...this.pts, cursor, this.pts[0]]] }
    } else {
      geom = { type: 'LineString', coordinates: [...this.pts, cursor] }
    }
    const props = { __kind: k, __color: this.style.color, __size: this.style.size, __opacity: this.style.opacity ?? 0.3 }
    const features = [{ type: 'Feature', properties: props, geometry: geom }]
    // vertex handles for placed points
    for (const pt of this.pts) features.push({ type: 'Feature', properties: { __vertex: true, __color: this.style.color }, geometry: { type: 'Point', coordinates: pt } })
    this.onPreview?.({ type: 'FeatureCollection', features })
  }

  _finish(feature) {
    this.onPreview?.(null)
    this.pts = []
    this.onComplete?.(feature)
  }

  destroy() {
    const m = this.map
    m.off('click', this._click); m.off('mousemove', this._move); m.off('dblclick', this._dbl)
    window.removeEventListener('keydown', this._key)
    m.getCanvas().style.cursor = ''
    if (this._prevDoubleZoom) m.doubleClickZoom.enable()
    this.onPreview?.(null)
  }
}

// remove consecutive points that are essentially the same (fixes the double-click's extra vertices)
function dedupe(pts) {
  const out = []
  for (const p of pts) {
    const last = out[out.length - 1]
    if (!last || Math.abs(last[0] - p[0]) > 1e-7 || Math.abs(last[1] - p[1]) > 1e-7) out.push(p)
  }
  return out
}
