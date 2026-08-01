import React from 'react'
import { View, Text, Platform } from 'react-native'
import { useTheme } from '@/core/theme'

interface HeaderTitleProps {
	title?: React.ReactNode
	subtitle?: string
}

const HeaderTitle: React.FC<HeaderTitleProps> = ({ title, subtitle }) => {
	if (!title && !subtitle) {
		return null
	}

	if (React.isValidElement(title)) {
		return title
	}

	const { colors } = useTheme()
	const titleLineHeight = Platform.OS === 'ios' ? 22 : 24

	return (
		<View style={{ flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
			{/* Title Wrapper */}
			<View style={{ height: titleLineHeight, justifyContent: 'center' }}>
				<Text
					style={{
						fontSize: Platform.OS === 'ios' ? 17 : 18,
						fontWeight: Platform.OS === 'ios' ? '600' : '700',
						lineHeight: titleLineHeight,
						color: colors.text
					}}
					numberOfLines={1}
					ellipsizeMode="tail"
				>
					{title}
				</Text>
			</View>

			{/* Subtitle Wrapper */}
			{subtitle ? (
				<View style={{ height: 16, marginTop: 2, justifyContent: 'center' }}>
					<Text
						style={{
							fontSize: 12,
							marginTop: 2,
							lineHeight: 16,
							color: colors.textSecondary
						}}
						numberOfLines={1}
						ellipsizeMode="tail"
					>
						{subtitle}
					</Text>
				</View>
			) : null}
		</View>
	)
}

export default HeaderTitle
