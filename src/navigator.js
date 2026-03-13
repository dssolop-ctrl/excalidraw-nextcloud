/**
 * Entry point for the Excalidraw Navigator page.
 * Webpack entry: navigator → js/navigator.js
 */
import Vue from 'vue'
import NavigatorApp from './NavigatorApp.vue'
import { openExcalidrawEditor } from './editor'

// Expose editor function so Vue component can call it
window.__excalidrawOpenEditor = openExcalidrawEditor

document.addEventListener('DOMContentLoaded', () => {
	const el = document.getElementById('excalidraw-navigator')
	if (!el) return

	new Vue({
		el,
		render: h => h(NavigatorApp),
	})
})
