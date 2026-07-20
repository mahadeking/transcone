// Free basemap styles (Carto GL + raster). Attribution kept in-map.
const GLYPHS = 'https://basemaps.cartocdn.com/gl/positron-gl-style/{fontstack}/{range}.pbf'

const rasterStyle = (name, tiles, attribution, maxzoom = 19) => ({
  version: 8,
  glyphs: GLYPHS,
  // maxzoom = deepest zoom the tiles exist at; MapLibre upscales past it instead of fetching blank tiles.
  sources: { [name]: { type: 'raster', tiles, tileSize: 256, attribution, maxzoom } },
  layers: [{ id: name, type: 'raster', source: name }],
})

// Satellite imagery + a transparent reference overlay (place names, roads, borders).
const esri = (svc) => [`https://server.arcgisonline.com/ArcGIS/rest/services/${svc}/MapServer/tile/{z}/{y}/{x}`]
const hybridSatelliteStyle = (labels = true) => ({
  version: 8,
  glyphs: GLYPHS,
  sources: {
    'esri-sat': { type: 'raster', tiles: esri('World_Imagery'), tileSize: 256, maxzoom: 19, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' },
    ...(labels ? {
      'esri-ref': { type: 'raster', tiles: esri('Reference/World_Boundaries_and_Places'), tileSize: 256, maxzoom: 18, attribution: '' },
      'esri-roads': { type: 'raster', tiles: esri('Reference/World_Transportation'), tileSize: 256, maxzoom: 18, attribution: '' },
    } : {}),
  },
  layers: [
    { id: 'esri-sat', type: 'raster', source: 'esri-sat' },
    ...(labels ? [
      { id: 'esri-roads', type: 'raster', source: 'esri-roads' },
      { id: 'esri-ref', type: 'raster', source: 'esri-ref' },
    ] : []),
  ],
})

// Real preview tile (z5 over the Mediterranean — coastline reads well in every style).
const T = { z: 5, x: 16, y: 11 }
const cartoThumb = (name) => `https://basemaps.cartocdn.com/${name}/${T.z}/${T.x}/${T.y}.png`
const esriThumb = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${T.z}/${T.y}/${T.x}`

export const BASEMAPS = [
  {
    id: 'light',
    name: 'Light',
    swatch: '#e9edf2',
    thumb: cartoThumb('light_all'),
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
  {
    id: 'dark',
    name: 'Dark',
    swatch: '#1b2230',
    thumb: cartoThumb('dark_all'),
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  {
    id: 'streets',
    name: 'Streets',
    swatch: '#c8d7c0',
    thumb: cartoThumb('rastertiles/voyager'),
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
  {
    id: 'satellite',
    name: 'Satellite',
    sub: 'Labeled hybrid',
    swatch: 'linear-gradient(135deg,#2b3a2a,#405233)',
    thumb: esriThumb,
    style: hybridSatelliteStyle(true),
  },
  {
    id: 'satellite-plain',
    name: 'Satellite',
    sub: 'Clean imagery',
    swatch: 'linear-gradient(135deg,#1f2a1c,#33421f)',
    thumb: esriThumb,
    style: hybridSatelliteStyle(false),
  },
  {
    id: 'terrain',
    name: 'Terrain',
    swatch: '#d8c7a8',
    thumb: `https://a.tile.opentopomap.org/${T.z}/${T.x}/${T.y}.png`,
    style: rasterStyle(
      'terrain',
      ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png', 'https://b.tile.opentopomap.org/{z}/{x}/{y}.png'],
      '© OpenTopoMap (CC-BY-SA)',
      17
    ),
  },
]

export const getBasemap = (id) => BASEMAPS.find((b) => b.id === id) || BASEMAPS[0]
