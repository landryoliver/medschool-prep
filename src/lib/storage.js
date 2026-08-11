const KEYS = {
  apiKey: 'orgoprep.apiKey',
  theme: 'orgoprep.theme',
  lastMode: 'orgoprep.lastMode',
}

export function getApiKey() {
  return localStorage.getItem(KEYS.apiKey) || ''
}

export function setApiKey(key) {
  if (!key) {
    localStorage.removeItem(KEYS.apiKey)
    return
  }
  localStorage.setItem(KEYS.apiKey, key)
}

export function getLastMode() {
  return localStorage.getItem(KEYS.lastMode) || null
}

export function setLastMode(modeId) {
  localStorage.setItem(KEYS.lastMode, modeId)
}
