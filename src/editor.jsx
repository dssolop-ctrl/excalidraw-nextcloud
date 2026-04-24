/**
 * Shared Excalidraw editor overlay.
 * Used by the Files page FileAction (fileaction.jsx) and the Navigator page (navigator.js).
 */

// Excalidraw reads this lazily when rendering fonts.
window.EXCALIDRAW_ASSET_PATH = '/custom_apps/excalidraw/js/'

import { useState, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import { Excalidraw, serializeAsJSON } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { getCurrentUser } from '@nextcloud/auth'

function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

function getFingerprint(elements, files) {
  const elFp = elements.map((e) => `${e.id}:${e.version}`).join(',')
  const filesFp = Object.keys(files || {}).sort().join(',')
  return `${elFp}|${filesFp}`
}

const libraryStorageKey = (userId) => `excalidraw-nc:library:${userId}`

function loadLibrary(userId) {
  try {
    const raw = localStorage.getItem(libraryStorageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('[excalidraw] failed to load library from localStorage:', err)
    return []
  }
}

function saveLibrary(userId, items) {
  try {
    localStorage.setItem(libraryStorageKey(userId), JSON.stringify(items))
  } catch (err) {
    console.error('[excalidraw] failed to save library to localStorage:', err)
  }
}

function ExcalidrawEditor({ filePath, userId, onClose }) {
  const [initialData, setInitialData] = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const webdavUrl = `/remote.php/dav/files/${encodeURIComponent(userId)}${filePath}`

  useEffect(() => {
    fetch(webdavUrl, {
      headers: { requesttoken: window.OC.requestToken },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load file (HTTP ${res.status})`)
        return res.text()
      })
      .then((text) => {
        const data = text.trim() ? JSON.parse(text) : {}
        setInitialData({
          elements: data.elements || [],
          appState: data.appState || {},
          files: data.files || {},
          libraryItems: loadLibrary(userId),
        })
        setLoading(false)
      })
      .catch((err) => {
        setLoadError(err.message)
        setLoading(false)
      })
  }, [webdavUrl])

  const save = useCallback(
    async (elements, appState, files) => {
      setSaveStatus('saving')
      try {
        const json = serializeAsJSON(elements, appState, files, 'local')
        const res = await fetch(webdavUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            requesttoken: window.OC.requestToken,
          },
          body: json,
        })
        if (!res.ok) throw new Error(`Save failed (HTTP ${res.status})`)
        setSaveStatus('saved')
      } catch (err) {
        console.error('[excalidraw] save error:', err)
        setSaveStatus('error')
      }
    },
    [webdavUrl],
  )

  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  }, [save])

  const debouncedSave = useRef(
    debounce((...args) => saveRef.current(...args), 2000),
  ).current

  const latestStateRef = useRef(null)
  const hasChangesRef = useRef(false)
  const fingerprintRef = useRef(null)

  useEffect(() => {
    if (initialData) {
      fingerprintRef.current = getFingerprint(
        initialData.elements,
        initialData.files,
      )
    }
  }, [initialData])

  const handleClose = useCallback(async () => {
    if (hasChangesRef.current && latestStateRef.current) {
      const { elements, appState, files } = latestStateRef.current
      await saveRef.current(elements, appState, files)
    }
    onClose()
  }, [onClose])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'sans-serif', fontSize: 16, color: '#666' }}>
        Loading…
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'sans-serif', gap: 12 }}>
        <p style={{ color: 'red', margin: 0 }}>Error: {loadError}</p>
        <button onClick={handleClose} style={{ padding: '6px 16px', cursor: 'pointer' }}>Close</button>
      </div>
    )
  }

  const statusLabel = { idle: '', saving: 'Saving…', saved: 'Saved', error: 'Save failed' }[saveStatus]
  const statusColor = saveStatus === 'error'
    ? 'var(--color-danger, #db6965)'
    : saveStatus === 'saved'
      ? 'var(--color-success-contrast, #65bb6a)'
      : 'var(--text-primary-color, #888)'

  return (
    <Excalidraw
      initialData={initialData}
      onChange={(elements, appState, files) => {
        const fp = getFingerprint(elements, files)
        if (fp === fingerprintRef.current) return
        fingerprintRef.current = fp
        latestStateRef.current = { elements, appState, files }
        hasChangesRef.current = true
        debouncedSave(elements, appState, files)
      }}
      onLibraryChange={(items) => saveLibrary(userId, items)}
      UIOptions={{
        canvasActions: { saveToActiveFile: false, loadScene: false, export: false },
      }}
      renderTopRightUI={() => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
          {statusLabel && (
            <span style={{ fontSize: 13, color: statusColor, fontFamily: 'inherit' }}>
              {statusLabel}
            </span>
          )}
          <button
            onClick={handleClose}
            style={{
              padding: '4px 12px', cursor: 'pointer',
              background: 'var(--button-bg, var(--island-bg-color))',
              border: '1px solid var(--default-border-color)',
              borderRadius: 4, fontSize: 13, lineHeight: '1.4',
              color: 'var(--text-primary-color)', fontFamily: 'inherit',
            }}
          >
            Close
          </button>
        </div>
      )}
    />
  )
}

/**
 * Opens a full-screen Excalidraw editor overlay.
 * @param {string} filePath - path relative to user root (e.g. /Excalidraw/test.excalidraw)
 * @param {object} [opts]
 * @param {function} [opts.onClose] - called after the editor overlay is torn down
 * @returns {{ close: function } | null}
 */
export function openExcalidrawEditor(filePath, opts = {}) {
  const user = getCurrentUser()
  if (!user) {
    console.error('[excalidraw] could not get current user')
    return null
  }

  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#fff;display:flex;flex-direction:column;'
  overlay.tabIndex = -1
  document.body.appendChild(overlay)
  overlay.focus()

  const styleEl = document.createElement('style')
  styleEl.textContent = `
    .excalidraw { --color-selection: #4dabf7 !important; }
    .excalidraw-modal-container { z-index: 10000 !important; }
    .excalidraw-wysiwyg { border: none !important; outline: none !important; box-shadow: none !important; background: transparent !important; border-radius: 0 !important; padding: 0 !important; margin: 0 !important; }
  `
  document.head.appendChild(styleEl)

  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    window.removeEventListener('popstate', onPopState)
    root.unmount()
    overlay.remove()
    styleEl.remove()
    if (opts.onClose) opts.onClose()
  }

  const onPopState = () => close()
  window.addEventListener('popstate', onPopState)

  const root = ReactDOM.createRoot(overlay)
  root.render(
    <ExcalidrawEditor
      filePath={filePath}
      userId={user.uid}
      onClose={close}
    />,
  )

  return { close }
}
