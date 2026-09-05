import { View, Text, TextInput, type ViewProps, type StyleProp, type ViewStyle, type TextProps, type TextStyle } from 'react-native'
import { useTheme } from '@theme'
import { type IconName } from '@modals'
import { Ionicons } from '@expo/vector-icons'

export interface BaseFormProps extends ViewProps {
	children: React.ReactNode
	style?: StyleProp<ViewStyle>
	gap?: number
	paddingHorizontal?: number
}

const GAP_DEFAULT = 12
const PADDING_HORIZONTAL_DEFAULT = 4

export function BaseForm({ children, style, gap = GAP_DEFAULT, paddingHorizontal = PADDING_HORIZONTAL_DEFAULT, ...props }: BaseFormProps) {
	const { colors } = useTheme()

	return (
		<View style={[{ backgroundColor: colors.background, gap, paddingHorizontal }, style]} {...props}>
			{children}
		</View>
	)
}

export interface FormGroupProps extends ViewProps {
	children: React.ReactNode
	style?: StyleProp<ViewStyle>
}

export function FormGroup({ children, style, ...props }: FormGroupProps) {
	return (
		<View style={[{ marginBottom: 10, paddingHorizontal: 4 }, style]} {...props}>
			{children}
		</View>
	)
}

export interface FormRowProps extends ViewProps {
	children: React.ReactNode
	gap?: number
	style?: StyleProp<ViewStyle>
}

export function FormRow({ children, gap = 12, style, ...props }: FormRowProps) {
	return (
		<View style={[{ flexDirection: 'row', width: '100%', gap }, style]} {...props}>
			{children}
		</View>
	)
}

export interface FormColProps extends ViewProps {
	children: React.ReactNode
	style?: StyleProp<ViewStyle>
}

export function FormCol({ children, style, ...props }: FormColProps) {
	return (
		<View style={[{ flex: 1 }, style]} {...props}>
			{children}
		</View>
	)
}

export interface FormLabelProps extends Omit<TextProps, 'style'> {
	children: React.ReactNode
	style?: StyleProp<TextStyle>
	containerStyle?: StyleProp<ViewStyle>
}

const LABEL_STYLE: TextStyle = {
	fontSize: 14,
	fontWeight: '600',
	marginBottom: 6
}

export function FormLabel({ children, style, containerStyle, ...props }: FormLabelProps) {
	const { colors } = useTheme()

	return (
		<View style={[{ flexDirection: 'row', alignItems: 'center' }, containerStyle]}>
			<Text style={[LABEL_STYLE, { color: colors.textTertiary }, style]} {...props}>
				{children}
			</Text>
		</View>
	)
}

export interface FormInputWrapperProps extends ViewProps {
	children: React.ReactNode
	icon?: IconName
	iconColor?: string
	style?: StyleProp<ViewStyle>
}

const INPUT_CONTAINER_STYLE: ViewStyle = {
	flexDirection: 'row',
	alignItems: 'center',
	borderWidth: 1,
	borderRadius: 10,
	overflow: 'hidden',
	minHeight: 40
}

const ICON_BADGE_STYLE: ViewStyle = {
	width: 40,
	alignItems: 'center',
	justifyContent: 'center',
	borderRightWidth: 1
}

export function FormInputWrapper({ children, icon, iconColor, style, ...props }: FormInputWrapperProps) {
	const { colors } = useTheme()

	return (
		<View style={[INPUT_CONTAINER_STYLE, { borderColor: colors.border, backgroundColor: colors.background }, style]} {...props}>
			{icon ? (
				<View style={[ICON_BADGE_STYLE, { borderRightColor: colors.border }]}>
					<Ionicons name={icon} size={18} color={iconColor ?? colors.textSecondary} />
				</View>
			) : null}
			{children}
		</View>
	)
}

export interface FormInputProps {
	style?: StyleProp<TextStyle>
	value?: string
	onChangeText?: (text: string) => void
	placeholder?: string
	placeholderTextColor?: string
	keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'phone-pad' | 'email-address'
	autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
	maxLength?: number
	editable?: boolean
	textAlign?: 'left' | 'right' | 'center'
	underlineColorAndroid?: string
	autoCorrect?: boolean
	secureTextEntry?: boolean
	multiline?: boolean
	numberOfLines?: number
	testID?: string
	accessibilityLabel?: string
}

const INPUT_STYLE: TextStyle = {
	flex: 1,
	fontSize: 16,
	paddingHorizontal: 12,
	paddingVertical: 10
}

export function FormInput({ style, ...props }: FormInputProps) {
	const { colors } = useTheme()

	return <TextInput style={[{ color: colors.text }, INPUT_STYLE, style]} {...props} />
}
