/**
 * Entry point for the public share Excalidraw viewer.
 * Webpack entry: public → js/public.js
 *
 * Uses React directly (same as fileaction.jsx) since the
 * Excalidraw component is React-based. No Vue needed here.
 */

window.EXCALIDRAW_ASSET_PATH = '/custom_apps/excalidraw/js/'

import ReactDOM from 'react-dom/client'
import React, { useState, useEffect, useRef } from 'react'
import { Excalidraw, exportToBlob, exportToSvg } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

function downloadBlob(blob, filename) {
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}

function PublicViewer({ token, fileName }) {
	const [data, setData] = useState(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)
	const apiRef = useRef(null)

	const displayName = fileName.replace(/\.excalidraw$/i, '')

	useEffect(() => {
		// Detect base path (handles /index.php/s/{token} or /s/{token})
		const basePath = window.location.pathname.replace(/\/s\/.*$/, '')
		fetch(`${basePath}/s/${token}/download`)
			.then(res => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				return res.text()
			})
			.then(text => {
				const parsed = JSON.parse(text)
				setData(parsed)
				setLoading(false)
			})
			.catch(err => {
				setError(err.message)
				setLoading(false)
			})
	}, [token])

	const handleExportPNG = async () => {
		if (!apiRef.current) return
		try {
			const elements = apiRef.current.getSceneElements()
			const appState = apiRef.current.getAppState()
			const files = apiRef.current.getFiles()
			const blob = await exportToBlob({
				elements,
				appState: { ...appState, exportWithDarkMode: false, exportBackground: true },
				files,
				mimeType: 'image/png',
			})
			downloadBlob(blob, displayName + '.png')
		} catch (e) {
			console.error('[excalidraw] PNG export failed:', e)
		}
	}

	const handleExportSVG = async () => {
		if (!apiRef.current) return
		try {
			const elements = apiRef.current.getSceneElements()
			const appState = apiRef.current.getAppState()
			const files = apiRef.current.getFiles()
			const svg = await exportToSvg({
				elements,
				appState: { ...appState, exportWithDarkMode: false, exportBackground: true },
				files,
			})
			const svgString = new XMLSerializer().serializeToString(svg)
			downloadBlob(new Blob([svgString], { type: 'image/svg+xml' }), displayName + '.svg')
		} catch (e) {
			console.error('[excalidraw] SVG export failed:', e)
		}
	}

	if (loading) {
		return (
			<div style={{
				display: 'flex', alignItems: 'center', justifyContent: 'center',
				height: '100vh', fontFamily: 'sans-serif', fontSize: 16, color: '#666',
			}}>
				Loading…
			</div>
		)
	}

	if (error) {
		return (
			<div style={{
				display: 'flex', flexDirection: 'column', alignItems: 'center',
				justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', gap: 12,
			}}>
				<p style={{ color: 'red', margin: 0 }}>Failed to load: {error}</p>
				<p style={{ color: '#666', margin: 0 }}>The share may have expired or been removed.</p>
			</div>
		)
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
			{/* Toolbar */}
			<div style={{
				display: 'flex', alignItems: 'center', justifyContent: 'space-between',
				padding: '8px 16px', borderBottom: '1px solid #e0e0e0',
				background: '#fff', minHeight: 52, zIndex: 10,
			}}>
				<h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, fontFamily: 'sans-serif' }}>
					{displayName}
				</h1>
				<div style={{ display: 'flex', gap: 8 }}>
					<button onClick={handleExportPNG} style={btnStyle}>Export PNG</button>
					<button onClick={handleExportSVG} style={btnStyle}>Export SVG</button>
				</div>
			</div>

			{/* Excalidraw canvas */}
			<div style={{ flex: 1, position: 'relative' }}>
				<Excalidraw
					initialData={{
						elements: data.elements || [],
						appState: { ...(data.appState || {}), viewModeEnabled: true },
						files: data.files || {},
					}}
					viewModeEnabled={true}
					zenModeEnabled={false}
					gridModeEnabled={false}
					UIOptions={{
						canvasActions: {
							changeViewBackgroundColor: false,
							clearCanvas: false,
							export: false,
							loadScene: false,
							saveToActiveFile: false,
							toggleTheme: true,
						},
					}}
					excalidrawAPI={api => { apiRef.current = api }}
				/>
			</div>
		</div>
	)
}

const btnStyle = {
	padding: '6px 14px',
	cursor: 'pointer',
	background: '#f5f5f5',
	border: '1px solid #d0d0d0',
	borderRadius: 6,
	fontSize: 13,
	fontFamily: 'sans-serif',
	color: '#333',
}

// Mount
document.addEventListener('DOMContentLoaded', () => {
	const el = document.getElementById('excalidraw-public')
	if (!el) return

	const token = el.dataset.token
	const fileName = el.dataset.filename || 'Excalidraw'

	const styleEl = document.createElement('style')
	styleEl.textContent = `
		/* Hide NC header and registration footer */
		#header { display: none !important; }
		footer, .footer, #footer,
		.guest-box + *,
		.body-login-container > :last-child:not(.guest-box),
		#body-public .v-dialog__content,
		.public-auth-prompt,
		p.info, .warning-info,
		#nojavascript,
		.push-bottom { display: none !important; }

		/* Make content area full-screen */
		html, body { overflow: hidden !important; height: 100vh !important; margin: 0 !important; padding: 0 !important; }
		#content { padding: 0 !important; margin: 0 !important; width: 100% !important;
			max-width: 100% !important; min-height: 100vh !important; position: fixed !important;
			top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; }
		#content-wrapper { padding: 0 !important; width: 100% !important; max-width: 100% !important;
			height: 100vh !important; }
		.guest-box { max-width: 100% !important; width: 100% !important; margin: 0 !important;
			padding: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
		#excalidraw-public { width: 100% !important; height: 100vh !important; position: relative !important; }
		.body-login-container, #body-public { width: 100% !important; max-width: 100% !important;
			margin: 0 !important; padding: 0 !important; display: block !important; }

		/* Excalidraw textarea fix */
		.excalidraw-wysiwyg { border: none !important; outline: none !important;
			box-shadow: none !important; background: transparent !important; }
	`
	document.head.appendChild(styleEl)

	const root = ReactDOM.createRoot(el)
	root.render(<PublicViewer token={token} fileName={fileName} />)
})
