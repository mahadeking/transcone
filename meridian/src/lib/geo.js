import Papa from 'papaparse'
import { kml, gpx } from '@tmcw/togeojson'
import shp from 'shpjs'

// ---- helpers ----------------------------------------------------
export function detectGeometryType(fc) {
  const t = fc?.features?.find((f) => f.geometry)?.geometry?.type || ''
  if (/Point/.test(t)) return 'point'
  if (/LineString/.test(t)) return 'line'
  if (/Polygon/.test(t)) return 'polygon'
  return 'point'
}

export function collectFields(fc) {
  const fields = new Map() // name -> {name, numeric}
  for (const f of fc.features || []) {
    const p = f.properties || {}
    for (const k of Object.keys(p)) {
      const v = p[k]
      const numeric = typeof v === 'number' || (v !== '' && v != null && !isNaN(Number(v)))
      const prev = fields.get(k)
      fields.set(k, { name: k, numeric: prev ? prev.numeric && numeric : numeric })
    }
  }
  return [...fields.values()]
}

export function bboxOf(fc) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      minX = Math.min(minX, c[0]); minY = Math.min(minY, c[1])
      maxX = Math.max(maxX, c[0]); maxY = Math.max(maxY, c[1])
    } else c.forEach(walk)
  }
  for (const f of fc.features || []) if (f.geometry?.coordinates) walk(f.geometry.coordinates)
  if (!isFinite(minX)) return null
  return [minX, minY, maxX, maxY]
}

const looksLat = (n) => /(^|_)?(lat|latitude|y)$/i.test(n)
const looksLng = (n) => /(^|_)?(lon|lng|long|longitude|x)$/i.test(n)

// ---- CSV --------------------------------------------------------
export function csvToGeoJSON(text) {
  const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true, dynamicTyping: true })
  const rows = parsed.data
  if (!rows.length) throw new Error('No rows found in the file.')
  const cols = Object.keys(rows[0])
  const latCol = cols.find(looksLat)
  const lngCol = cols.find(looksLng)
  const features = []
  const needGeocode = []
  const addrCols = cols.filter((c) => /address|street|city|place|location|zip|postal|country|state/i.test(c))

  for (const row of rows) {
    if (latCol && lngCol && row[latCol] != null && row[lngCol] != null) {
      const lat = Number(row[latCol]), lng = Number(row[lngCol])
      if (!isNaN(lat) && !isNaN(lng)) {
        features.push({ type: 'Feature', properties: row, geometry: { type: 'Point', coordinates: [lng, lat] } })
        continue
      }
    }
    if (addrCols.length) needGeocode.push(row)
    else features.push({ type: 'Feature', properties: row, geometry: null })
  }
  return {
    fc: { type: 'FeatureCollection', features },
    needGeocode,
    addrCols,
    hasCoords: !!(latCol && lngCol),
  }
}

// ---- Nominatim geocoding (OSM) ----------------------------------
export async function geocodeAddress(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  if (!res.ok) throw new Error('Geocoding failed')
  const data = await res.json()
  if (!data.length) return null
  return [Number(data[0].lon), Number(data[0].lat)]
}

export async function geocodeRows(rows, addrCols, onProgress) {
  const features = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const q = addrCols.map((c) => row[c]).filter(Boolean).join(', ')
    let coords = null
    try { coords = q ? await geocodeAddress(q) : null } catch { /* ignore */ }
    if (coords) features.push({ type: 'Feature', properties: row, geometry: { type: 'Point', coordinates: coords } })
    onProgress?.(i + 1, rows.length)
    await new Promise((r) => setTimeout(r, 1100)) // respect Nominatim 1req/s
  }
  return features
}

// ---- Universal parse --------------------------------------------
export async function parseFile(file) {
  const name = file.name.toLowerCase()
  const ext = name.split('.').pop()

  if (ext === 'geojson' || ext === 'json') {
    const fc = JSON.parse(await file.text())
    return { fc: normalizeFC(fc) }
  }
  if (ext === 'csv' || ext === 'tsv') {
    return { csv: csvToGeoJSON(await file.text()) }
  }
  if (ext === 'kml') {
    const dom = new DOMParser().parseFromString(await file.text(), 'text/xml')
    return { fc: normalizeFC(kml(dom)) }
  }
  if (ext === 'gpx') {
    const dom = new DOMParser().parseFromString(await file.text(), 'text/xml')
    return { fc: normalizeFC(gpx(dom)) }
  }
  if (ext === 'zip' || ext === 'shp') {
    const buf = await file.arrayBuffer()
    const out = await shp(buf)
    const fc = Array.isArray(out)
      ? { type: 'FeatureCollection', features: out.flatMap((o) => o.features) }
      : out
    return { fc: normalizeFC(fc) }
  }
  throw new Error(`Unsupported file type: .${ext}`)
}

function normalizeFC(fc) {
  if (fc.type === 'Feature') return { type: 'FeatureCollection', features: [fc] }
  if (fc.type === 'FeatureCollection') return fc
  if (fc.type && fc.coordinates) return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: fc }] }
  return { type: 'FeatureCollection', features: [] }
}

export function toCSV(fc) {
  const rows = (fc.features || []).map((f) => {
    const p = { ...(f.properties || {}) }
    if (f.geometry?.type === 'Point') { p._lng = f.geometry.coordinates[0]; p._lat = f.geometry.coordinates[1] }
    return p
  })
  return Papa.unparse(rows)
}
