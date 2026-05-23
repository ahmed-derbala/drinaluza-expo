import React from 'react'
import { Redirect, useLocalSearchParams } from 'expo-router'

export default function RedirectBusinessAlias() {
	const { rest } = useLocalSearchParams()

	// 'rest' is an array of path segments or a string
	const path = Array.isArray(rest) ? rest.join('/') : rest

	if (!path) {
		return <Redirect href={'/businesses' as any} />
	}

	return <Redirect href={`/businesses/${path}` as any} />
}
