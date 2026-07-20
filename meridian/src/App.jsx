import { useEffect } from 'react'
import { useStore } from './store/useStore'
import Dashboard from './components/dashboard/Dashboard.jsx'
import Editor from './components/editor/Editor.jsx'
import Viewer from './components/viewer/Viewer.jsx'

export default function App() {
  const route = useStore((s) => s.route)
  const init = useStore((s) => s.init)

  useEffect(() => { init() }, [init])

  // Shared/embed viewer via URL hash: #/view/<id> or ?embed
  const hash = window.location.hash
  if (hash.startsWith('#/view/')) {
    const id = hash.replace('#/view/', '')
    return <Viewer mapId={id} embed={new URLSearchParams(window.location.search).has('embed')} />
  }

  return route.name === 'editor' ? <Editor /> : <Dashboard />
}
