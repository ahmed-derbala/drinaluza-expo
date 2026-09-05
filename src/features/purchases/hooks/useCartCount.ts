import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { getItem } from '@storage'

export function useCartCount() {
	const [count, setCount] = useState(0)

	const refresh = useCallback(async () => {
		const cart = (await getItem<any[]>('cart')) || []
		setCount(cart.length)
	}, [])

	useEffect(() => {
		refresh()
	}, [refresh])

	useFocusEffect(
		useCallback(() => {
			refresh()
		}, [refresh])
	)

	return count
}
