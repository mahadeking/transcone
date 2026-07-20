import { useEffect } from 'react'
import { useStore } from '../../store/useStore'
import MapCanvas from './MapCanvas.jsx'
import TopBar from './TopBar.jsx'
import LeftPanel from './LeftPanel.jsx'
import DetailPanel from './DetailPanel.jsx'
import DataTable from './DataTable.jsx'
import UploadModal from './UploadModal.jsx'
import ShareModal from './ShareModal.jsx'
import BasemapPicker from './BasemapPicker.jsx'
import ContextMenu from './ContextMenu.jsx'
import CommentsPanel from './CommentsPanel.jsx'
import Viewer from '../viewer/Viewer.jsx'
import Icon from '../Icon.jsx'
import './editor.css'

export default function Editor() {
  const doc = useStore((s) => s.doc)
  const ui = useStore((s) => s.ui)
  const previewing = useStore((s) => s.previewing)

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches('input, textarea, select, [contenteditable]')) return
      const s = useStore.getState()
      const sel = s.selection
      const annId = sel?.kind === 'annotation' ? sel.id : null
      const mod = e.ctrlKey || e.metaKey

      // undo / redo
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); return e.shiftKey ? s.redo() : s.undo() }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); return s.redo() }

      // annotation clipboard / edit shortcuts
      if (mod && e.key.toLowerCase() === 'd' && annId) { e.preventDefault(); return s.duplicateAnnotation(annId) }
      if (mod && e.key.toLowerCase() === 'c' && annId) { e.preventDefault(); return s.copyAnnotation(annId) }
      if (mod && e.key.toLowerCase() === 'v' && s.clipboard) { e.preventDefault(); return s.pasteAnnotation(s.doc.view.center) }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'l' && annId) { e.preventDefault(); return s.toggleLockAnnotation(annId) }
      if ((e.key === 'Delete' || e.key === 'Backspace') && annId) { e.preventDefault(); return s.removeAnnotation(annId) }
      if (mod) return // don't hijack other browser shortcuts

      const map = { p: 'pin', l: 'line', r: 'route', o: 'polygon', e: 'rectangle', i: 'circle', t: 'text', m: 'marker' }
      const k = e.key.toLowerCase()
      if (map[k]) { s.setTool(map[k]); e.preventDefault() }
      else if (e.key === 'Escape') { s.setTool(null); s.clearSelection(); s.setUI({ contextMenu: null }) }
      else if (k === 'u') { s.setUI({ uploadOpen: true }) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!doc) return <div className="editor-loading">Loading map…</div>

  if (previewing) return <PreviewMode doc={doc} />

  return (
    <div className="editor">
      <TopBar />
      <div className="editor-body">
        <LeftPanel />
        <div className={'map-wrap' + (ui.detailOpen ? ' detail-open' : '') + (ui.tableOpen ? ' table-open' : '')}>
          <MapCanvas />
          {ui.basemapOpen && <BasemapPicker />}
          {ui.tableOpen && <DataTable />}
          {ui.detailOpen && <DetailPanel />}
        </div>
        {ui.commentsOpen && <CommentsPanel />}
      </div>
      {ui.uploadOpen && <UploadModal />}
      {ui.shareOpen && <ShareModal />}
      <ContextMenu />
    </div>
  )
}

function PreviewMode({ doc }) {
  const { setPreviewing, flushSave } = useStore()
  useEffect(() => { flushSave() }, [flushSave])
  return (
    <div className="preview-mode">
      <Viewer mapId={doc.id} keepTheme />
      <div className="preview-bar">
        <span className="preview-chip"><Icon name="eye" size={14} /> Viewer preview</span>
        <button className="btn primary" onClick={() => setPreviewing(false)}><Icon name="pencil" size={14} /> Edit map</button>
      </div>
    </div>
  )
}
