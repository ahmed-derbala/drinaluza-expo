import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useTheme } from '@/core/theme'
import { updateProduct, getProductBySlug } from '@/features/products/products.api'
import { ProductType } from '@/features/products/products.type'
import { showAlert } from '@/core/helpers/popup'
import { translate } from '@/core/translation'
import CreateProductScreen from '@/features/products/CreateProductScreen'

export default function EditProductScreen() {
	const router = useRouter()
	const { productSlug } = useLocalSearchParams<{ productSlug: string }>()
	const { colors } = useTheme()
	const [product, setProduct] = useState<ProductType | null>(null)
	const [loadingProduct, setLoadingProduct] = useState(true)

	useEffect(() => {
		if (productSlug) {
			loadProductData()
		}
	}, [productSlug])

	const loadProductData = async () => {
		try {
			setLoadingProduct(true)
			const response = await getProductBySlug(productSlug)
			setProduct(response.data)
		} catch (error) {
			console.error('Failed to load product data:', error)
			showAlert(translate('error', 'Error'), translate('err_load_product', 'Failed to load product data'))
		} finally {
			setLoadingProduct(false)
		}
	}

	const handleUpdateProduct = async (productData: any, isActive: boolean) => {
		try {
			await updateProduct(productSlug, {
				...productData,
				state: { code: isActive ? 'active' : 'suspended' }
			})
			showAlert(translate('success', 'Success'), translate('product_updated_success', 'Product updated successfully!'), () => {
				if (product?.business?.slug) {
					router.replace(`/dashboard/${product.business.slug}/products` as never)
				} else {
					router.replace('/(home)/dashboard' as never)
				}
			})
		} catch (error: any) {
			console.error('Failed to update product:', error)
			showAlert(translate('error', 'Error'), error?.response?.data?.message || translate('err_update_failed', 'Failed to update product. Please try again.'))
		}
	}

	if (loadingProduct) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	return <CreateProductScreen isEditMode={true} product={product} onSubmitOverride={handleUpdateProduct} submitLabel={translate('update_product', 'Update Product')} />
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	}
})
