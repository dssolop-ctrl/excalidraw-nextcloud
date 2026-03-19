// File action handler for .excalidraw files in the Nextcloud Files app.
// The actual editor is in editor.jsx (shared with the Navigator page).

import { openExcalidrawEditor } from './editor'
import { registerFileAction, FileAction, addNewFileMenuEntry, NewMenuEntryCategory } from '@nextcloud/files'
import axios from '@nextcloud/axios'

const appIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M23.9428 19.8058a0.1962 0.1962 0 0 0 -0.1679 -0.0337c-1.26 -1.8552 -2.8727 -3.6104 -4.4186 -5.3152l-0.2521 -0.284c-0.0016 -0.0732 -0.0667 -0.1207 -0.1342 -0.1504 -0.0284 -0.0277 -0.0562 -0.0558 -0.0843 -0.0837 -0.0505 -0.1005 -0.1685 -0.1673 -0.2858 -0.1005 -0.4706 0.2347 -0.9068 0.5855 -1.3274 0.9195 -0.5536 0.4345 -1.1085 0.8695 -1.6296 1.354a5.0577 5.0577 0 0 0 -0.5879 0.6185c-0.0842 0.1168 -0.0168 0.2172 0.0843 0.2672 -0.3701 0.3677 -0.7402 0.736 -1.109 1.1198a0.1896 0.1896 0 0 0 -0.0506 0.1342c0 0.05 0.0337 0.1 0.0668 0.1168l0.6559 0.5012v0.0169c0.9237 0.9194 2.5538 2.1729 4.2844 3.5268 0.2515 0.201 0.5205 0.4014 0.7727 0.6017 0.1173 0.1342 0.2346 0.2847 0.3357 0.4182 0.0506 0.0662 0.1685 0.0837 0.2353 0.0331 0.0337 0.0337 0.0843 0.0668 0.118 0.1005a0.2395 0.2395 0 0 0 0.1004 0.0337 0.1534 0.1534 0 0 0 0.1348 -0.0668 0.2371 0.2371 0 0 0 0.0331 -0.1004c0.0175 0 0.0169 0.0168 0.0337 0.0168a0.1915 0.1915 0 0 0 0.1348 -0.0505l3.058 -3.3265c0.1198 -0.1159 0.0135 -0.2668 -0.0005 -0.2672zM0.5885 3.4751c0.0331 0.2172 0.0843 0.4344 0.1174 0.6354 0.2015 1.103 0.4031 2.1061 0.7726 2.8583l0.1516 0.568c0.0506 0.2173 0.1342 0.485 0.2185 0.5519 0.8568 0.7521 2.1674 1.8714 3.5785 2.9419a0.1775 0.1775 0 0 0 0.2185 0s0 0.0162 0.0168 0.0162a0.1528 0.1528 0 0 0 0.118 0.0506 0.1912 0.1912 0 0 0 0.1341 -0.0506c1.798 -1.9887 3.1418 -3.6267 4.0997 -4.9974 0.0674 -0.0668 0.0843 -0.1673 0.0843 -0.251 0.0668 -0.0668 0.1173 -0.1504 0.1847 -0.2004 0.0668 -0.0668 0.0668 -0.184 0 -0.2346l-0.0168 -0.0163c0 -0.033 -0.0169 -0.0836 -0.0506 -0.1005 -0.42 -0.4007 -0.722 -0.6848 -1.0416 -0.9856A93.5546 93.5546 0 0 1 6.822 1.9876c-0.0169 -0.0169 -0.0337 -0.0337 -0.0674 -0.0337 -0.3358 -0.1168 -1.0248 -0.2341 -1.8817 -0.3845C3.596 1.3527 1.865 1.0519 0.3027 0.583c0 0 -0.1011 0 -0.118 0.0169L0.1348 0.6505C0.0498 0.7139 0.0222 0.7058 0 0.7167c0.017 0.1005 0.017 0.1673 0.0506 0.2846 0 0.0331 0.0673 0.3009 0.0673 0.334zM23.6738 0.8172c0.0169 -0.0662 -0.3358 -0.367 -0.2184 -0.3845 0.2527 -0.0163 0.2527 -0.4008 0 -0.4008 -0.3358 0.0169 -0.6884 0.0999 -1.008 0.1504 -0.5878 0.1168 -1.1926 0.2341 -1.781 0.3671 -1.327 0.2846 -2.6375 0.5855 -3.9481 0.937 -0.4032 0.1167 -0.857 0.2003 -1.2432 0.4007 -0.1348 0.0668 -0.118 0.2004 -0.0506 0.284 -0.0337 0.0169 -0.0505 0.0169 -0.0842 0.0337 -0.1174 0.0169 -0.2185 0.0337 -0.3358 0.05 -0.1011 0.0168 -0.1516 0.1004 -0.1348 0.201 0 0.0162 0.0169 0.0499 0.0169 0.0661 -0.7059 0.9363 -1.4954 1.9226 -2.3523 2.9757 -0.84 0.9694 -1.7306 1.9893 -2.6212 3.0424 -2.8396 3.3096 -6.0487 7.0705 -9.5936 10.38a0.1613 0.1613 0 0 0 0 0.2341c0.0169 0.0163 0.0337 0.0331 0.0506 0.0331 -0.0506 0.0506 -0.1011 0.0843 -0.1517 0.1336 -0.0337 0.0337 -0.0505 0.0668 -0.0505 0.1005a0.364 0.364 0 0 0 -0.0668 0.0837c-0.0674 0.0667 -0.0674 0.1835 0.0169 0.234 0.0667 0.0662 0.1847 0.0662 0.2346 -0.0168 0.0175 -0.0169 0.0175 -0.0337 0.0337 -0.0337a0.2648 0.2648 0 0 1 0.3701 0c0.2016 0.2178 0.4032 0.435 0.588 0.6186l-0.4201 -0.3508c-0.0674 -0.0668 -0.1847 -0.05 -0.2347 0.0168 -0.068 0.0662 -0.0511 0.1835 0.0163 0.234l4.4691 3.7273c0.0337 0.0337 0.0674 0.0337 0.118 0.0337 0.0505 0 0.0842 -0.0169 0.1173 -0.0506l0.101 -0.0999c0.017 0.0163 0.05 0.0163 0.0669 0.0163 0.0505 0 0.0842 -0.0163 0.118 -0.05 6.0486 -6.0505 10.9216 -10.6141 16.4997 -14.6927 0.05 -0.0331 0.0668 -0.1 0.0668 -0.1505 0.0674 0 0.118 -0.05 0.151 -0.1167 1.0254 -3.1255 1.227 -5.9007 1.2938 -7.2709 0 -0.0579 0.0169 -0.0371 0.0169 -0.0668 0.0168 -0.0337 0.0168 -0.0505 0.0168 -0.0505a0.9784 0.9784 0 0 0 -0.0668 -0.6186z"/></svg>'

