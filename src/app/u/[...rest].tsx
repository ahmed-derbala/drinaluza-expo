import React from 'react'
import { Redirect, useLocalSearchParams } from 'expo-router'

export default function RedirectUserAlias() {
	const { rest } = useLocalSearchParams()

	// 'rest' is an array of path segments or a string
	const path = Array.isArray(rest) ? rest.join('/') : rest

	if (!path) {
		return <Redirect href={'/users' as any} />
	}

	return <Redirect href={`/users/${path}` as any} />
}
