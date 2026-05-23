import React from 'react'
import { Redirect } from 'expo-router'

export default function RedirectProductsAliasIndex() {
	return <Redirect href={'/products' as any} />
}
