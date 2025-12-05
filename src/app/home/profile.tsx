import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, Platform, useWindowDimensions } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Picker } from '@react-native-picker/picker'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { checkAuth } from '../../core/auth/auth.api'
import { useTheme } from '../../contexts/ThemeContext'

import { UserData } from '../../components/profile/profile.interface'

export default function ProfileScreen() {
	const router = useRouter()
	const { colors, isDark } = useTheme()
	const { width } = useWindowDimensions()
	const maxWidth = 800
	const isWideScreen = width > maxWidth
	const styles = createStyles(colors, isDark, isWideScreen, width)
	const [userData, setUserData] = useState<UserData>({
		slug: '',
		name: '',
		email: '',
		role: '',
		phone: {
			fullNumber: '',
			countryCode: '+216',
			shortNumber: ''
		},
		profile: {
			firstName: '',
			middleName: '',
			lastName: '',
			birthDate: null,
			photo: {
				url: ''
			}
		},
		address: {
			text: '',
			country: 'Tunisia',
			city: '',
			street: ''
		},
		settings: {
			lang: 'en',
			currency: 'tnd'
		}
	})

	const [isEditing, setIsEditing] = useState(false)
	const [showDatePicker, setShowDatePicker] = useState(false)

	useFocusEffect(
		useCallback(() => {
			const checkUserAuth = async () => {
				const isAuthenticated = await checkAuth()
				if (!isAuthenticated) {
					router.replace('/auth')
				} else {
					loadUserData()
				}
			}
			checkUserAuth()
		}, [])
	)

	const loadUserData = async () => {
		try {
			const storedUserData = await AsyncStorage.getItem('userData')
			if (storedUserData) {
				const parsed = JSON.parse(storedUserData)
				if (parsed.profile?.birthDate) {
					parsed.profile.birthDate = new Date(parsed.profile.birthDate)
				}
				// Merge with default structure to ensure all properties exist
				setUserData((prev) => ({
					...prev,
					...parsed,
					phone: {
						fullNumber: '',
						countryCode: '+216',
						shortNumber: '',
						...parsed.phone
					},
					profile: {
						firstName: '',
						middleName: '',
						lastName: '',
						birthDate: null,
						photo: { url: '' },
						...parsed.profile
					},
					address: {
						text: '',
						country: '',
						city: '',
						street: '',
						...parsed.address
					},
					settings: {
						lang: 'en',
						currency: 'TND',
						...parsed.settings
					}
				}))
			} else {
				// Fallback to old slug storage
				const storedUsername = await AsyncStorage.getItem('user.slug')
				if (storedUsername) {
					setUserData((prev) => ({ ...prev, slug: storedUsername }))
				}
			}
		} catch (e) {
			console.error('Error loading user data:', e)
		}
	}

	const saveUserData = async () => {
		try {
			await AsyncStorage.setItem('userData', JSON.stringify(userData))
			setIsEditing(false)
			Alert.alert('Success', 'Profile updated successfully!')
		} catch (e) {
			console.error('Error saving user data:', e)
			Alert.alert('Error', 'Failed to save profile changes')
		}
	}

	const updateField = (field: string, value: any, nested?: string) => {
		setUserData((prev) => {
			if (nested) {
				const nestedObj = prev[nested as keyof UserData] as any
				return {
					...prev,
					[nested]: {
						...nestedObj,
						[field]: value
					}
				}
			}
			return { ...prev, [field]: value }
		})
	}

	const onDateChange = (event: any, selectedDate?: Date) => {
		setShowDatePicker(Platform.OS === 'ios')
		if (selectedDate) {
			updateField('birthDate', selectedDate, 'profile')
		}
	}

	const formatDate = (date: Date | null) => {
		if (!date) return 'Not set'
		return date.toLocaleDateString()
	}

	const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>{title}</Text>
			<View style={styles.sectionContent}>{children}</View>
		</View>
	)

	const InfoItem = ({ label, value, icon }: { label: string; value: string; icon: any }) => (
		<View style={styles.infoItem}>
			<View style={styles.infoIconContainer}>
				<Ionicons name={icon} size={20} color={colors.primary} />
			</View>
			<View style={styles.infoContent}>
				<Text style={styles.infoLabel}>{label}</Text>
				<Text style={styles.infoValue}>{value}</Text>
			</View>
		</View>
	)

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
			<View style={styles.header}>
				<Text style={styles.title}>Profile</Text>
				<View style={styles.headerButtons}>
					<TouchableOpacity style={styles.iconButton} onPress={() => router.push('/home/settings')}>
						<Ionicons name="settings-outline" size={24} color={colors.text} />
					</TouchableOpacity>
					<TouchableOpacity style={styles.editButton} onPress={() => (isEditing ? saveUserData() : setIsEditing(true))}>
						<Text style={styles.editButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Profile Header Card */}
			<View style={styles.profileCard}>
				<View style={styles.photoContainer}>
					{userData.profile?.photo?.url ? (
						<Image source={{ uri: userData.profile?.photo?.url }} style={styles.profilePhoto} />
					) : (
						<View style={styles.placeholderPhoto}>
							<Text style={styles.placeholderText}>
								{userData.profile?.firstName?.charAt(0) || userData.name?.charAt(0) || ''}
								{userData.profile?.lastName?.charAt(0) || ''}
							</Text>
						</View>
					)}
					{isEditing && (
						<TouchableOpacity style={styles.changePhotoButton}>
							<Ionicons name="camera" size={20} color="#fff" />
						</TouchableOpacity>
					)}
				</View>
				<Text style={styles.profileName}>{userData.name || 'User'}</Text>
				<Text style={styles.profileEmail}>{userData.email || 'No email set'}</Text>
				<View style={[styles.roleBadge, userData.role === 'shop_owner' ? styles.shopOwnerBadge : userData.role === 'super' ? styles.adminBadge : styles.customerBadge]}>
					<Text style={styles.roleBadgeText}>{userData.role === 'shop_owner' ? 'Shop Owner' : userData.role === 'super' ? 'Administrator' : 'Customer'}</Text>
				</View>
			</View>

			{isEditing ? (
				// Edit Mode
				<>
					<Section title="Basic Information">
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Display Name</Text>
							<TextInput style={styles.input} value={userData.name} onChangeText={(value) => updateField('name', value)} placeholder="Display Name" placeholderTextColor={colors.textTertiary} />
						</View>
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Email</Text>
							<TextInput
								style={styles.input}
								value={userData.email}
								onChangeText={(value) => updateField('email', value)}
								placeholder="Email"
								placeholderTextColor={colors.textTertiary}
								keyboardType="email-address"
								autoCapitalize="none"
							/>
						</View>
					</Section>

					<Section title="Personal Details">
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>First Name</Text>
							<TextInput
								style={styles.input}
								value={userData.profile?.firstName}
								onChangeText={(value) => updateField('firstName', value, 'profile')}
								placeholder="First Name"
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Last Name</Text>
							<TextInput
								style={styles.input}
								value={userData.profile?.lastName}
								onChangeText={(value) => updateField('lastName', value, 'profile')}
								placeholder="Last Name"
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Birth Date</Text>
							<TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
								<Text style={styles.dateInputText}>{formatDate(userData.profile?.birthDate)}</Text>
								<Ionicons name="calendar" size={20} color={colors.textSecondary} />
							</TouchableOpacity>
						</View>
					</Section>

					<Section title="Contact Info">
						<View style={styles.phoneInputContainer}>
							<View style={{ flex: 1 }}>
								<Text style={styles.inputLabel}>Code</Text>
								<TextInput
									style={styles.input}
									value={userData.phone.countryCode}
									onChangeText={(value) => updateField('countryCode', value, 'phone')}
									placeholder="+216"
									placeholderTextColor={colors.textTertiary}
								/>
							</View>
							<View style={{ flex: 3 }}>
								<Text style={styles.inputLabel}>Phone Number</Text>
								<TextInput
									style={styles.input}
									value={userData.phone.shortNumber}
									onChangeText={(value) => updateField('shortNumber', value, 'phone')}
									placeholder="Phone Number"
									placeholderTextColor={colors.textTertiary}
									keyboardType="phone-pad"
								/>
							</View>
						</View>
					</Section>

					<Section title="Address">
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Country</Text>
							<View style={styles.pickerContainer}>
								<Picker selectedValue={userData.address.country} onValueChange={(value) => updateField('country', value, 'address')} style={{ color: colors.text }} dropdownIconColor={colors.text}>
									<Picker.Item label="Tunisia" value="Tunisia" />
									<Picker.Item label="France" value="France" />
									<Picker.Item label="Germany" value="Germany" />
									<Picker.Item label="Other" value="Other" />
								</Picker>
							</View>
						</View>
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>City</Text>
							<TextInput
								style={styles.input}
								value={userData.address.city}
								onChangeText={(value) => updateField('city', value, 'address')}
								placeholder="City"
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Full Address</Text>
							<TextInput
								style={[styles.input, styles.textArea]}
								value={userData.address.text}
								onChangeText={(value) => updateField('text', value, 'address')}
								placeholder="Full Address"
								placeholderTextColor={colors.textTertiary}
								multiline
								numberOfLines={3}
							/>
						</View>
					</Section>

					<TouchableOpacity
						style={styles.cancelButton}
						onPress={() => {
							setIsEditing(false)
							loadUserData()
						}}
					>
						<Text style={styles.cancelButtonText}>Cancel Changes</Text>
					</TouchableOpacity>
				</>
			) : (
				// View Mode
				<>
					<Section title="Personal Information">
						<InfoItem label="Full Name" value={`${userData.profile?.firstName || ''} ${userData.profile?.middleName || ''} ${userData.profile?.lastName || ''}`.trim() || 'Not set'} icon="person" />
						<InfoItem label="Birth Date" value={formatDate(userData.profile?.birthDate)} icon="calendar" />
					</Section>

					<Section title="Contact Details">
						<InfoItem label="Phone" value={`${userData.phone.countryCode} ${userData.phone.shortNumber}`.trim() || 'Not set'} icon="call" />
						<InfoItem label="Address" value={userData.address.text || `${userData.address.city || ''}, ${userData.address.country || ''}`.trim() || 'Not set'} icon="location" />
					</Section>

					<Section title="Preferences">
						<InfoItem label="Language" value={userData.settings.lang === 'en' ? 'English' : userData.settings.lang === 'tn' ? 'Tunisian' : 'Tunisian Arabic'} icon="language" />
						<InfoItem label="Currency" value={userData.settings.currency.toUpperCase()} icon="cash" />
					</Section>
				</>
			)}

			{showDatePicker && <DateTimePicker value={userData.profile?.birthDate || new Date()} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} />}
		</ScrollView>
	)
}

