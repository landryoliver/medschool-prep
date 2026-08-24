import { openDB } from 'idb'

const DB_NAME = 'orgoprep-db'
const DB_VERSION = 1

let dbPromise = null
let unavailable = false

/**
 * IndexedDB can be genuinely unavailable — Safari private browsing, a
 * storage quota refusal, or a corrupted database. Previously every read
 * rejected in that case, and since the topic list only had a `.then`, the
 * cards sat on "…" forever with no explanation.
 *
 * Failing soft instead: reads return empty, writes are dropped, and the
 * app remains usable for studying. Progress is lost, which is bad, but a
 * silently frozen screen is worse.
 */
function getDb() {
  if (unavailable) return Promise.resolve(null)
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const progress = db.createObjectStore('progress', { keyPath: 'id' })
        progress.createIndex('by-mode', 'mode')
        progress.createIndex('by-topic', 'topic')
        progress.createIndex('by-nextDueAt', 'nextDueAt')

        const sessionLog = db.createObjectStore('sessionLog', {
          keyPath: 'id',
          autoIncrement: true,
        })
        sessionLog.createIndex('by-mode', 'mode')
        sessionLog.createIndex('by-topic', 'topic')
        sessionLog.createIndex('by-timestamp', 'timestamp')
      },
      blocked() {
        console.warn('orgoprep: database upgrade blocked by another open tab')
      },
      terminated() {
        // The browser closed the connection unexpectedly; reopen on next use.
        dbPromise = null
      },
    }).catch((err) => {
      console.warn('orgoprep: IndexedDB unavailable, progress will not be saved —', err?.message)
      unavailable = true
      return null
    })
  }
  return dbPromise
}

export const storageAvailable = () => !unavailable

export async function getProgress(id) {
  const db = await getDb()
  return db ? db.get('progress', id) : undefined
}

export async function putProgress(entry) {
  const db = await getDb()
  return db ? db.put('progress', entry) : undefined
}

export async function getAllProgress() {
  const db = await getDb()
  return db ? db.getAll('progress') : []
}

export async function getProgressByMode(mode) {
  const db = await getDb()
  return db ? db.getAllFromIndex('progress', 'by-mode', mode) : []
}

export async function deleteProgress(id) {
  const db = await getDb()
  return db ? db.delete('progress', id) : undefined
}

export async function logSession(entry) {
  const db = await getDb()
  return db ? db.add('sessionLog', entry) : undefined
}

export async function deleteSessionLog(id) {
  const db = await getDb()
  return db ? db.delete('sessionLog', id) : undefined
}

export async function getAllSessionLog() {
  const db = await getDb()
  return db ? db.getAll('sessionLog') : []
}

/**
 * Everything needed to rebuild progress on another device, or after the
 * browser evicts storage. iOS has historically cleared site data for
 * installed web apps after periods of disuse, which would silently erase
 * months of study history with no way back.
 */
export async function exportProgress() {
  const [progress, sessionLog] = await Promise.all([getAllProgress(), getAllSessionLog()])
  return {
    format: 'orgoprep-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    progress,
    sessionLog,
    streak: localStorage.getItem('orgoprep.streak'),
  }
}

/** Merge a backup in, keeping whichever record was seen most recently. */
export async function importProgress(backup) {
  // The format string stays 'orgoprep-backup' even though the app is now
  // called MedLadder. It is written into every backup file already exported,
  // and renaming it would make the app reject its own past backups.
  if (backup?.format !== 'orgoprep-backup') throw new Error('Not a MedLadder backup file')
  const db = await getDb()
  if (!db) throw new Error('Storage is unavailable, so the backup cannot be restored')

  const existing = new Map((await getAllProgress()).map((r) => [r.id, r]))
  let restored = 0
  for (const row of backup.progress ?? []) {
    const prev = existing.get(row.id)
    // Keep the more recently practised version rather than clobbering.
    if (!prev || (row.lastSeenAt ?? 0) > (prev.lastSeenAt ?? 0)) {
      await db.put('progress', row)
      restored++
    }
  }

  // Session log rows are append-only history; add any that are new.
  const seen = new Set((await getAllSessionLog()).map((r) => `${r.timestamp}:${r.topic}`))
  let logs = 0
  for (const row of backup.sessionLog ?? []) {
    if (seen.has(`${row.timestamp}:${row.topic}`)) continue
    const { id, ...rest } = row
    await db.add('sessionLog', rest)
    logs++
  }

  if (backup.streak) localStorage.setItem('orgoprep.streak', backup.streak)
  return { restored, logs }
}
