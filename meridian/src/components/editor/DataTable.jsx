import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import Icon from '../Icon.jsx'
import { mapRef } from '../../lib/mapRef'

export default function DataTable() {
  const { doc, setUI, selection, select } = useStore()
  const layers = doc.layers
  const [activeId, setActiveId] = useState(selection?.kind === 'layer' ? selection.id : layers[0]?.id)
  const [sort, setSort] = useState(null)
  const [q, setQ] = useState('')
  const layer = layers.find((l) => l.id === activeId) || layers[0]

  const rows = useMemo(() => {
    if (!layer) return []
    let r = layer.data.features.map((f, i) => ({ i, props: f.properties || {}, geom: f.geometry }))
    if (q) r = r.filter((row) => Object.values(row.props).some((v) => String(v).toLowerCase().includes(q.toLowerCase())))
    if (sort) r.sort((a, b) => {
      const av = a.props[sort.key], bv = b.props[sort.key]
      const n = Number(av) - Number(bv)
      const cmp = !isNaN(n) ? n : String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return r
  }, [layer, q, sort])

  if (!layer) {
    return (
      <div className="data-table empty-table">
        <div className="dt-head"><span>Data table</span><button className="btn icon sm ghost" onClick={() => setUI({ tableOpen: false })}><Icon name="close" size={15} /></button></div>
        <div className="muted" style={{ padding: 20 }}>No layers to show. Upload data first.</div>
      </div>
    )
  }

  const cols = layer.fields.map((f) => f.name)
  const flyTo = (geom) => {
    if (!mapRef.current) return
    const c = centroid(geom)
    if (c) mapRef.current.flyTo({ center: c, zoom: Math.max(mapRef.current.getZoom(), 8), duration: 800 })
  }

  return (
    <div className="data-table">
      <div className="dt-head">
        <div className="dt-tabs">
          {layers.map((l) => (
            <button key={l.id} className={l.id === activeId ? 'active' : ''} onClick={() => setActiveId(l.id)}>{l.name}</button>
          ))}
        </div>
        <div className="dt-search"><Icon name="search" size={14} /><input placeholder="Filter rows…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <span className="muted" style={{ fontSize: 12 }}>{rows.length} rows</span>
        <button className="btn icon sm ghost" onClick={() => setUI({ tableOpen: false })}><Icon name="close" size={15} /></button>
      </div>
      <div className="dt-scroll">
        <table>
          <thead>
            <tr>
              <th className="dt-rownum">#</th>
              {cols.map((c) => (
                <th key={c} onClick={() => setSort((s) => ({ key: c, dir: s?.key === c && s.dir === 'asc' ? 'desc' : 'asc' }))}>
                  {c} {sort?.key === c && <Icon name="chevronDown" size={12} style={{ transform: sort.dir === 'asc' ? 'rotate(180deg)' : 'none' }} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 500).map((row) => (
              <tr key={row.i} onClick={() => flyTo(row.geom)}>
                <td className="dt-rownum">{row.i + 1}</td>
                {cols.map((c) => <td key={c}>{fmtCell(row.props[c])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 500 && <div className="muted" style={{ padding: 10 }}>Showing first 500 of {rows.length} rows.</div>}
      </div>
    </div>
  )
}

function fmtCell(v) {
  if (v == null || v === '') return <span className="muted">—</span>
  if (typeof v === 'number') return v.toLocaleString(undefined, { maximumFractionDigits: 4 })
  return String(v)
}
function centroid(geom) {
  if (!geom) return null
  if (geom.type === 'Point') return geom.coordinates
  let x = 0, y = 0, n = 0
  const walk = (c) => { if (typeof c[0] === 'number') { x += c[0]; y += c[1]; n++ } else c.forEach(walk) }
  walk(geom.coordinates)
  return n ? [x / n, y / n] : null
}
