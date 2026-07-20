// Minimal inline icon set (stroke-based, 24px grid).
const paths = {
  compass: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4 6-2.5 5.5L8 16l2.5-5.5L16 8Z',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM21 21l-4.3-4.3',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',
  layers: 'M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 16.5l9 5 9-5',
  database: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3ZM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.5-2-3.5-2.4 1a7.3 7.3 0 0 0-2.2-1.3L14 2h-4l-.6 2.6A7.3 7.3 0 0 0 7.2 6l-2.4-1-2 3.5 2 1.5a7.4 7.4 0 0 0 0 2.6l-2 1.5 2 3.5 2.4-1c.7.5 1.4 1 2.2 1.3L10 22h4l.6-2.6c.8-.3 1.5-.8 2.2-1.3l2.4 1 2-3.5-2-1.5c.1-.4.1-.9.1-1.3Z',
  users: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 21v-1a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v1',
  share: 'M15 8a3 3 0 1 0-2.8-4H12a3 3 0 0 0 .1 2L8.8 8A3 3 0 1 0 9 12l3.3 2a3 3 0 1 0 .8-1.7L9.9 10.4a3 3 0 0 0 0-.8L13 7.6c.5.3 1.1.4 2 .4Z',
  comment: 'M4 5h16v11H9l-4 4V5Z',
  upload: 'M12 16V4m0 0-4 4m4-4 4 4M4 20h16',
  download: 'M12 4v12m0 0 4-4m-4 4-4-4M4 20h16',
  table: 'M4 5h16v14H4V5Zm0 5h16M4 15h16M10 5v14',
  pin: 'M12 22s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  line: 'M4 20 20 4M6 20a2 2 0 1 1 0-.1M20 6a2 2 0 1 1 0-.1',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-2 0h-3a4 4 0 0 0-4 4v0a4 4 0 0 1-4 4H6',
  polygon: 'M12 3 21 9v6l-9 6-9-6V9l9-6Z',
  rectangle: 'M4 6h16v12H4z',
  circle: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z',
  text: 'M6 5h12M12 5v14M9 19h6',
  note: 'M5 4h14v11l-5 5H5V4Zm9 16v-5h5',
  link: 'M9 15l6-6M8 13l-2 2a3 3 0 0 0 4 4l2-2M16 11l2-2a3 3 0 0 0-4-4l-2 2',
  video: 'M4 6h11v12H4zM15 10l5-3v10l-5-3',
  highlighter: 'M4 20h4l10-10-4-4L4 16v4ZM14 6l4 4',
  marker: 'M4 20l7-2 9-9-5-5-9 9-2 7Z',
  extract: 'M6 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm2-6h11M8 16h11',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6l1-8Z',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  close: 'M6 6l12 12M18 6 6 18',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  eyeOff: 'M4 4l16 16M9.9 5.2A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.8M6 7.5A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 3-.5',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  copy: 'M8 8h11v11H8zM5 16H4V4h12v1',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
  target: 'M12 3v3m0 12v3M3 12h3m12 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-5v2m0 16v2M4 4l1.5 1.5M18.5 18.5 20 20M2 12h2m16 0h2M4 20l1.5-1.5M18.5 5.5 20 4',
  moon: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10Z',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c-3 3-3 15 0 18m0-18c3 3 3 15 0 18M3 12h18',
  folder: 'M3 7h6l2 2h10v10H3V7Z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  drag: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z',
  check: 'M5 12l4.5 4.5L19 7',
  ruler: 'M4 16 16 4l4 4L8 20l-4-4Zm3-1 1.5 1.5M10 12l1.5 1.5M13 9l1.5 1.5',
  pencil: 'M4 20h4L19 9l-4-4L4 16v4Zm10-14 4 4',
  book: 'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5Zm2 13h13M9 3v13',
  analysis: 'M9 8a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6 0a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z',
  code: 'M8 8l-4 4 4 4M16 8l4 4-4 4M13 5l-2 14',
  undo: 'M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 12h-2',
  redo: 'M15 7l5 5-5 5M20 12H10a6 6 0 0 0 0 12h2',
}

export default function Icon({ name, size = 18, stroke = 1.7, fill = 'none', style, className }) {
  const d = paths[name]
  if (!d) return null
  const solid = ['pin', 'polygon', 'bolt', 'marker', 'sparkle'].includes(name) && fill === 'solid'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={solid ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={style} className={className} aria-hidden>
      <path d={d} />
    </svg>
  )
}
