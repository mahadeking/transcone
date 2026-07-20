import { useEffect, useRef } from 'react'
import { useStore } from '../../store/useStore'
import Icon from '../Icon.jsx'

export default function ContextMenu() {
  const cm = useStore((s) => s.ui.contextMenu)
  const { doc, clipboard, setUI, duplicateAnnotation, copyAnnotation, pasteAnnotation, removeAnnotation, toggleLockAnnotation, arrangeAnnotation } = useStore()
  const ref = useRef()

  useEffect(() => {
    if (!cm) return
    const close = () => setUI({ contextMenu: null })
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) close() }
    const onEsc = (e) => { if (e.key === 'Escape') close() }
    setTimeout(() => { document.addEventListener('mousedown', onDown); window.addEventListener('keydown', onEsc) })
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onEsc) }
  }, [cm, setUI])

  if (!cm) return null
  const ann = cm.annId ? doc.annotations.find((a) => a.id === cm.annId) : null
  const close = () => setUI({ contextMenu: null })
  const run = (fn) => { fn(); close() }

  // position, keeping the menu on-screen (cm.x/y are viewport coords)
  const W = 230, H = ann ? 300 : 90
  const x = Math.min(cm.x, window.innerWidth - W - 10)
  const y = Math.min(cm.y, window.innerHeight - H - 10)

  const Item = ({ icon, label, kbd, onClick, danger }) => (
    <button className={'pop-item' + (danger ? ' danger' : '')} onClick={onClick}>
      <Icon name={icon} size={15} /> <span>{label}</span> {kbd && <kbd>{kbd}</kbd>}
    </button>
  )

  return (
    <div className="popover context-menu" ref={ref} style={{ left: x, top: y }}>
      {ann ? (
        <>
          <div className="cm-coord">{cm.lngLat[1].toFixed(5)}, {cm.lngLat[0].toFixed(5)}</div>
          <div className="pop-divider" />
          <Item icon="copy" label="Duplicate" kbd="⌘D" onClick={() => run(() => duplicateAnnotation(ann.id))} />
          <Item icon="copy" label="Copy" kbd="⌘C" onClick={() => run(() => copyAnnotation(ann.id))} />
          {clipboard && <Item icon="note" label="Paste here" kbd="⌘V" onClick={() => run(() => pasteAnnotation(cm.lngLat))} />}
          <Item icon="trash" label="Delete" kbd="Del" danger onClick={() => run(() => removeAnnotation(ann.id))} />
          <div className="pop-divider" />
          <Item icon={ann.properties.__locked ? 'eye' : 'target'} label={ann.properties.__locked ? 'Unlock' : 'Lock'} onClick={() => run(() => toggleLockAnnotation(ann.id))} />
          <Item icon="layers" label="Bring to front" onClick={() => run(() => arrangeAnnotation(ann.id, 'front'))} />
          <Item icon="layers" label="Send to back" onClick={() => run(() => arrangeAnnotation(ann.id, 'back'))} />
        </>
      ) : (
        <>
          <div className="cm-coord">{cm.lngLat[1].toFixed(5)}, {cm.lngLat[0].toFixed(5)}</div>
          <div className="pop-divider" />
          {clipboard
            ? <Item icon="note" label="Paste here" kbd="⌘V" onClick={() => run(() => pasteAnnotation(cm.lngLat))} />
            : <div className="cm-empty muted">Right-click an element for more options</div>}
        </>
      )}
    </div>
  )
}
