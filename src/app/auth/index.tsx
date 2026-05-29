import React from 'react'
import { Stack } from 'expo-router'
import AuthScreen from '@/features/auth/AuthScreen'

export default function AuthIndex() {
	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<AuthScreen />
		</>
	)
}
