import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { useStore } from '../../store/useStore'
import { getBasemap } from '../../lib/basemaps'
import { buildLayerSpecs } from '../../lib/mapStyle'
import { DrawSession } from '../../lib/draw'
import { EditSession, initEditLayers } from '../../lib/edit'
import { mapRef } from '../../lib/mapRef'

const ANN_SRC = 'ann-src'
const PREV_SRC = 'draw-preview'
const CMT_SRC = 'cmt-src'

export default function MapCanvas() {
  const containerRef = useRef(null)
  const mapObj = useRef(null)
  const drawRef = useRef(null)
  const editRef = useRef(null)
  const styleReady = useRef(false)
  const appliedBasemap = useRef(null)
  const pendingBasemap = useRef(null)

  const doc = useStore((s) => s.doc)
  const tool = useStore((s) => s.tool)
  const selection = useStore((s) => s.selection)
  const placingComment = useStore((s) => s.placingComment)
  const theme = useStore((s) => s.theme)

  // ---- init once ----
  useEffect(() => {
    const start = useStore.getState().doc
    const bm = getBasemap(start.basemap)
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: bm.style,
      center: start.view.center,
      zoom: start.view.zoom,
      bearing: start.view.bearing || 0,
      pitch: start.view.pitch || 0,
      attributionControl: false,
      preserveDrawingBuffer: true, // enables PNG export
    })
    mapObj.current = map
    mapRef.current = map
    if (import.meta.env.DEV) window.__map = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left')
    map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    appliedBasemap.current = start.basemap
    map.on('load', () => {
      styleReady.current = true
      addAnnotationLayers(map); syncLayers(map); syncAnnotations(map); syncComments(map)
      // If the user switched basemap before the first style finished loading, apply it now.
      if (pendingBasemap.current && pendingBasemap.current !== appliedBasemap.current) {
        applyBasemap(map, pendingBasemap.current)
      }
    })
    map.on('moveend', () => {
      const c = map.getCenter()
      useStore.getState().setView({ center: [c.lng, c.lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() })
    })
    map.on('click', onMapClick)
    map.on('mousemove', onHover)
    map.on('contextmenu', onContextMenu)

    return () => { map.remove(); mapObj.current = null; mapRef.current = null }
    // eslint-disable-next-line
  }, [])

  // ---- basemap change ----
  const basemap = doc?.basemap
  useEffect(() => {
    const map = mapObj.current
    pendingBasemap.current = basemap
    if (!map || !styleReady.current) return          // will be applied in the load handler
    if (appliedBasemap.current === basemap) return    // already showing this basemap
    applyBasemap(map, basemap)
    // eslint-disable-next-line
  }, [basemap])

  function applyBasemap(map, id) {
    appliedBasemap.current = id
    map.setStyle(getBasemap(id).style)
    map.once('styledata', () => {
      addAnnotationLayers(map)
      syncLayers(map)
      syncAnnotations(map)
      // A newer switch may have arrived while this style was loading — apply the latest.
      if (pendingBasemap.current && pendingBasemap.current !== appliedBasemap.current) {
        applyBasemap(map, pendingBasemap.current)
      }
    })
  }

  // ---- data layers change ----
  useEffect(() => {
    const map = mapObj.current
    if (map && styleReady.current) syncLayers(map)
    // eslint-disable-next-line
  }, [doc?.layers])

  // ---- annotations change ----
  useEffect(() => {
    const map = mapObj.current
    if (map && styleReady.current) syncAnnotations(map)
    // eslint-disable-next-line
  }, [doc?.annotations])

  // ---- comments change ----
  useEffect(() => {
    const map = mapObj.current
    if (map && styleReady.current) syncComments(map)
    // eslint-disable-next-line
  }, [doc?.comments])

  // ---- placing-comment cursor ----
  useEffect(() => {
    const map = mapObj.current
    if (map) map.getCanvas().style.cursor = placingComment ? 'crosshair' : ''
  }, [placingComment])

  // ---- tool change → draw session ----
  useEffect(() => {
    const map = mapObj.current
    if (!map) return
    drawRef.current?.destroy(); drawRef.current = null
    if (tool) {
      drawRef.current = new DrawSession(map, tool, (feature) => {
        useStore.getState().addAnnotation(feature)
        useStore.getState().setTool(null)
      }, (preview) => setPreview(map, preview))
    }
    return () => { drawRef.current?.destroy(); drawRef.current = null }
  }, [tool])

  // ---- annotation selection → edit session (drag vertices / move) ----
  useEffect(() => {
    const map = mapObj.current
    if (!map || !styleReady.current) return
    editRef.current?.destroy(); editRef.current = null
    if (!tool && selection?.kind === 'annotation') {
      editRef.current = new EditSession(map, selection.id)
    }
    return () => { editRef.current?.destroy(); editRef.current = null }
    // eslint-disable-next-line
  }, [selection?.id, selection?.kind, tool, doc?.basemap])

  // ---------- helpers ----------
  function onMapClick(e) {
    const state = useStore.getState()
    // placing a comment?
    if (state.placingComment) { state.addComment([e.lngLat.lng, e.lngLat.lat]); return }
    if (state.tool) return
    const map = mapObj.current
    // comment pin?
    const cmtLayers = ['cmt-halo', 'cmt-dot'].filter((id) => map.getLayer(id))
    const cmtHit = cmtLayers.length ? map.queryRenderedFeatures(e.point, { layers: cmtLayers }) : []
    if (cmtHit.length) { state.setUI({ commentsOpen: true, activeComment: cmtHit[0].properties.__id }); return }
    const doc = state.doc
    const ids = []
    for (const l of doc.layers) if (l.visible) ids.push(...map.getStyle().layers.filter((sl) => sl.id.startsWith(l.id + '-')).map((sl) => sl.id))
    const annIds = map.getStyle().layers.filter((sl) => sl.id.startsWith('ann-')).map((sl) => sl.id)
    const hits = map.queryRenderedFeatures(e.point, { layers: [...ids, ...annIds].filter((id) => map.getLayer(id)) })
    if (!hits.length) { useStore.getState().clearSelection(); return }
    const hit = hits[0]
    if (hit.layer.id.startsWith('ann-')) {
      const fid = hit.properties?.__id ?? hit.id
      if (fid != null) useStore.getState().select('annotation', fid)
    } else {
      const layerId = hit.layer.id.split('-').slice(0, -1).join('-')
      const layer = doc.layers.find((l) => hit.layer.id.startsWith(l.id + '-'))
      if (layer) {
        useStore.getState().select('layer', layer.id)
        showPopup(map, e.lngLat, hit.properties, layer)
      }
    }
  }

  function onHover(e) {
    if (useStore.getState().tool) return
    const map = mapObj.current
    const doc = useStore.getState().doc
    const ids = []
    for (const l of doc.layers) if (l.visible) ids.push(...['-circle', '-fill', '-line', '-heat'].map((s) => l.id + s))
    const annIds = ['ann-point', 'ann-fill', 'ann-line', 'ann-line-dash']
    const layers = [...ids, ...annIds].filter((id) => map.getLayer(id))
    const hits = layers.length ? map.queryRenderedFeatures(e.point, { layers }) : []
    map.getCanvas().style.cursor = hits.length ? 'pointer' : ''
  }

  function onContextMenu(e) {
    const map = mapObj.current
    const annLayers = ['ann-fill', 'ann-line', 'ann-line-dash', 'ann-point', 'ann-label'].filter((id) => map.getLayer(id))
    const hits = annLayers.length ? map.queryRenderedFeatures(e.point, { layers: annLayers }) : []
    const annId = hits[0]?.properties?.__id ?? null
    if (annId) useStore.getState().select('annotation', annId)
    const oe = e.originalEvent
    useStore.getState().setUI({
      contextMenu: { x: oe?.clientX ?? e.point.x, y: oe?.clientY ?? e.point.y, annId, lngLat: [e.lngLat.lng, e.lngLat.lat] },
    })
  }

  return <div ref={containerRef} className="map-canvas" />
}

