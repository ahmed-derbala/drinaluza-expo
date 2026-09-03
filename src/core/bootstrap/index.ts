import { Platform } from 'react-native'
import { themeColors } from '@/core/theme'

if (typeof setImmediate === 'undefined') {
	;(globalThis as unknown as { setImmediate: (callback: (...args: unknown[]) => void) => void }).setImmediate = (callback: (...args: unknown[]) => void) => setTimeout(callback, 0)
}

if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('drinaluza-web-style')) {
	const style = document.createElement('style')
	style.id = 'drinaluza-web-style'
	style.type = 'text/css'
	style.innerHTML = `
		html, body {
			background-color: ${themeColors.background} !important;
			color-scheme: dark;
		}
		* {
			user-select: text !important;
			-webkit-user-select: text !important;
			-moz-user-select: text !important;
			-ms-user-select: text !important;
			-khtml-user-select: text !important;
		}
		button, [role="button"], [role="tab"], [role="img"] {
			user-select: none !important;
			-webkit-user-select: none !important;
			-moz-user-select: none !important;
			-ms-user-select: none !important;
		}
	`
	document.head.appendChild(style)
}
