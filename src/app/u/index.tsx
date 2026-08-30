import { Redirect } from 'expo-router'

export default function RedirectUserAliasIndex() {
	return <Redirect href={'/users' as any} />
}
