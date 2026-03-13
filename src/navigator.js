/**
 * Entry point for the Excalidraw Navigator page.
 * Webpack entry: navigator → js/navigator.js
 */
import Vue from 'vue'
import NavigatorApp from './NavigatorApp.vue'

document.addEventListener('DOMContentLoaded', () => {
	const el = document.getElementById('excalidraw-navigator')
	if (!el) return

	new Vue({
		el,
		render: h => h(NavigatorApp),
	})
})
