import { get, set, del, keys } from 'idb-keyval'

const MAP_KEY = (id) => `meridian:map:${id}`
const INDEX_KEY = 'meridian:index'

export async function loadIndex() {
  return (await get(INDEX_KEY)) || []
}
export async function saveIndex(index) {
  await set(INDEX_KEY, index)
}
export async function loadMap(id) {
  return await get(MAP_KEY(id))
}
export async function saveMap(doc) {
  await set(MAP_KEY(doc.id), doc)
}
export async function deleteMap(id) {
  await del(MAP_KEY(id))
  const idx = (await loadIndex()).filter((m) => m.id !== id)
  await saveIndex(idx)
}
export async function allMapKeys() {
  return (await keys()).filter((k) => typeof k === 'string' && k.startsWith('meridian:map:'))
}
