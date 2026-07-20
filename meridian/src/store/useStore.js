import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { loadIndex, saveIndex, loadMap, saveMap, deleteMap } from '../lib/storage'
import { detectGeometryType, collectFields, bboxOf } from '../lib/geo'

export const defaultStyleFor = (geomType) => ({
  type: 'simple',
  color: geomType === 'polygon' ? '#4f7cff' : '#4f7cff',
  size: geomType === 'point' ? 6 : geomType === 'line' ? 2 : 1,
  strokeColor: '#ffffff',
  strokeWidth: geomType === 'polygon' ? 1.2 : 1,
  opacity: geomType === 'polygon' ? 0.55 : 0.9,
  labelField: null,
  field: null,
  palette: 'Bold',
  ramp: 'Blues',
  categories: null,
  colorStops: null,
  sizeStops: null,
})

const newMapDoc = (title = 'Untitled map') => ({
  id: nanoid(10),
  title,
  description: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  view: { center: [-40, 34], zoom: 2.4, bearing: 0, pitch: 0 },
  basemap: 'light',
  layers: [],
  annotations: [],
  comments: [],
})

let saveTimer = null

export const useStore = create((set, get) => ({
  theme: localStorage.getItem('meridian:theme') || 'light',
  route: { name: 'dashboard', mapId: null },
  index: [],
  doc: null,
  selection: null, // { kind: 'layer'|'annotation', id }
  past: [],   // undo stack (doc snapshots)
  future: [], // redo stack
  _lastEditAt: 0,
  previewing: false, // Done → read-only view mode
  placingComment: false,
  workspace: { name: 'My workspace', members: [{ id: 'me', name: 'You', color: '#4f7cff', you: true }] },
  tool: null, // active annotation tool
  ui: { leftTab: 'legend', detailOpen: false, tableOpen: false, shareOpen: false, uploadOpen: false, basemapOpen: false },
  status: '',

  // ---- lifecycle ----
  init: async () => {
    const index = await loadIndex()
    set({ index })
    document.documentElement.dataset.theme = get().theme
  },
  setTheme: (t) => { localStorage.setItem('meridian:theme', t); document.documentElement.dataset.theme = t; set({ theme: t }) },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),

  setUI: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),
  setStatus: (status) => set({ status }),

  // ---- dashboard ----
  createMap: async (title) => {
    const doc = newMapDoc(title)
    await saveMap(doc)
    const meta = metaOf(doc)
    const index = [meta, ...get().index]
    await saveIndex(index)
    set({ index, doc, route: { name: 'editor', mapId: doc.id }, selection: null, past: [], future: [], _lastEditAt: 0, ui: { ...get().ui, detailOpen: false } })
    return doc.id
  },
  openMap: async (id) => {
    const doc = await loadMap(id)
    if (!doc) return
    set({ doc, route: { name: 'editor', mapId: id }, selection: null, past: [], future: [], _lastEditAt: 0, ui: { ...get().ui, detailOpen: false, leftTab: 'legend' } })
  },
  duplicateMap: async (id) => {
    const src = await loadMap(id)
    if (!src) return
    const copy = { ...structuredClone(src), id: nanoid(10), title: src.title + ' copy', createdAt: Date.now(), updatedAt: Date.now() }
    await saveMap(copy)
    const index = [metaOf(copy), ...get().index]
    await saveIndex(index)
    set({ index })
  },
  removeMap: async (id) => {
    await deleteMap(id)
    set({ index: get().index.filter((m) => m.id !== id) })
  },
  goDashboard: async () => {
    await get().flushSave()
    set({ route: { name: 'dashboard', mapId: null }, doc: null, tool: null })
  },

  // ---- doc mutations (auto-saved, with undo history) ----
  patchDoc: (patch) => {
    const now = Date.now()
    const prev = get().doc
    // coalesce rapid successive edits (e.g. slider drags) into a single undo step
    const coalesce = now - get()._lastEditAt < 500 && get().past.length > 0
    set((s) => ({
      doc: { ...s.doc, ...patch, updatedAt: now },
      past: coalesce ? s.past : [...s.past.slice(-49), prev],
      future: [],
      _lastEditAt: now,
    }))
    get().scheduleSave()
  },
  undo: () => {
    const { past, future, doc } = get()
    if (!past.length) return
    set({ doc: past[past.length - 1], past: past.slice(0, -1), future: [doc, ...future].slice(0, 50), selection: null, _lastEditAt: 0, ui: { ...get().ui, detailOpen: false } })
    get().flushSave()
  },
  redo: () => {
    const { past, future, doc } = get()
    if (!future.length) return
    set({ doc: future[0], future: future.slice(1), past: [...past.slice(-49), doc], selection: null, _lastEditAt: 0, ui: { ...get().ui, detailOpen: false } })
    get().flushSave()
  },
  setTitle: (title) => get().patchDoc({ title }),
  setDescription: (description) => get().patchDoc({ description }),
  setBasemap: (basemap) => get().patchDoc({ basemap }),
  setView: (view) => { const d = get().doc; if (!d) return; set({ doc: { ...d, view } }); get().scheduleSave() },

  // ---- layers ----
  addLayer: (name, fc, opts = {}) => {
    const geomType = detectGeometryType(fc)
    const fields = collectFields(fc)
    const layer = {
      id: nanoid(8),
      name: name || 'Layer',
      geomType,
      data: fc,
      fields,
      bbox: bboxOf(fc),
      visible: true,
      style: { ...defaultStyleFor(geomType), ...(opts.style || {}) },
    }
    const layers = [layer, ...get().doc.layers]
    get().patchDoc({ layers })
    set({ selection: { kind: 'layer', id: layer.id }, ui: { ...get().ui, detailOpen: true, leftTab: 'legend' } })
    return layer
  },
  updateLayer: (id, patch) => {
    const layers = get().doc.layers.map((l) => (l.id === id ? { ...l, ...patch } : l))
    get().patchDoc({ layers })
  },
  updateLayerStyle: (id, stylePatch) => {
    const layers = get().doc.layers.map((l) => (l.id === id ? { ...l, style: { ...l.style, ...stylePatch } } : l))
    get().patchDoc({ layers })
  },
  removeLayer: (id) => {
    get().patchDoc({ layers: get().doc.layers.filter((l) => l.id !== id) })
    if (get().selection?.id === id) set({ selection: null, ui: { ...get().ui, detailOpen: false } })
  },
  reorderLayers: (from, to) => {
    const layers = [...get().doc.layers]
    const [m] = layers.splice(from, 1)
    layers.splice(to, 0, m)
    get().patchDoc({ layers })
  },
  toggleLayer: (id) => {
    const layers = get().doc.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    get().patchDoc({ layers })
  },

  // ---- annotations ----
  addAnnotation: (feature) => {
    const ann = { ...feature, id: feature.id || nanoid(8) }
    get().patchDoc({ annotations: [...get().doc.annotations, ann] })
    set({ selection: { kind: 'annotation', id: ann.id }, ui: { ...get().ui, detailOpen: true } })
    return ann
  },
  updateAnnotation: (id, patch) => {
    const annotations = get().doc.annotations.map((a) => (a.id === id ? { ...a, ...patch, properties: { ...a.properties, ...(patch.properties || {}) } } : a))
    get().patchDoc({ annotations })
  },
  removeAnnotation: (id) => {
    get().patchDoc({ annotations: get().doc.annotations.filter((a) => a.id !== id) })
    if (get().selection?.id === id) set({ selection: null, ui: { ...get().ui, detailOpen: false } })
  },
  setAnnotationGeometry: (id, geometry) => {
    const annotations = get().doc.annotations.map((a) => (a.id === id ? { ...a, geometry } : a))
    get().patchDoc({ annotations })
  },
  // live update during a drag — updates state so the map follows, but skips save/updatedAt churn
  setAnnotationGeometryLive: (id, geometry) => {
    const d = get().doc
    const annotations = d.annotations.map((a) => (a.id === id ? { ...a, geometry } : a))
    set({ doc: { ...d, annotations } })
  },
  duplicateAnnotation: (id) => {
    const src = get().doc.annotations.find((a) => a.id === id)
    if (!src) return
    const copy = { ...structuredClone(src), id: nanoid(8), geometry: offsetGeom(src.geometry, 0.0004, -0.0004) }
    get().patchDoc({ annotations: [...get().doc.annotations, copy] })
    set({ selection: { kind: 'annotation', id: copy.id }, ui: { ...get().ui, detailOpen: true } })
    return copy
  },
  clipboard: null,
  copyAnnotation: (id) => {
    const src = get().doc.annotations.find((a) => a.id === id)
    if (src) set({ clipboard: structuredClone(src) })
  },
  pasteAnnotation: (lngLat) => {
    const clip = get().clipboard
    if (!clip) return
    let geometry = structuredClone(clip.geometry)
    if (lngLat) { // recenter paste at the cursor
      const c = geomCentroid(geometry)
      if (c) geometry = offsetGeom(geometry, lngLat[0] - c[0], lngLat[1] - c[1])
    }
    const copy = { ...clip, id: nanoid(8), geometry }
    get().patchDoc({ annotations: [...get().doc.annotations, copy] })
    set({ selection: { kind: 'annotation', id: copy.id }, ui: { ...get().ui, detailOpen: true } })
  },
  toggleLockAnnotation: (id) => {
    const annotations = get().doc.annotations.map((a) => (a.id === id ? { ...a, properties: { ...a.properties, __locked: !a.properties.__locked } } : a))
    get().patchDoc({ annotations })
  },
  arrangeAnnotation: (id, where) => {
    const arr = [...get().doc.annotations]
    const i = arr.findIndex((a) => a.id === id)
    if (i < 0) return
    const [m] = arr.splice(i, 1)
    if (where === 'front') arr.push(m)          // last = drawn on top
    else if (where === 'back') arr.unshift(m)
    get().patchDoc({ annotations: arr })
  },

  // ---- comments ----
  addComment: (lngLat, text = '') => {
    const c = { id: nanoid(8), lngLat, text, author: 'You', color: '#4f7cff', resolved: false, createdAt: Date.now() }
    get().patchDoc({ comments: [...(get().doc.comments || []), c] })
    set({ placingComment: false, ui: { ...get().ui, commentsOpen: true, activeComment: c.id } })
    return c
  },
  updateComment: (id, patch) => {
    get().patchDoc({ comments: (get().doc.comments || []).map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  },
  removeComment: (id) => {
    get().patchDoc({ comments: (get().doc.comments || []).filter((c) => c.id !== id) })
  },

  // ---- view mode / team ----
  setPreviewing: (v) => set({ previewing: v, selection: null, tool: null, ui: { ...get().ui, detailOpen: false } }),
  setPlacingComment: (v) => set({ placingComment: v }),
  inviteMember: (name) => {
    const colors = ['#ff7a59', '#16c79a', '#f4b740', '#a06bff', '#ff5d8f', '#3ec8e0']
    const members = get().workspace.members
    const m = { id: nanoid(6), name, color: colors[members.length % colors.length], you: false, invited: true }
    set({ workspace: { ...get().workspace, members: [...members, m] } })
  },

  // ---- selection / tools ----
  select: (kind, id) => set({ selection: { kind, id }, ui: { ...get().ui, detailOpen: true } }),
  clearSelection: () => set({ selection: null, ui: { ...get().ui, detailOpen: false } }),
  setTool: (tool) => set({ tool }),

  // ---- persistence ----
  scheduleSave: () => {
    clearTimeout(saveTimer)
    set({ status: 'Saving…' })
    saveTimer = setTimeout(() => get().flushSave(), 600)
  },
  flushSave: async () => {
    clearTimeout(saveTimer)
    const doc = get().doc
    if (!doc) return
    await saveMap(doc)
    const index = get().index.map((m) => (m.id === doc.id ? metaOf(doc) : m))
    if (!index.find((m) => m.id === doc.id)) index.unshift(metaOf(doc))
    await saveIndex(index)
    set({ index, status: 'Saved' })
    setTimeout(() => { if (get().status === 'Saved') set({ status: '' }) }, 1400)
  },

  selectedLayer: () => {
    const sel = get().selection
    if (sel?.kind !== 'layer') return null
    return get().doc?.layers.find((l) => l.id === sel.id) || null
  },
  selectedAnnotation: () => {
    const sel = get().selection
    if (sel?.kind !== 'annotation') return null
    return get().doc?.annotations.find((a) => a.id === sel.id) || null
  },
}))

if (import.meta.env.DEV) window.__store = useStore

function metaOf(doc) {
  return {
    id: doc.id,
    title: doc.title,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
    view: doc.view,
    basemap: doc.basemap,
    layerCount: doc.layers.length,
    annCount: doc.annotations.length,
  }
}

// ---- geometry helpers ----
function offsetGeom(geom, dx, dy) {
  const shift = (c) => (typeof c[0] === 'number' ? [c[0] + dx, c[1] + dy] : c.map(shift))
  return { ...geom, coordinates: shift(geom.coordinates) }
}
export function geomCentroid(geom) {
  let x = 0, y = 0, n = 0
  const walk = (c) => { if (typeof c[0] === 'number') { x += c[0]; y += c[1]; n++ } else c.forEach(walk) }
  walk(geom.coordinates)
  return n ? [x / n, y / n] : null
}
