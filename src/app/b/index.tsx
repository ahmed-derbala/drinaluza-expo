import React from 'react'
import { Redirect } from 'expo-router'

export default function RedirectBusinessAliasIndex() {
	return <Redirect href={'/businesses' as any} />
}