// ── File action: open .excalidraw files ──
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

// ── New file menu: "Новый холст" ──
const emptyScene = JSON.stringify({
  type: 'excalidraw',
  version: 2,
  source: 'excalidraw-nextcloud',
  elements: [],
  appState: { gridSize: null },
  files: {},
})

// Register "Новый холст" in Files app "+" menu
addNewFileMenuEntry({
  id: 'excalidraw-new-canvas',
  displayName: 'Новый холст',
  iconSvgInline: appIcon,
  category: NewMenuEntryCategory.CreateNew,
  enabled: () => true,
  order: 30,
  async handler(context, content) {
    const existingNames = content.map(n => n.basename)
    let name = 'Новый холст.excalidraw'
    let counter = 1
    while (existingNames.includes(name)) {
      name = `Новый холст (${counter}).excalidraw`
      counter++
    }

    const uid = window.OC?.currentUser || document.head.querySelector('[data-user]')?.dataset?.user
    const dirPath = context.path || '/'
    const davPath = `/remote.php/dav/files/${uid}${dirPath}/${name}`

    try {
      await axios.put(davPath, emptyScene, {
        headers: { 'Content-Type': 'application/json' },
      })
      window.location.reload()
    } catch (err) {
      console.error('[excalidraw] Failed to create new canvas:', err)
    }
  },
})