const createStyles = (colors: any, isDark: boolean, isWideScreen?: boolean, width?: number) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: colors.background
		},
		contentContainer: {
			padding: 20,
			paddingBottom: 40,
			maxWidth: isWideScreen ? 800 : undefined,
			alignSelf: isWideScreen ? 'center' : undefined,
			width: '100%'
		},
		header: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 24
		},
		title: {
			fontSize: 32,
			fontWeight: 'bold',
			color: colors.text,
			letterSpacing: -0.5
		},
		editButton: {
			backgroundColor: colors.primary + '20',
			paddingHorizontal: 16,
			paddingVertical: 8,
			borderRadius: 20
		},
		editButtonText: {
			color: colors.primary,
			fontWeight: '600',
			fontSize: 14
		},
		headerButtons: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 12
		},
		iconButton: {
			padding: 8,
			borderRadius: 20,
			backgroundColor: colors.card,
			borderWidth: 1,
			borderColor: colors.border
		},
		profileCard: {
			alignItems: 'center',
			marginBottom: 32,
			padding: 24,
			backgroundColor: colors.card,
			borderRadius: 24,
			borderWidth: 1,
			borderColor: colors.border
		},
		photoContainer: {
			position: 'relative',
			marginBottom: 16
		},
		profilePhoto: {
			width: 100,
			height: 100,
			borderRadius: 50,
			borderWidth: 4,
			borderColor: colors.background
		},
		placeholderPhoto: {
			width: 100,
			height: 100,
			borderRadius: 50,
			backgroundColor: colors.primary,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 4,
			borderColor: colors.background
		},
		placeholderText: {
			color: '#fff',
			fontSize: 36,
			fontWeight: 'bold'
		},
		changePhotoButton: {
			position: 'absolute',
			bottom: 0,
			right: 0,
			backgroundColor: colors.primary,
			width: 32,
			height: 32,
			borderRadius: 16,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 2,
			borderColor: colors.background
		},
		profileName: {
			fontSize: 24,
			fontWeight: 'bold',
			color: colors.text,
			marginBottom: 4
		},
		profileEmail: {
			fontSize: 14,
			color: colors.textSecondary,
			marginBottom: 16
		},
		roleBadge: {
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 12
		},
		shopOwnerBadge: {
			backgroundColor: '#3B82F6' + '20'
		},
		adminBadge: {
			backgroundColor: '#F59E0B' + '20'
		},
		customerBadge: {
			backgroundColor: '#10B981' + '20'
		},
		roleBadgeText: {
			fontSize: 12,
			fontWeight: '600',
			color: colors.text
		},
		section: {
			marginBottom: 24
		},
		sectionTitle: {
			fontSize: 14,
			fontWeight: '600',
			color: colors.textSecondary,
			marginBottom: 12,
			textTransform: 'uppercase',
			letterSpacing: 0.5,
			marginLeft: 4
		},
		sectionContent: {
			backgroundColor: colors.card,
			borderRadius: 16,
			overflow: 'hidden',
			borderWidth: 1,
			borderColor: colors.border,
			padding: 8
		},
		infoItem: {
			flexDirection: 'row',
			alignItems: 'center',
			padding: 12
		},
		infoIconContainer: {
			width: 40,
			height: 40,
			borderRadius: 12,
			backgroundColor: colors.primary + '10',
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: 16
		},
		infoContent: {
			flex: 1
		},
		infoLabel: {
			fontSize: 12,
			color: colors.textTertiary,
			marginBottom: 2
		},
		infoValue: {
			fontSize: 16,
			color: colors.text,
			fontWeight: '500'
		},
		inputGroup: {
			marginBottom: 16,
			paddingHorizontal: 8
		},
		inputLabel: {
			fontSize: 14,
			fontWeight: '500',
			color: colors.textSecondary,
			marginBottom: 8
		},
		input: {
			backgroundColor: colors.background,
			color: colors.text,
			fontSize: 16,
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: colors.border
		},
		textArea: {
			height: 80,
			textAlignVertical: 'top'
		},
		dateInput: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			backgroundColor: colors.background,
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: colors.border
		},
		dateInputText: {
			fontSize: 16,
			color: colors.text
		},
		phoneInputContainer: {
			flexDirection: 'row',
			gap: 12,
			paddingHorizontal: 8
		},
		pickerContainer: {
			backgroundColor: colors.background,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: colors.border,
			overflow: 'hidden'
		},
		cancelButton: {
			backgroundColor: colors.error + '10',
			padding: 16,
			borderRadius: 16,
			alignItems: 'center',
			marginTop: 8,
			marginBottom: 32,
			borderWidth: 1,
			borderColor: colors.error + '20'
		},
		cancelButtonText: {
			color: colors.error,
			fontSize: 16,
			fontWeight: '600'
		}
	})
