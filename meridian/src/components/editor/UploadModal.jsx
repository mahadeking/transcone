import { useState, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import Icon from '../Icon.jsx'
import { parseFile, geocodeRows } from '../../lib/geo'
import { mapRef } from '../../lib/mapRef'
import { bboxOf } from '../../lib/geo'

export default function UploadModal() {
  const { setUI, addLayer } = useStore()
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(null)
  const [pasteText, setPasteText] = useState('')

  const close = () => setUI({ uploadOpen: false })

  const handleFC = (name, fc) => {
    if (!fc.features?.length) throw new Error('No mappable features found in this file.')
    const layer = addLayer(name, fc)
    const bb = layer.bbox
    if (bb && mapRef.current) mapRef.current.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 60, duration: 900 })
    close()
  }

  const ingest = useCallback(async (file) => {
    setError(''); setBusy(true); setProgress(null)
    try {
      const res = await parseFile(file)
      const name = file.name.replace(/\.[^.]+$/, '')
      if (res.fc) { handleFC(name, res.fc); return }
      if (res.csv) {
        const { fc, needGeocode, addrCols } = res.csv
        if (needGeocode.length && addrCols.length) {
          setProgress({ done: 0, total: needGeocode.length })
          const geocoded = await geocodeRows(needGeocode, addrCols, (done, total) => setProgress({ done, total }))
          fc.features.push(...geocoded)
        }
        handleFC(name, fc)
      }
    } catch (e) {
      setError(e.message || 'Could not read that file.')
    } finally { setBusy(false); setProgress(null) }
  }, [])

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files?.[0]
    if (f) ingest(f)
  }

  const ingestPaste = async () => {
    setError(''); setBusy(true)
    try {
      const txt = pasteText.trim()
      let fc
      if (txt.startsWith('{')) fc = JSON.parse(txt)
      else {
        const { csvToGeoJSON, geocodeRows } = await import('../../lib/geo')
        const parsed = csvToGeoJSON(txt)
        fc = parsed.fc
        if (parsed.needGeocode.length && parsed.addrCols.length) {
          setProgress({ done: 0, total: parsed.needGeocode.length })
          const g = await geocodeRows(parsed.needGeocode, parsed.addrCols, (done, total) => setProgress({ done, total }))
          fc.features.push(...g)
        }
      }
      if (fc.type === 'Feature') fc = { type: 'FeatureCollection', features: [fc] }
      handleFC('Pasted data', fc)
    } catch (e) { setError(e.message || 'Could not parse pasted data.') }
    finally { setBusy(false); setProgress(null) }
  }

  return (
    <div className="modal-scrim" onClick={close}>
      <div className="modal upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3><Icon name="upload" size={18} /> Upload data</h3>
          <button className="btn icon sm ghost" onClick={close}><Icon name="close" size={16} /></button>
        </div>

        <div className={'dropzone' + (drag ? ' drag' : '')}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)} onDrop={onDrop}>
          {busy ? (
            <div className="dz-busy">
              <div className="spinner" />
              {progress ? <div>Geocoding addresses… {progress.done}/{progress.total}</div> : <div>Reading file…</div>}
            </div>
          ) : (
            <>
              <div className="dz-icon"><Icon name="upload" size={30} /></div>
              <div className="dz-title">Drop a file here, or <label className="dz-browse">browse<input type="file" hidden accept=".geojson,.json,.csv,.tsv,.kml,.gpx,.zip,.shp" onChange={(e) => e.target.files[0] && ingest(e.target.files[0])} /></label></div>
              <div className="dz-formats">GeoJSON · CSV / spreadsheet (with addresses) · KML · GPX · Shapefile (.zip)</div>
            </>
          )}
        </div>

        {error && <div className="upload-error"><Icon name="close" size={14} /> {error}</div>}

        <div className="upload-or">or paste GeoJSON / CSV</div>
        <textarea className="input paste-area" placeholder='{"type":"FeatureCollection", ...}  — or —  name,lat,lng…' value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
        <button className="btn primary" disabled={!pasteText.trim() || busy} onClick={ingestPaste} style={{ alignSelf: 'flex-start' }}>Add pasted data</button>

        <div className="upload-hint muted">
          CSV with <code>lat</code>/<code>lng</code> columns maps instantly. CSV with address columns is geocoded via OpenStreetMap (≈1 row/sec).
        </div>
      </div>
    </div>
  )
}
