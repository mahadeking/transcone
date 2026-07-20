// Export the drawn annotations (and optionally data layers) as clean vector SVG / PNG,
// by projecting their coordinates into the current map view.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function projector(map) {
  return (c) => { const p = map.project(c); return `${Math.round(p.x * 10) / 10} ${Math.round(p.y * 10) / 10}` }
}
function ringPath(coords, P, close) {
  return coords.map((c, i) => (i ? 'L' : 'M') + P(c)).join(' ') + (close ? ' Z' : '')
}

// simple per-feature color for a data layer (uses the layer's base color)
function layerColor(layer) {
  const s = layer.style
  if (s.type === 'categories' || s.type === 'colorRange' || s.type === 'heatmap') return '#4f7cff'
  return s.color || '#4f7cff'
}

export function drawingsToSVG(map, doc, { includeLayers = false, background = 'transparent' } = {}) {
  const canvas = map.getCanvas()
  const W = canvas.clientWidth || canvas.width
  const H = canvas.clientHeight || canvas.height
  const P = projector(map)
  const parts = []

  const renderFeature = (geom, s) => {
    if (!geom) return
    if (geom.type === 'Point') {
      const pt = map.project(geom.coordinates)
      const x = pt.x, y = pt.y
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.size || 6}" fill="${s.color}" fill-opacity="${s.opacity ?? 1}" stroke="#fff" stroke-width="2"/>`)
      if (s.label) parts.push(`<text x="${x.toFixed(1)}" y="${(y - (s.size || 6) - 5).toFixed(1)}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="600" fill="${s.color}" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(s.label)}</text>`)
    } else if (geom.type === 'LineString') {
      parts.push(`<path d="${ringPath(geom.coordinates, P, false)}" fill="none" stroke="${s.color}" stroke-width="${s.size || 3}" stroke-linecap="round" stroke-linejoin="round"${s.dashed ? ' stroke-dasharray="8 6"' : ''} opacity="${s.opacity ?? 1}"/>`)
    } else if (geom.type === 'Polygon') {
      const d = geom.coordinates.map((r) => ringPath(r, P, true)).join(' ')
      parts.push(`<path d="${d}" fill="${s.color}" fill-opacity="${s.fillOpacity ?? 0.35}" stroke="${s.color}" stroke-width="${s.size || 2}"${s.dashed ? ' stroke-dasharray="8 6"' : ''} fill-rule="evenodd"/>`)
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach((poly) => renderFeature({ type: 'Polygon', coordinates: poly }, s))
    } else if (geom.type === 'MultiLineString') {
      geom.coordinates.forEach((l) => renderFeature({ type: 'LineString', coordinates: l }, s))
    }
  }

  // data layers first (underneath), if requested
  if (includeLayers) {
    for (const layer of [...doc.layers].reverse()) {
      if (!layer.visible) continue
      const col = layerColor(layer)
      for (const f of layer.data.features) {
        renderFeature(f.geometry, { color: col, size: layer.style.size || (layer.geomType === 'point' ? 5 : 2), opacity: layer.style.opacity ?? 0.9, fillOpacity: layer.style.opacity ?? 0.4 })
      }
    }
  }

  // annotations on top
  for (const a of doc.annotations) {
    const p = a.properties
    renderFeature(a.geometry, {
      color: p.__color, size: p.__size, opacity: p.__kind === 'highlighter' ? 0.5 : (p.__opacity ?? 1),
      fillOpacity: p.__opacity ?? 0.35, dashed: p.__linestyle === 'dashed', label: p.title || p.__text || '',
    })
  }

  const bg = background && background !== 'transparent' ? `<rect width="${W}" height="${H}" fill="${background}"/>` : ''
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg}${parts.join('')}</svg>`, W, H, count: parts.length }
}

export function svgToPngDataURL(svg, W, H) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = W * 2; c.height = H * 2 // 2x for crisp output
      const ctx = c.getContext('2d'); ctx.scale(2, 2); ctx.drawImage(img, 0, 0)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  })
}