// ---------- imperative sync (module scope) ----------
const MANAGED_RE = /-(circle|fill|outline|line|label|heat)$/

function syncLayers(map) {
  const doc = useStore.getState().doc
  const keepSrc = new Set(doc.layers.map((l) => `src-${l.id}`))
  const style = map.getStyle()

  // 1. Remove every managed data layer (not annotations) — we re-add fresh each sync.
  for (const sl of style.layers) {
    if (sl.source && sl.source.startsWith('src-') && MANAGED_RE.test(sl.id) && map.getLayer(sl.id)) {
      map.removeLayer(sl.id)
    }
  }
  // 2. Drop sources for layers that were deleted.
  for (const srcId of Object.keys(style.sources)) {
    if (srcId.startsWith('src-') && !keepSrc.has(srcId) && map.getSource(srcId)) map.removeSource(srcId)
  }

  // 3. Re-add in reverse so the first layer in the list draws on top.
  const ordered = [...doc.layers].reverse()
  for (const layer of ordered) {
    const { source, layers } = buildLayerSpecs(layer)
    if (map.getSource(source.id)) map.getSource(source.id).setData(layer.data)
    else map.addSource(source.id, source.spec)
    for (const spec of layers) map.addLayer(spec)
  }
  // 4. Keep annotations above data layers.
  for (const id of ['ann-fill', 'ann-line', 'ann-line-dash', 'ann-point', 'ann-label', 'prev-fill', 'prev-line', 'prev-point', 'cmt-halo', 'cmt-dot', 'edit-halo-line', 'edit-mid', 'edit-vertex']) {
    if (map.getLayer(id)) map.moveLayer(id)
  }
}

