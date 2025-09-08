import { NativeStackNavigationProp } from '@react-navigation/native-stack'

export type RootStackParamList = {
	'home/shops/index': undefined
	'home/shops/[shopId]/products': {
		shopId: string
		shopName: string
	}
}

declare global {
	namespace ReactNavigation {
		interface RootParamList extends RootStackParamList {}
	}
}

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>
