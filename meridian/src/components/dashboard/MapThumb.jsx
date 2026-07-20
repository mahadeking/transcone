import { getBasemap } from '../../lib/basemaps'
import Icon from '../Icon.jsx'

// Static thumbnail: a soft basemap-tinted gradient + centre marker.
// (Avoids spinning up a MapLibre instance per card for performance.)
const TINTS = {
  light: 'linear-gradient(135deg,#eef2f7,#dfe6ee)',
  dark: 'linear-gradient(135deg,#1b2230,#0f141c)',
  streets: 'linear-gradient(135deg,#e7eede,#d3e0cd)',
  satellite: 'linear-gradient(135deg,#2b3a2a,#405233)',
  terrain: 'linear-gradient(135deg,#e6dcc4,#cdbb98)',
}

export default function MapThumb({ meta }) {
  const bm = getBasemap(meta.basemap).id
  const dark = bm === 'dark' || bm === 'satellite'
  return (
    <div className="thumb" style={{ background: TINTS[bm] || TINTS.light }}>
      <svg className="thumb-grid" viewBox="0 0 100 60" preserveAspectRatio="none">
        {[15, 30, 45].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} />)}
        {[20, 40, 60, 80].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="60" />)}
      </svg>
      <div className={'thumb-pin ' + (dark ? 'on-dark' : '')}>
        <Icon name={meta.layerCount ? 'layers' : 'compass'} size={22} />
      </div>
    </div>
  )
}