function addAnnotationLayers(map) {
  if (!map.getSource(ANN_SRC)) map.addSource(ANN_SRC, { type: 'geojson', data: fc([]), promoteId: undefined })
  if (!map.getSource(PREV_SRC)) map.addSource(PREV_SRC, { type: 'geojson', data: fc([]) })

  const add = (spec) => { if (!map.getLayer(spec.id)) map.addLayer(spec) }
  add({ id: 'ann-fill', type: 'fill', source: ANN_SRC, filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'fill-color': ['get', '__color'], 'fill-opacity': ['coalesce', ['get', '__opacity'], 0.35] } })
  const isLineish = ['any', ['==', ['geometry-type'], 'LineString'], ['==', ['geometry-type'], 'Polygon']]
  const lineOpacity = ['case', ['==', ['get', '__kind'], 'highlighter'], 0.45, 0.95]
  add({ id: 'ann-line', type: 'line', source: ANN_SRC, filter: ['all', isLineish, ['!=', ['get', '__linestyle'], 'dashed']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['get', '__color'], 'line-width': ['coalesce', ['get', '__size'], 3], 'line-opacity': lineOpacity } })
  add({ id: 'ann-line-dash', type: 'line', source: ANN_SRC, filter: ['all', isLineish, ['==', ['get', '__linestyle'], 'dashed']],
    layout: { 'line-cap': 'butt', 'line-join': 'round' },
    paint: { 'line-color': ['get', '__color'], 'line-width': ['coalesce', ['get', '__size'], 3], 'line-opacity': lineOpacity, 'line-dasharray': [2, 1.6] } })
  add({ id: 'ann-point', type: 'circle', source: ANN_SRC, filter: ['==', ['geometry-type'], 'Point'],
    paint: { 'circle-radius': ['coalesce', ['get', '__size'], 7], 'circle-color': ['get', '__color'],
      'circle-stroke-color': '#fff', 'circle-stroke-width': 2, 'circle-opacity': ['coalesce', ['get', '__opacity'], 1] } })
  add({ id: 'ann-label', type: 'symbol', source: ANN_SRC,
    layout: { 'text-field': ['coalesce', ['get', 'title'], ['get', '__text'], ''], 'text-size': ['coalesce', ['get', '__size'], 14],
      'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'], 'text-allow-overlap': false },
    paint: { 'text-color': ['coalesce', ['get', '__color'], '#10151d'], 'text-halo-color': '#fff', 'text-halo-width': 1.6 } })

  // preview — solid + colored, matching the final annotation, with vertex handles
  add({ id: 'prev-fill', type: 'fill', source: PREV_SRC, filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'fill-color': ['coalesce', ['get', '__color'], '#4f7cff'], 'fill-opacity': ['coalesce', ['get', '__opacity'], 0.25] } })
  add({ id: 'prev-line', type: 'line', source: PREV_SRC,
    filter: ['any', ['==', ['geometry-type'], 'LineString'], ['==', ['geometry-type'], 'Polygon']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['coalesce', ['get', '__color'], '#4f7cff'], 'line-width': ['coalesce', ['get', '__size'], 3] } })
  add({ id: 'prev-point', type: 'circle', source: PREV_SRC, filter: ['==', ['get', '__vertex'], true],
    paint: { 'circle-radius': 5, 'circle-color': '#fff', 'circle-stroke-color': ['coalesce', ['get', '__color'], '#4f7cff'], 'circle-stroke-width': 2.5 } })

  // comments
  if (!map.getSource(CMT_SRC)) map.addSource(CMT_SRC, { type: 'geojson', data: fc([]) })
  add({ id: 'cmt-halo', type: 'circle', source: CMT_SRC,
    paint: { 'circle-radius': 13, 'circle-color': ['get', '__color'], 'circle-opacity': ['case', ['get', '__resolved'], 0.25, 0.9], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2.5 } })
  add({ id: 'cmt-dot', type: 'circle', source: CMT_SRC,
    paint: { 'circle-radius': 4, 'circle-color': '#fff', 'circle-opacity': ['case', ['get', '__resolved'], 0.5, 1] } })
}

