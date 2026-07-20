// Small, real sample datasets so templates render instantly (no network).
const CITIES = [
  ['Tokyo', 139.69, 35.68, 37.4, 'Asia'], ['Delhi', 77.10, 28.70, 32.9, 'Asia'],
  ['Shanghai', 121.47, 31.23, 28.5, 'Asia'], ['São Paulo', -46.63, -23.55, 22.4, 'Americas'],
  ['Mexico City', -99.13, 19.43, 21.8, 'Americas'], ['Cairo', 31.24, 30.04, 21.3, 'Africa'],
  ['Mumbai', 72.87, 19.07, 20.7, 'Asia'], ['Beijing', 116.40, 39.90, 20.4, 'Asia'],
  ['Dhaka', 90.41, 23.81, 21.7, 'Asia'], ['Osaka', 135.50, 34.69, 19.1, 'Asia'],
  ['New York', -74.01, 40.71, 18.8, 'Americas'], ['Karachi', 67.01, 24.86, 16.8, 'Asia'],
  ['Buenos Aires', -58.38, -34.60, 15.2, 'Americas'], ['Istanbul', 28.98, 41.01, 15.2, 'Europe'],
  ['Lagos', 3.38, 6.52, 15.4, 'Africa'], ['Los Angeles', -118.24, 34.05, 12.4, 'Americas'],
  ['Moscow', 37.62, 55.75, 12.6, 'Europe'], ['Paris', 2.35, 48.86, 11.1, 'Europe'],
  ['London', -0.13, 51.51, 9.4, 'Europe'], ['Bangkok', 100.50, 13.75, 10.9, 'Asia'],
  ['Johannesburg', 28.05, -26.20, 9.6, 'Africa'], ['Lima', -77.04, -12.05, 10.7, 'Americas'],
  ['Nairobi', 36.82, -1.29, 4.9, 'Africa'], ['Sydney', 151.21, -33.87, 5.3, 'Oceania'],
  ['Toronto', -79.38, 43.65, 6.2, 'Americas'], ['Berlin', 13.40, 52.52, 3.6, 'Europe'],
]

const citiesFC = {
  type: 'FeatureCollection',
  features: CITIES.map(([name, lng, lat, pop, region]) => ({
    type: 'Feature',
    properties: { name, population_m: pop, region },
    geometry: { type: 'Point', coordinates: [lng, lat] },
  })),
}

// A few country-ish polygons (rough boxes) to show choropleth styling.
const box = (name, val, [w, s, e, n]) => ({
  type: 'Feature',
  properties: { name, index: val },
  geometry: { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] },
})
const regionsFC = {
  type: 'FeatureCollection',
  features: [
    box('North', 68, [-125, 40, -66, 49]),
    box('Central', 45, [-125, 30, -95, 40]),
    box('South', 82, [-95, 25, -80, 40]),
    box('East', 33, [-80, 30, -66, 45]),
    box('West', 57, [-125, 25, -108, 30]),
  ],
}

export const SAMPLE_MAPS = [
  {
    title: 'World City Populations',
    sub: 'Graduated points',
    icon: 'target',
    gradient: 'linear-gradient(135deg,#4f7cff,#a06bff)',
    basemap: 'light',
    view: { center: [20, 25], zoom: 1.6, bearing: 0, pitch: 0 },
    layers: [{ name: 'Major cities', data: citiesFC, style: { type: 'sizeRange', field: 'population_m', size: 22, color: '#4f7cff', opacity: 0.85, labelField: 'name' } }],
  },
  {
    title: 'Cities by Region',
    sub: 'Categorical colors',
    icon: 'globe',
    gradient: 'linear-gradient(135deg,#16c79a,#4f7cff)',
    basemap: 'dark',
    view: { center: [20, 25], zoom: 1.6, bearing: 0, pitch: 0 },
    layers: [{ name: 'Cities', data: citiesFC, style: { type: 'categories', field: 'region', size: 7, palette: 'Bold', opacity: 0.9 } }],
  },
  {
    title: 'Regional Index',
    sub: 'Choropleth',
    icon: 'polygon',
    gradient: 'linear-gradient(135deg,#ff7a59,#f4b740)',
    basemap: 'light',
    view: { center: [-96, 37], zoom: 3.1, bearing: 0, pitch: 0 },
    layers: [{ name: 'Regions', data: regionsFC, style: { type: 'colorRange', field: 'index', ramp: 'Sunset', opacity: 0.7, labelField: 'name' } }],
  },
]
