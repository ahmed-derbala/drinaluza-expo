export const hexToRgba = (hex: string, alpha: number): string => {
	if (!hex) return `rgba(0, 0, 0, ${alpha})`
	if (!hex.startsWith('#')) return `rgba(128, 128, 128, ${alpha})`

	const c = hex.slice(1)
	const expand = (ch: string) => ch + ch

	if (c.length === 3 || c.length === 4) {
		const r = parseInt(expand(c[0]), 16)
		const g = parseInt(expand(c[1]), 16)
		const b = parseInt(expand(c[2]), 16)
		return `rgba(${r}, ${g}, ${b}, ${alpha})`
	}

	if (c.length === 6 || c.length === 8) {
		const r = parseInt(c.substring(0, 2), 16)
		const g = parseInt(c.substring(2, 4), 16)
		const b = parseInt(c.substring(4, 6), 16)
		return `rgba(${r}, ${g}, ${b}, ${alpha})`
	}

	return `rgba(128, 128, 128, ${alpha})`
}