function syncAnnotations(map) {
  const src = map.getSource(ANN_SRC)
  if (!src) return
  const doc = useStore.getState().doc
  // carry the (string) feature id into properties so queryRenderedFeatures can recover it on click
  const features = doc.annotations.map((a) => ({ ...a, properties: { ...a.properties, __id: a.id } }))
  src.setData(fc(features))
}

function syncComments(map) {
  const src = map.getSource(CMT_SRC)
  if (!src) return
  const comments = useStore.getState().doc.comments || []
  src.setData(fc(comments.map((c) => ({ type: 'Feature', properties: { __id: c.id, __color: c.color, __resolved: !!c.resolved }, geometry: { type: 'Point', coordinates: c.lngLat } }))))
}

function setPreview(map, data) {
  const src = map.getSource(PREV_SRC)
  if (!src) return
  if (!data) return src.setData(fc([]))
  src.setData(data.type === 'FeatureCollection' ? data : { type: 'FeatureCollection', features: [data] })
}

function showPopup(map, lngLat, props, layer) {
  const rows = Object.entries(props).filter(([k]) => !k.startsWith('__')).slice(0, 10)
  const html = `<div class="ml-pop"><div class="ml-pop-head">${escape(layer.name)}</div>${rows
    .map(([k, v]) => `<div class="ml-pop-row"><span>${escape(k)}</span><b>${escape(v)}</b></div>`) .join('')}</div>`
  new maplibregl.Popup({ closeButton: true, maxWidth: '280px', offset: 12 }).setLngLat(lngLat).setHTML(html).addTo(map)
}

const fc = (features) => ({ type: 'FeatureCollection', features })
const escape = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
