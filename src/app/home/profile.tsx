import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Picker } from '@react-native-picker/picker'

interface UserProfile {
	firstName: string
	middleName: string
	lastName: string
	birthDate: Date | null
	photo: {
		url: string
	}
}

interface UserData {
	username: string
	name: string
	email: string
	phone: {
		fullNumber: string
		countryCode: string
		shortNumber: string
	}
	profile: UserProfile
	address: {
		text: string
		country: string
		city: string
		street: string
	}
	settings: {
		lang: string
		currency: string
	}
}

export default function ProfileScreen() {
	const [userData, setUserData] = useState<UserData>({
		username: '',
		name: '',
		email: '',
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

	useEffect(() => {
		loadUserData()
	}, [])

	const loadUserData = async () => {
		try {
			const storedUserData = await AsyncStorage.getItem('userData')
			if (storedUserData) {
				const parsed = JSON.parse(storedUserData)
				if (parsed.profile?.birthDate) {
					parsed.profile.birthDate = new Date(parsed.profile.birthDate)
				}
				setUserData(parsed)
			} else {
				// Fallback to old username storage
				const storedUsername = await AsyncStorage.getItem('user.username')
				if (storedUsername) {
					setUserData((prev) => ({ ...prev, username: storedUsername }))
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

	return (
		<ScrollView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Profile</Text>
				<TouchableOpacity style={styles.editButton} onPress={() => (isEditing ? saveUserData() : setIsEditing(true))}>
					<Text style={styles.editButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
				</TouchableOpacity>
			</View>

			{/* Profile Photo */}
			<View style={styles.photoSection}>
				<View style={styles.photoContainer}>
					{userData.profile.photo.url ? (
						<Image source={{ uri: userData.profile.photo.url }} style={styles.profilePhoto} />
					) : (
						<View style={styles.placeholderPhoto}>
							<Text style={styles.placeholderText}>
								{userData.profile.firstName.charAt(0)}
								{userData.profile.lastName.charAt(0)}
							</Text>
						</View>
					)}
				</View>
				{isEditing && (
					<TouchableOpacity style={styles.changePhotoButton}>
						<Text style={styles.changePhotoText}>Change Photo</Text>
					</TouchableOpacity>
				)}
			</View>

			{/* Basic Info Section */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Basic Information</Text>

				<View style={styles.fieldGroup}>
					<Text style={styles.label}>Username</Text>
					{isEditing ? (
						<TextInput style={styles.input} value={userData.username} onChangeText={(value) => updateField('username', value)} placeholder="Enter username" placeholderTextColor="#666" />
					) : (
						<Text style={styles.value}>{userData.username || 'Not set'}</Text>
					)}
				</View>

				<View style={styles.fieldGroup}>
					<Text style={styles.label}>Display Name</Text>
					{isEditing ? (
						<TextInput style={styles.input} value={userData.name} onChangeText={(value) => updateField('name', value)} placeholder="Enter display name" placeholderTextColor="#666" />
					) : (
						<Text style={styles.value}>{userData.name || 'Not set'}</Text>
					)}
				</View>

				<View style={styles.fieldGroup}>
					<Text style={styles.label}>Email</Text>
					{isEditing ? (
						<TextInput
							style={styles.input}
							value={userData.email}
							onChangeText={(value) => updateField('email', value)}
							placeholder="Enter email"
							placeholderTextColor="#666"
							keyboardType="email-address"
							autoCapitalize="none"
						/>
					) : (
						<Text style={styles.value}>{userData.email || 'Not set'}</Text>
					)}
				</View>
			</View>

			{/* Profile Details Section */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Profile Details</Text>

				<View style={styles.fieldGroup}>
					<Text style={styles.label}>First Name</Text>
					{isEditing ? (
						<TextInput
							style={styles.input}
							value={userData.profile.firstName}
							onChangeText={(value) => updateField('firstName', value, 'profile')}
							placeholder="Enter first name"
							placeholderTextColor="#666"
						/>
					) : (
						<Text style={styles.value}>{userData.profile.firstName || 'Not set'}</Text>
					)}
				</View>

				<View style={styles.fieldGroup}>
					<Text style={styles.label}>Middle Name</Text>
					{isEditing ? (
						<TextInput
							style={styles.input}
							value={userData.profile.middleName}
							onChangeText={(value) => updateField('middleName', value, 'profile')}
							placeholder="Enter middle name (optional)"
							placeholderTextColor="#666"
						/>
					) : (
						<Text style={styles.value}>{userData.profile.middleName || 'Not set'}</Text>
					)}
				</View>

				<View style={styles.fieldGroup}>
					<Text style={styles.label}>Last Name</Text>
					{isEditing ? (
						<TextInput
							style={styles.input}
							value={userData.profile.lastName}
							onChangeText={(value) => updateField('lastName', value, 'profile')}
							placeholder="Enter last name"
							placeholderTextColor="#666"
						/>
					) : (
						<Text style={styles.value}>{userData.profile.lastName || 'Not set'}</Text>
					)}
				</View>

				<View style={styles.fieldGroup}>
					<Text style={styles.label}>Birth Date</Text>
					{isEditing ? (
						<TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
							<Text style={styles.dateButtonText}>{formatDate(userData.profile.birthDate)}</Text>
						</TouchableOpacity>
					) : (
						<Text style={styles.value}>{formatDate(userData.profile.birthDate)}</Text>
					)}
				</View>
			</View>

			{/* Phone Section */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Phone</Text>

				<View style={styles.phoneContainer}>
					<View style={styles.countryCodeContainer}>
						<Text style={styles.label}>Code</Text>
						{isEditing ? (
							<TextInput
								style={[styles.input, styles.countryCodeInput]}
								value={userData.phone.countryCode}
								onChangeText={(value) => updateField('countryCode', value, 'phone')}
								placeholder="+216"
								placeholderTextColor="#666"
							/>
						) : (
							<Text style={styles.value}>{userData.phone.countryCode || '+216'}</Text>
						)}
					</View>

					<View style={styles.phoneNumberContainer}>
						<Text style={styles.label}>Phone Number</Text>
						{isEditing ? (
							<TextInput
								style={styles.input}
								value={userData.phone.shortNumber}
								onChangeText={(value) => updateField('shortNumber', value, 'phone')}
								placeholder="Enter phone number"
								placeholderTextColor="#666"
								keyboardType="phone-pad"
							/>
						) : (
							<Text style={styles.value}>{userData.phone.shortNumber || 'Not set'}</Text>
						)}
					</View>
				</View>
			</View>

			{/* Address Section */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Address</Text>

				<View style={styles.fieldGroup}>
					<Text style={styles.label}>Country</Text>
					{isEditing ? (
						<View style={styles.pickerContainer}>
							<Picker selectedValue={userData.address.country} onValueChange={(value) => updateField('country', value, 'address')} style={styles.picker} dropdownIconColor="#fff">
								<Picker.Item label="Tunisia" value="Tunisia" color="#fff" />
								<Picker.Item label="France" value="France" color="#fff" />
								<Picker.Item label="Germany" value="Germany" color="#fff" />
								<Picker.Item label="Other" value="Other" color="#fff" />
							</Picker>
						</View>
					) : (
						<Text style={styles.value}>{userData.address.country || 'Not set'}</Text>
					)}
				</View>

				<View style={styles.fieldGroup}>
					<Text style={styles.label}>City</Text>
					{isEditing ? (
						<TextInput style={styles.input} value={userData.address.city} onChangeText={(value) => updateField('city', value, 'address')} placeholder="Enter city" placeholderTextColor="#666" />
					) : (
						<Text style={styles.value}>{userData.address.city || 'Not set'}</Text>
					)}
				</View>

				<View style={styles.fieldGroup}>
					<Text style={styles.label}>Street</Text>
					{isEditing ? (
						<TextInput
							style={styles.input}
							value={userData.address.street}
							onChangeText={(value) => updateField('street', value, 'address')}
							placeholder="Enter street address"
							placeholderTextColor="#666"
						/>
					) : (
						<Text style={styles.value}>{userData.address.street || 'Not set'}</Text>
					)}
				</View>

				<View style={styles.fieldGroup}>
					<Text style={styles.label}>Full Address</Text>
					{isEditing ? (
						<TextInput
							style={[styles.input, styles.textArea]}
							value={userData.address.text}
							onChangeText={(value) => updateField('text', value, 'address')}
							placeholder="Enter full address"
							placeholderTextColor="#666"
							multiline
							numberOfLines={3}
						/>
					) : (
						<Text style={styles.value}>{userData.address.text || 'Not set'}</Text>
					)}
				</View>
			</View>

			{/* Settings Section */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Settings</Text>

				<View style={styles.fieldGroup}>
					<Text style={styles.label}>Language</Text>
					{isEditing ? (
						<View style={styles.pickerContainer}>
							<Picker selectedValue={userData.settings.lang} onValueChange={(value) => updateField('lang', value, 'settings')} style={styles.picker} dropdownIconColor="#fff">
								<Picker.Item label="English" value="en" color="#fff" />
								<Picker.Item label="Tunisian" value="tn" color="#fff" />
								<Picker.Item label="Tunisian Arabic" value="tn_ar" color="#fff" />
							</Picker>
						</View>
					) : (
						<Text style={styles.value}>
							{userData.settings.lang === 'en' ? 'English' : userData.settings.lang === 'tn' ? 'Tunisian' : userData.settings.lang === 'tn_ar' ? 'Tunisian Arabic' : 'Not set'}
						</Text>
					)}
				</View>

				<View style={styles.fieldGroup}>
					<Text style={styles.label}>Currency</Text>
					{isEditing ? (
						<View style={styles.pickerContainer}>
							<Picker selectedValue={userData.settings.currency} onValueChange={(value) => updateField('currency', value, 'settings')} style={styles.picker} dropdownIconColor="#fff">
								<Picker.Item label="Tunisian Dinar (TND)" value="tnd" color="#fff" />
								<Picker.Item label="Euro (EUR)" value="eur" color="#fff" />
								<Picker.Item label="US Dollar (USD)" value="usd" color="#fff" />
							</Picker>
						</View>
					) : (
						<Text style={styles.value}>
							{userData.settings.currency === 'tnd'
								? 'Tunisian Dinar (TND)'
								: userData.settings.currency === 'eur'
									? 'Euro (EUR)'
									: userData.settings.currency === 'usd'
										? 'US Dollar (USD)'
										: 'Not set'}
						</Text>
					)}
				</View>
			</View>

			{isEditing && (
				<TouchableOpacity
					style={styles.cancelButton}
					onPress={() => {
						setIsEditing(false)
						loadUserData() // Reset to original data
					}}
				>
					<Text style={styles.cancelButtonText}>Cancel</Text>
				</TouchableOpacity>
			)}

			{showDatePicker && <DateTimePicker value={userData.profile.birthDate || new Date()} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} />}
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#1a1a1a'
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		paddingBottom: 10
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		color: '#fff'
	},
	editButton: {
		backgroundColor: '#007AFF',
		paddingHorizontal: 20,
		paddingVertical: 8,
		borderRadius: 20
	},
	editButtonText: {
		color: '#fff',
		fontWeight: '600'
	},
	photoSection: {
		alignItems: 'center',
		paddingVertical: 20
	},
	photoContainer: {
		marginBottom: 10
	},
	profilePhoto: {
		width: 100,
		height: 100,
		borderRadius: 50,
		borderWidth: 3,
		borderColor: '#007AFF'
	},
	placeholderPhoto: {
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: '#333',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 3,
		borderColor: '#007AFF'
	},
	placeholderText: {
		color: '#fff',
		fontSize: 32,
		fontWeight: 'bold'
	},
	changePhotoButton: {
		backgroundColor: '#333',
		paddingHorizontal: 15,
		paddingVertical: 8,
		borderRadius: 15
	},
	changePhotoText: {
		color: '#007AFF',
		fontSize: 14
	},
	section: {
		backgroundColor: '#2a2a2a',
		margin: 15,
		marginTop: 0,
		borderRadius: 12,
		padding: 20
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#444',
		paddingBottom: 8
	},
	fieldGroup: {
		marginBottom: 15
	},
	label: {
		fontSize: 14,
		color: '#aaa',
		marginBottom: 5,
		fontWeight: '500'
	},
	value: {
		fontSize: 16,
		color: '#fff',
		paddingVertical: 8
	},
	input: {
		backgroundColor: '#333',
		color: '#fff',
		fontSize: 16,
		paddingHorizontal: 15,
		paddingVertical: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#444'
	},
	textArea: {
		height: 80,
		textAlignVertical: 'top'
	},
	dateButton: {
		backgroundColor: '#333',
		paddingHorizontal: 15,
		paddingVertical: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#444'
	},
	dateButtonText: {
		color: '#fff',
		fontSize: 16
	},
	phoneContainer: {
		flexDirection: 'row',
		gap: 10
	},
	countryCodeContainer: {
		flex: 1
	},
	countryCodeInput: {
		textAlign: 'center'
	},
	phoneNumberContainer: {
		flex: 3
	},
	pickerContainer: {
		backgroundColor: '#333',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#444',
		overflow: 'hidden'
	},
	picker: {
		color: '#fff',
		backgroundColor: '#333'
	},
	cancelButton: {
		backgroundColor: '#666',
		margin: 15,
		paddingVertical: 15,
		borderRadius: 8,
		alignItems: 'center'
	},
	cancelButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600'
	}
})
