// IndexedDB 離線資料庫：儲存 B 工作人員的本機編輯（keyPath = date）。
// 注意：資料存在瀏覽器本機，不會跨裝置同步；匯出 CSV 後交由 A 校正。

const DB_NAME = 'tao-calendar'
const STORE = 'edits'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'date' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx(mode, fn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const result = fn(t.objectStore(STORE))
    t.oncomplete = () => { db.close(); resolve(result.result ?? result) }
    t.onerror = () => { db.close(); reject(t.error) }
  })
}

export async function getAllEdits() {
  const rows = await tx('readonly', (store) => store.getAll())
  return Object.fromEntries(rows.map((r) => [r.date, r]))
}

export function putEdit(edit) {
  return tx('readwrite', (store) => store.put(edit))
}

export function deleteEdit(date) {
  return tx('readwrite', (store) => store.delete(date))
}
