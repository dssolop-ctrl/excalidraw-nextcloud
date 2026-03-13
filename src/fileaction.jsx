// File action handler for .excalidraw files in the Nextcloud Files app.
// The actual editor is in editor.jsx (shared with the Navigator page).

import { openExcalidrawEditor } from './editor'
import { registerFileAction, FileAction } from '@nextcloud/files'

registerFileAction(
  new FileAction({
    id: 'excalidraw-open',
    displayName: () => 'Edit with Excalidraw',
    iconSvgInline: () =>
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
    enabled: (files) =>
      files.length === 1 && files[0].basename.endsWith('.excalidraw'),
    async exec(file) {
      const dir = file.dirname || '/'
      const fileUrl = file.fileid
        ? `/apps/files/files/${file.fileid}?dir=${encodeURIComponent(dir)}&openfile=true`
        : null
      const cleanUrl = file.fileid
        ? `/apps/files/files/${file.fileid}?dir=${encodeURIComponent(dir)}`
        : null

      history.pushState({ excalidrawOpen: true }, '', fileUrl)

      openExcalidrawEditor(file.path, {
        onClose: () => {
          if (cleanUrl) history.replaceState({}, '', cleanUrl)
        },
      })
      return null
    },
    default: 'default',
  }),
)
