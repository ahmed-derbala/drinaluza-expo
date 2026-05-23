import React from 'react'
import { Redirect, useLocalSearchParams } from 'expo-router'

export default function RedirectProductAlias() {
	const { rest } = useLocalSearchParams()

	// 'rest' is an array of path segments or a string
	const path = Array.isArray(rest) ? rest.join('/') : rest

	if (!path) {
		return <Redirect href={'/products' as any} />
	}

	return <Redirect href={`/products/${path}` as any} />
}
