import { useStore } from '../../store/useStore'
import Icon from '../Icon.jsx'
import { mapRef } from '../../lib/mapRef'

export default function CommentsPanel() {
  const { doc, ui, setUI, placingComment, setPlacingComment, updateComment, removeComment } = useStore()
  const comments = doc.comments || []
  const active = comments.filter((c) => !c.resolved)
  const resolved = comments.filter((c) => c.resolved)

  const flyTo = (c) => { mapRef.current?.flyTo({ center: c.lngLat, zoom: Math.max(mapRef.current.getZoom(), 14), duration: 700 }); setUI({ activeComment: c.id }) }

  return (
    <aside className="comments-panel">
      <div className="cp-head">
        <div className="cp-title"><Icon name="comment" size={16} /> Comments</div>
        <button className="btn icon sm ghost" onClick={() => setUI({ commentsOpen: false })}><Icon name="close" size={16} /></button>
      </div>

      <button className={'cp-add' + (placingComment ? ' active' : '')} onClick={() => setPlacingComment(!placingComment)}>
        <Icon name="plus" size={15} /> {placingComment ? 'Click the map to place…' : 'Add a comment'}
      </button>

      <div className="cp-list">
        {comments.length === 0 && <div className="cp-empty muted">No comments yet. Drop one anywhere on the map to start a discussion.</div>}
        {active.map((c) => <CommentCard key={c.id} c={c} active={ui.activeComment === c.id} onFly={() => flyTo(c)} onChange={(patch) => updateComment(c.id, patch)} onRemove={() => removeComment(c.id)} />)}
        {resolved.length > 0 && <div className="cp-section muted">Resolved · {resolved.length}</div>}
        {resolved.map((c) => <CommentCard key={c.id} c={c} resolved active={ui.activeComment === c.id} onFly={() => flyTo(c)} onChange={(patch) => updateComment(c.id, patch)} onRemove={() => removeComment(c.id)} />)}
      </div>
    </aside>
  )
}

function CommentCard({ c, active, resolved, onFly, onChange, onRemove }) {
  return (
    <div className={'comment-card' + (active ? ' active' : '') + (resolved ? ' resolved' : '')}>
      <div className="cc-head" onClick={onFly}>
        <span className="avatar sm" style={{ background: c.color }}>{(c.author || '?')[0]}</span>
        <span className="cc-author">{c.author}</span>
        <span className="cc-time muted">{timeAgo(c.createdAt)}</span>
      </div>
      <textarea className="cc-text" value={c.text} autoFocus={active && !c.text} placeholder="Write a comment…" onChange={(e) => onChange({ text: e.target.value })} />
      <div className="cc-actions">
        <button className="btn sm ghost" onClick={() => onChange({ resolved: !resolved })}><Icon name="check" size={14} /> {resolved ? 'Reopen' : 'Resolve'}</button>
        <button className="btn icon sm ghost" onClick={onFly} title="Zoom to"><Icon name="target" size={14} /></button>
        <button className="btn icon sm ghost" onClick={onRemove} title="Delete"><Icon name="trash" size={14} /></button>
      </div>
    </div>
  )
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}
