import React, { useCallback } from 'react'
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'

import { useTheme, colors as themeColors } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { IconButton } from './buttons/IconButton'
import type { Location as LocationType } from '@/features/profile/profile.interface'

interface LocationFormProps {
	location?: LocationType
	onChange?: (location: LocationType) => void
}

export default function LocationForm({ location, onChange }: LocationFormProps) {
	const { colors } = useTheme()
	const { translate } = useUser()

	const coordinates = location?.geo?.coordinates || [0, 0]
	const sharingEnabled = location?.sharingEnabled !== false

	const updateCoordinates = useCallback(
		(index: 0 | 1, value: string) => {
			if (location?.sharingEnabled === false) return
			const newCoords: [number, number] = [...coordinates] as [number, number]
			newCoords[index] = parseFloat(value) || 0
			onChange?.({
				...location,
				geo: {
					type: 'Point',
					coordinates: newCoords
				}
			})
		},
		[coordinates, location, onChange]
	)

	const handleGetCurrentLocation = useCallback(async () => {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync()
			if (status !== 'granted') {
				Alert.alert('Permission Denied', 'Location permission is required to get your current location.')
				return
			}

			const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest })
			const { longitude, latitude, accuracy, heading, speed, altitude } = position.coords

			onChange?.({
				...location,
				geo: {
					type: 'Point',
					coordinates: [longitude, latitude]
				},
				accuracy: accuracy ?? undefined,
				heading: heading ?? undefined,
				speed: speed ?? undefined,
				altitude: altitude ?? undefined,
				sharingEnabled: true
			})

			Alert.alert('Success', `Location updated: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
		} catch (error: any) {
			console.error('Error getting location:', error)
			Alert.alert('Error', 'Failed to get current location. Please make sure location services are enabled.')
		}
	}, [location, onChange])

	const handleToggleSharing = useCallback(async () => {
		const currentlyEnabled = location?.sharingEnabled === true
		if (currentlyEnabled) {
			onChange?.({
				...location,
				geo: {
					type: 'Point',
					coordinates: [] as any
				},
				sharingEnabled: false
			})
			return
		}

		try {
			const { status } = await Location.requestForegroundPermissionsAsync()
			if (status !== 'granted') {
				Alert.alert('Permission Denied', 'Location permission is required to share your current location.')
				return
			}

			const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
			const { longitude, latitude, accuracy, heading, speed, altitude } = position.coords

			onChange?.({
				...location,
				geo: {
					type: 'Point',
					coordinates: [longitude, latitude]
				},
				accuracy: accuracy ?? undefined,
				heading: heading ?? undefined,
				speed: speed ?? undefined,
				altitude: altitude ?? undefined,
				sharingEnabled: true
			})

			Alert.alert('Success', `Location sharing enabled: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
		} catch (error: any) {
			console.error('Error enabling location sharing:', error)
			Alert.alert('Error', 'Failed to enable location sharing.')
		}
	}, [location, onChange])

	return (
		<View style={styles.inputGroup}>
			<Text style={styles.inputLabel}>GPS Coordinates</Text>
			<View style={styles.locationGrid}>
				<View style={styles.locationCol}>
					<Text style={[styles.locationSubLabel, { color: colors.textTertiary }]}>Longitude</Text>
					<View style={[styles.socialInputContainer, { borderColor: colors.border, backgroundColor: colors.background, opacity: sharingEnabled ? 1 : 0.5 }]}>
						<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05' }]}>
							<Ionicons name="location" size={20} color={colors.textSecondary} />
						</View>
						<TextInput
							style={[styles.socialInput, { color: colors.text }]}
							value={coordinates[0]?.toString() || ''}
							onChangeText={(value) => updateCoordinates(0, value)}
							placeholder="10.8045"
							placeholderTextColor={colors.textTertiary}
							keyboardType="numeric"
							editable={sharingEnabled}
						/>
					</View>
				</View>
				<View style={styles.locationCol}>
					<Text style={[styles.locationSubLabel, { color: colors.textTertiary }]}>Latitude</Text>
					<View style={[styles.socialInputContainer, { borderColor: colors.border, backgroundColor: colors.background, opacity: sharingEnabled ? 1 : 0.5 }]}>
						<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05' }]}>
							<Ionicons name="location" size={20} color={colors.textSecondary} />
						</View>
						<TextInput
							style={[styles.socialInput, { color: colors.text }]}
							value={coordinates[1]?.toString() || ''}
							onChangeText={(value) => updateCoordinates(1, value)}
							placeholder="35.7905"
							placeholderTextColor={colors.textTertiary}
							keyboardType="numeric"
							editable={sharingEnabled}
						/>
					</View>
				</View>
			</View>

			<View style={styles.inputGroup}>
				<View style={styles.switchContainer}>
					<Text style={[styles.switchLabel, { color: colors.text }]}>Share Location</Text>
					<TouchableOpacity style={[styles.switch, sharingEnabled ? { backgroundColor: colors.primary } : { backgroundColor: colors.border }]} onPress={handleToggleSharing}>
						<View style={[styles.switchThumb, sharingEnabled ? { transform: [{ translateX: 20 }], backgroundColor: themeColors.buttonText } : { backgroundColor: themeColors.buttonText }]} />
					</TouchableOpacity>
				</View>
				<IconButton
					icon="location"
					label={translate('get_current', 'Get Current Location')}
					onPress={handleGetCurrentLocation}
					disabled={!sharingEnabled}
					colors={colors}
					style={[styles.addButton, { borderColor: colors.primary, marginTop: 12, opacity: sharingEnabled ? 1 : 0.5 }]}
				/>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	inputGroup: {
		marginBottom: 10,
		paddingHorizontal: 4
	},
	inputLabel: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 6,
		color: themeColors.textTertiary
	},
	locationGrid: {
		flexDirection: 'row',
		gap: 12
	},
	locationCol: {
		flex: 1
	},
	locationSubLabel: {
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 4
	},
	socialInputContainer: {
		flexDirection: 'row',
		alignItems: 'stretch',
		borderRadius: 10,
		borderWidth: 1,
		overflow: 'hidden',
		minHeight: 40
	},
	socialIconBadge: {
		width: 40,
		alignItems: 'center',
		justifyContent: 'center',
		borderRightWidth: 1,
		borderRightColor: themeColors.textSecondary
	},
	socialInput: {
		flex: 1,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16
	},
	switchContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 8
	},
	switchLabel: {
		fontSize: 14,
		fontWeight: '600'
	},
	switch: {
		width: 48,
		height: 28,
		borderRadius: 14,
		position: 'relative'
	},
	switchThumb: {
		width: 24,
		height: 24,
		borderRadius: 12,
		position: 'absolute',
		left: 2,
		top: 2
	},
	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 10,
		borderWidth: 1,
		marginBottom: 6
	}
})
