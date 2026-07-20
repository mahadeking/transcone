// Colour ramps + categorical palettes for data-driven cartography.
export const SEQUENTIAL = {
  Blues: ['#eff6ff', '#bfdbfe', '#7ca7ff', '#4f7cff', '#2f4fc4'],
  Sunset: ['#fff0e6', '#ffcfa8', '#ff9d6b', '#ff6b4a', '#c92a4d'],
  Viridis: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
  Teal: ['#e0fbf4', '#9ceccd', '#43d6a5', '#16c79a', '#0b7a63'],
  Magma: ['#fcfdbf', '#fe9f6d', '#de4968', '#8c2981', '#2c115f'],
  Grays: ['#f2f4f7', '#c9d0da', '#9aa5b4', '#5e6b7d', '#28303c'],
}

export const CATEGORICAL = {
  Bold: ['#4f7cff', '#ff7a59', '#16c79a', '#f4b740', '#a06bff', '#ff5d8f', '#3ec8e0', '#8ec63f', '#e0563b', '#6b7280'],
  Pastel: ['#8fb0ff', '#ffb59e', '#7fe0c4', '#ffd98a', '#c6a8ff', '#ffa3c2', '#9ee3ef', '#c3e29a', '#f0a58f', '#b8bfca'],
  Earth: ['#6b8e5a', '#c58940', '#8b5a2b', '#4a7c8c', '#a8763e', '#5f7161', '#9c6b4f', '#3d5a45', '#c9a66b', '#7d8471'],
}

export function rampColor(ramp, t) {
  const stops = SEQUENTIAL[ramp] || SEQUENTIAL.Blues
  const n = stops.length - 1
  const i = Math.max(0, Math.min(n - 1, Math.floor(t * n)))
  const f = t * n - i
  return lerpHex(stops[i], stops[i + 1], f)
}

export function quantileBreaks(values, k) {
  const s = values.filter((v) => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b)
  if (!s.length) return []
  const breaks = []
  for (let i = 1; i < k; i++) breaks.push(s[Math.floor((i / k) * s.length)])
  return breaks
}

export function extent(values) {
  let min = Infinity, max = -Infinity
  for (const v of values) { if (typeof v === 'number' && !isNaN(v)) { min = Math.min(min, v); max = Math.max(max, v) } }
  return isFinite(min) ? [min, max] : [0, 1]
}

function lerpHex(a, b, t) {
  const pa = hexToRgb(a), pb = hexToRgb(b)
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t)
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t)
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t)
  return `#${[r, g, bl].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}
function hexToRgb(h) {
  const s = h.replace('#', '')
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
}
