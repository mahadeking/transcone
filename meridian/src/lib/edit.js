// Direct-edit a selected annotation: drag vertices, add midpoints, move the whole shape.
import { useStore } from '../store/useStore'

export const EDIT_SRC = 'edit-src'

export function initEditLayers(map) {
  if (!map.getSource(EDIT_SRC)) map.addSource(EDIT_SRC, { type: 'geojson', data: fc([]) })
  const add = (spec) => { if (!map.getLayer(spec.id)) map.addLayer(spec) }
  // selection outline (soft halo around the shape)
  add({ id: 'edit-halo-line', type: 'line', source: EDIT_SRC, filter: ['==', ['get', '__handle'], 'halo'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['coalesce', ['get', '__color'], '#4f7cff'], 'line-width': 1.5, 'line-opacity': 0.4, 'line-dasharray': [1.5, 1.5] } })
  add({ id: 'edit-mid', type: 'circle', source: EDIT_SRC, filter: ['==', ['get', '__handle'], 'mid'],
    paint: { 'circle-radius': 4, 'circle-color': '#fff', 'circle-opacity': 0.6, 'circle-stroke-color': ['coalesce', ['get', '__color'], '#4f7cff'], 'circle-stroke-width': 1.5 } })
  add({ id: 'edit-vertex', type: 'circle', source: EDIT_SRC, filter: ['==', ['get', '__handle'], 'vertex'],
    paint: { 'circle-radius': 6, 'circle-color': '#fff', 'circle-stroke-color': ['coalesce', ['get', '__color'], '#4f7cff'], 'circle-stroke-width': 3 } })
}

export class EditSession {
  constructor(map, annId) {
    this.map = map
    this.id = annId
    const ann = this._ann()
    if (!ann) return
    this.kind = ann.properties.__kind
    this.geomType = ann.geometry.type
    this.editable = this.kind !== 'circle' // circle: move only (64 vertices would be noise)
    initEditLayers(map)
    this.renderHandles()
    this._down = this._onDown.bind(this)
    this._move = this._onMove.bind(this)
    this._up = this._onUp.bind(this)
    map.on('mousedown', this._down)
    this.drag = null
  }

  _ann() { return useStore.getState().doc.annotations.find((a) => a.id === this.id) }
  _geom() { return this._ann()?.geometry }
  _ll(e) { return [e.lngLat.lng, e.lngLat.lat] }

  positions() {
    const g = this._geom(); if (!g) return []
    if (g.type === 'Point') return [g.coordinates]
    if (g.type === 'LineString') return g.coordinates.slice()
    if (g.type === 'Polygon') return g.coordinates[0].slice(0, -1)
    return []
  }
  setPositions(positions) {
    const g = this._geom(); let geom
    if (g.type === 'Point') geom = { type: 'Point', coordinates: positions[0] }
    else if (g.type === 'LineString') geom = { type: 'LineString', coordinates: positions }
    else geom = { type: 'Polygon', coordinates: [[...positions, positions[0]]] }
    useStore.getState().setAnnotationGeometryLive(this.id, geom)
    this.renderHandles()
  }

  renderHandles() {
    const src = this.map.getSource(EDIT_SRC); if (!src) return
    const ann = this._ann(); if (!ann) return
    const color = ann.properties.__color || '#4f7cff'
    const positions = this.positions()
    const feats = []
    // halo outline
    if (this.geomType !== 'Point') {
      feats.push({ type: 'Feature', properties: { __handle: 'halo', __color: color }, geometry: ann.geometry })
    }
    if (this.editable) {
      positions.forEach((p, i) => feats.push({ type: 'Feature', properties: { __handle: 'vertex', __vidx: i, __color: color }, geometry: { type: 'Point', coordinates: p } }))
      if (this.geomType !== 'Point' && positions.length > 1) {
        const closed = this.geomType === 'Polygon'
        const n = positions.length
        const count = closed ? n : n - 1
        for (let i = 0; i < count; i++) {
          const a = positions[i], b = positions[(i + 1) % n]
          feats.push({ type: 'Feature', properties: { __handle: 'mid', __mid: i + 1, __color: color }, geometry: { type: 'Point', coordinates: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] } })
        }
      }
    }
    src.setData(fc(feats))
    // keep handles on top
    for (const id of ['edit-halo-line', 'edit-mid', 'edit-vertex']) if (this.map.getLayer(id)) this.map.moveLayer(id)
  }

  _hit(e, layers) {
    const ls = layers.filter((l) => this.map.getLayer(l))
    return ls.length ? this.map.queryRenderedFeatures(e.point, { layers: ls }) : []
  }

  _onDown(e) {
    if (useStore.getState().tool) return
    const ann = this._ann(); if (!ann) return
    if (this.editable) {
      let hits = this._hit(e, ['edit-vertex'])
      if (hits.length) { this.drag = { type: 'vertex', vidx: hits[0].properties.__vidx }; return this._begin(e) }
      hits = this._hit(e, ['edit-mid'])
      if (hits.length) {
        const idx = hits[0].properties.__mid
        const p = this.positions(); p.splice(idx, 0, this._ll(e)); this.setPositions(p)
        this.drag = { type: 'vertex', vidx: idx }; return this._begin(e)
      }
    }
    // move whole shape (if grabbing its body and not locked)
    if (ann.properties.__locked) return
    const body = this._hit(e, ['ann-fill', 'ann-line', 'ann-line-dash', 'ann-point']).filter((h) => h.properties.__id === this.id)
    if (body.length) { this.drag = { type: 'move', last: this._ll(e) }; return this._begin(e) }
  }

  _begin(e) {
    if (e.preventDefault) e.preventDefault()
    if (e.originalEvent) e.originalEvent.stopPropagation()
    this.map.dragPan.disable()
    this.map.getCanvas().style.cursor = 'grabbing'
    this.map.on('mousemove', this._move)
    this.map.once('mouseup', this._up)
  }

  _onMove(e) {
    if (!this.drag) return
    const at = this._ll(e)
    if (this.drag.type === 'vertex') {
      const p = this.positions(); p[this.drag.vidx] = at; this.setPositions(p)
    } else if (this.drag.type === 'move') {
      const dx = at[0] - this.drag.last[0], dy = at[1] - this.drag.last[1]
      this.drag.last = at
      this.setPositions(this.positions().map(([x, y]) => [x + dx, y + dy]))
    }
  }

  _onUp() {
    this.map.off('mousemove', this._move)
    this.map.dragPan.enable()
    this.map.getCanvas().style.cursor = ''
    const g = this._geom()
    if (g) useStore.getState().setAnnotationGeometry(this.id, g) // commit + save
    this.drag = null
  }

  destroy() {
    this.map.off('mousedown', this._down)
    this.map.off('mousemove', this._move)
    this.map.dragPan.enable()
    this.map.getCanvas().style.cursor = ''
    const src = this.map.getSource(EDIT_SRC)
    if (src) src.setData(fc([]))
  }
}

const fc = (features) => ({ type: 'FeatureCollection', features })
