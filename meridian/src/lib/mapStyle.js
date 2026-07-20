import { CATEGORICAL, SEQUENTIAL, rampColor, extent, quantileBreaks } from './palettes'

const uniqueValues = (fc, field, max = 12) => {
  const seen = []
  for (const f of fc.features || []) {
    const v = f.properties?.[field]
    if (v == null || v === '') continue
    if (!seen.includes(v)) seen.push(v)
    if (seen.length > max) break
  }
  return seen
}

const numericValues = (fc, field) =>
  (fc.features || []).map((f) => Number(f.properties?.[field])).filter((v) => !isNaN(v))

// ---- category → color map used by both paint + legend ----
export function categoryColors(layer) {
  const { field, palette } = layer.style
  const pal = CATEGORICAL[palette] || CATEGORICAL.Bold
  const vals = uniqueValues(layer.data, field)
  const map = {}
  vals.forEach((v, i) => { map[v] = pal[i % pal.length] })
  return { map, vals }
}

// ---- color-range breaks used by both paint + legend ----
export function colorRangeStops(layer) {
  const { field, ramp } = layer.style
  const vals = numericValues(layer.data, field)
  const [min, max] = extent(vals)
  const breaks = quantileBreaks(vals, 5)
  const bins = [min, ...breaks, max]
  const stops = []
  for (let i = 0; i < bins.length - 1; i++) {
    const t = i / (bins.length - 2)
    stops.push({ from: bins[i], to: bins[i + 1], color: rampColor(ramp, t) })
  }
  return { stops, min, max }
}

export function sizeRangeInfo(layer) {
  const vals = numericValues(layer.data, layer.style.field)
  const [min, max] = extent(vals)
  const maxSize = layer.style.size || 22
  return { min, max, minSize: 4, maxSize }
}

// ---- build MapLibre paint expression for fill color ----
function colorExpr(layer) {
  const s = layer.style
  if (s.type === 'categories' && s.field) {
    const { map } = categoryColors(layer)
    const expr = ['match', ['to-string', ['get', s.field]]]
    for (const [k, c] of Object.entries(map)) { expr.push(String(k), c) }
    expr.push('#9aa5b4')
    return expr
  }
  if (s.type === 'colorRange' && s.field) {
    const { stops, min } = colorRangeStops(layer)
    const expr = ['step', ['to-number', ['get', s.field], min], stops[0].color]
    for (let i = 1; i < stops.length; i++) expr.push(stops[i].from, stops[i].color)
    return expr
  }
  return s.color
}

function radiusExpr(layer) {
  const s = layer.style
  if (s.type === 'sizeRange' && s.field) {
    const { min, max, minSize, maxSize } = sizeRangeInfo(layer)
    return ['interpolate', ['linear'], ['to-number', ['get', s.field], min], min, minSize, max, maxSize]
  }
  return s.size
}

// ---- returns { source, layers } for a data layer ----
export function buildLayerSpecs(layer) {
  const srcId = `src-${layer.id}`
  const source = { id: srcId, spec: { type: 'geojson', data: layer.data, promoteId: undefined } }
  const s = layer.style
  const layers = []
  const vis = layer.visible ? 'visible' : 'none'

  if (layer.geomType === 'point') {
    if (s.type === 'heatmap') {
      layers.push({
        id: `${layer.id}-heat`, type: 'heatmap', source: srcId,
        layout: { visibility: vis },
        paint: {
          'heatmap-weight': s.field ? ['interpolate', ['linear'], ['to-number', ['get', s.field], 0], 0, 0, 1, 1] : 1,
          'heatmap-intensity': 1,
          'heatmap-radius': (s.size || 6) * 4,
          'heatmap-opacity': s.opacity ?? 0.9,
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)', 0.2, rampColor(s.ramp, 0.2), 0.4, rampColor(s.ramp, 0.4),
            0.6, rampColor(s.ramp, 0.6), 0.8, rampColor(s.ramp, 0.8), 1, rampColor(s.ramp, 1)],
        },
      })
    } else {
      layers.push({
        id: `${layer.id}-circle`, type: 'circle', source: srcId,
        layout: { visibility: vis },
        paint: {
          'circle-radius': radiusExpr(layer),
          'circle-color': colorExpr(layer),
          'circle-opacity': s.opacity ?? 0.9,
          'circle-stroke-color': s.strokeColor || '#fff',
          'circle-stroke-width': s.strokeWidth ?? 1,
        },
      })
    }
  } else if (layer.geomType === 'line') {
    layers.push({
      id: `${layer.id}-line`, type: 'line', source: srcId,
      layout: { visibility: vis, 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': colorExpr(layer), 'line-width': s.size || 2, 'line-opacity': s.opacity ?? 0.9 },
    })
  } else {
    layers.push({
      id: `${layer.id}-fill`, type: 'fill', source: srcId,
      layout: { visibility: vis },
      paint: { 'fill-color': colorExpr(layer), 'fill-opacity': s.opacity ?? 0.55 },
    })
    layers.push({
      id: `${layer.id}-outline`, type: 'line', source: srcId,
      layout: { visibility: vis },
      paint: { 'line-color': s.strokeColor || '#ffffff', 'line-width': s.strokeWidth ?? 1, 'line-opacity': 0.9 },
    })
  }

  // labels
  if (s.labelField) {
    layers.push({
      id: `${layer.id}-label`, type: 'symbol', source: srcId,
      layout: {
        visibility: vis,
        'text-field': ['to-string', ['get', s.labelField]],
        'text-size': 12, 'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-offset': layer.geomType === 'point' ? [0, 1.1] : [0, 0],
        'text-anchor': layer.geomType === 'point' ? 'top' : 'center',
        'text-allow-overlap': false,
      },
      paint: { 'text-color': '#10151d', 'text-halo-color': '#ffffff', 'text-halo-width': 1.4 },
    })
  }
  return { source, layers }
}

// ---- legend model for left panel ----
export function computeLegend(layer) {
  const s = layer.style
  if (s.type === 'categories' && s.field) {
    const { map } = categoryColors(layer)
    return { kind: 'categories', field: s.field, items: Object.entries(map).map(([label, color]) => ({ label, color })) }
  }
  if (s.type === 'colorRange' && s.field) {
    const { stops } = colorRangeStops(layer)
    return { kind: 'ramp', field: s.field, stops }
  }
  if (s.type === 'sizeRange' && s.field) {
    const { min, max, minSize, maxSize } = sizeRangeInfo(layer)
    return { kind: 'size', field: s.field, min, max, minSize, maxSize, color: s.color }
  }
  if (s.type === 'heatmap') return { kind: 'heatmap', ramp: s.ramp }
  return { kind: 'simple', color: s.color, geomType: layer.geomType }
}

export const RAMP_LIST = Object.keys(SEQUENTIAL)
export const PALETTE_LIST = Object.keys(CATEGORICAL)
