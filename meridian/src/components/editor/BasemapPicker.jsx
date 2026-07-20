import { useStore } from '../../store/useStore'
import { BASEMAPS } from '../../lib/basemaps'
import Icon from '../Icon.jsx'

export default function BasemapPicker() {
  const { doc, setBasemap, setUI } = useStore()
  return (
    <div className="basemap-picker">
      <div className="bp-head">
        <span>Basemap</span>
        <button className="btn icon sm ghost" onClick={() => setUI({ basemapOpen: false })}><Icon name="close" size={15} /></button>
      </div>
      <div className="bp-grid">
        {BASEMAPS.map((b) => {
          const active = doc.basemap === b.id
          return (
            <button key={b.id} className={'bp-card' + (active ? ' sel' : '')} onClick={() => setBasemap(b.id)}>
              <span className="bp-thumb" style={{ background: b.swatch }}>
                {b.thumb && <img src={b.thumb} alt="" loading="lazy" draggable="false" />}
                {active && <span className="bp-check"><Icon name="check" size={13} /></span>}
              </span>
              <span className="bp-name">{b.name}</span>
              {b.sub && <span className="bp-sub">{b.sub}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
