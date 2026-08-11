import { openDB } from 'idb'

const DB_NAME = 'orgoprep-db'
const DB_VERSION = 1

let dbPromise = null

function getDb() {
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
    })
  }
  return dbPromise
}

export async function getProgress(id) {
  const db = await getDb()
  return db.get('progress', id)
}

export async function putProgress(entry) {
  const db = await getDb()
  return db.put('progress', entry)
}

export async function getAllProgress() {
  const db = await getDb()
  return db.getAll('progress')
}

export async function getProgressByMode(mode) {
  const db = await getDb()
  return db.getAllFromIndex('progress', 'by-mode', mode)
}

export async function deleteProgress(id) {
  const db = await getDb()
  return db.delete('progress', id)
}

export async function logSession(entry) {
  const db = await getDb()
  return db.add('sessionLog', entry)
}

export async function deleteSessionLog(id) {
  const db = await getDb()
  return db.delete('sessionLog', id)
}

export async function getAllSessionLog() {
  const db = await getDb()
  return db.getAll('sessionLog')
}
