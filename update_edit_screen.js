const fs = require('fs');

let content = fs.readFileSync('src/features/products/EditProductScreen.tsx', 'utf8');

// 1. Rename Component
content = content.replace(/CreateProductScreen/g, 'EditProductScreen');
content = content.replace(/createProduct/g, 'updateProduct');

// 2. Add productSlug to useLocalSearchParams and import getProductBySlug
content = content.replace(
    /const { businessId, businessSlug, source } = useLocalSearchParams<\s*\{\s*businessId\?:\s*string;\s*businessSlug\?:\s*string;\s*source\?:\s*string\s*\}\s*>\(\)/g,
    `const { businessId, businessSlug, source, productSlug } = useLocalSearchParams<{ businessId?: string; businessSlug?: string; source?: string; productSlug?: string }>()`
);

content = content.replace(
    /import { createProduct, getDefaultProducts, type CreateProductRequest, type DefaultProduct } from '@\/features\/products\/products\.api'/g,
    `import { updateProduct, getDefaultProducts, getProductBySlug, type CreateProductRequest, type DefaultProduct } from '@/features/products/products.api'`
);

// 3. Add state for loading product data
content = content.replace(
    /const \[searchQuery, setSearchQuery\] = useState\(''\)/g,
    `const [searchQuery, setSearchQuery] = useState('')
	const [loadingProduct, setLoadingProduct] = useState(false)
	const [isActive, setIsActive] = useState(true)`
);

// 4. Update the load functions to also load the product
content = content.replace(
    /useEffect\(\(\) => \{\n\s*loadBusinesses\(\)\n\s*loadDefaultProducts\(\)\n\s*\}, \[\]\)/g,
    `useEffect(() => {
		loadBusinesses()
		loadDefaultProducts()
		if (productSlug) {
			loadProductData()
		}
	}, [productSlug])

	const loadProductData = async () => {
		try {
			setLoadingProduct(true)
			const response = await getProductBySlug(productSlug as string)
			const p = response.data
			
			setProductNameEn(p.name.en || '')
			setProductNameTnLatn(p.name.tn_latn || '')
			setProductNameTnArab(p.name.tn_arab || '')
			
			// @ts-ignore
			setPriceTND(p.price?.total?.tnd?.toString() || '10')
			setUnit(p.unit?.measure || 'kg')
			setMinUnit(p.unit?.min?.toString() || '1')
			setMaxUnit(p.unit?.max?.toString() || '10')
			setUnitStep(p.unit?.step?.toString() || '1')
			
			setStockQuantity(p.stock?.quantity?.toString() || '')
			setMinThreshold(p.stock?.minThreshold?.toString() || '5')
			
			if (p.media?.thumbnail?.url) {
				setProductPhoto(p.media.thumbnail.url)
			}
			if (p.state?.code === 'inactive' || p.isActive === false) {
				setIsActive(false)
			} else {
				setIsActive(true)
			}
			
			// Try to match selectedBusiness
			setSelectedBusiness(p.business as any)
			setSelectedDefaultProduct(p.defaultProduct as any)
		} catch (error) {
			console.error('Failed to load product data:', error)
			showAlert(translate('error', 'Error'), translate('err_load_product', 'Failed to load product data'))
		} finally {
			setLoadingProduct(false)
		}
	}`
);

// 5. Update handleCreateProduct to handleUpdateProduct
content = content.replace(/handleCreateProduct/g, 'handleUpdateProduct');

content = content.replace(
    /await updateProduct\(productData\)/g,
    `await updateProduct(productSlug as string, { ...productData, state: { code: isActive ? 'active' : 'inactive' } })`
);

content = content.replace(
    /translate\('product_created_success', 'Product created successfully!'\)/g,
    `translate('product_updated_success', 'Product updated successfully!')`
);

// 6. Update titles
content = content.replace(/translate\('create_product', 'Create Product'\)/g, `translate('edit_product', 'Edit Product')`);
content = content.replace(/translate\('err_create_failed', 'Failed to create product\. Please try again\.'\)/g, `translate('err_update_failed', 'Failed to update product. Please try again.')`);

// 7. Add loadingProduct check to JSX return
content = content.replace(
    /return \(\n\s*<View style=\{styles\.container\}>/g,
    `return (
		<View style={styles.container}>
			{loadingProduct && (
				<View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, justifyContent: 'center', alignItems: 'center' }]}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			)}`
);

// 8. Add Active status toggle in General Info card
const statusToggleStr = `
						<View style={styles.fieldContainer}>
							<Text style={styles.fieldLabel}>{translate('status', 'Status')}</Text>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
								<TouchableOpacity 
									style={[styles.inputBox, { flex: 1, justifyContent: 'center', borderColor: isActive ? colors.success || '#10B981' : colors.borderLight, backgroundColor: isActive ? (colors.success || '#10B981') + '15' : colors.surface }]}
									onPress={() => setIsActive(true)}
								>
									<Text style={{ color: isActive ? colors.success || '#10B981' : colors.text, fontWeight: isActive ? '700' : '500' }}>{translate('active', 'Active')}</Text>
								</TouchableOpacity>
								<TouchableOpacity 
									style={[styles.inputBox, { flex: 1, justifyContent: 'center', borderColor: !isActive ? colors.error || '#EF4444' : colors.borderLight, backgroundColor: !isActive ? (colors.error || '#EF4444') + '15' : colors.surface }]}
									onPress={() => setIsActive(false)}
								>
									<Text style={{ color: !isActive ? colors.error || '#EF4444' : colors.text, fontWeight: !isActive ? '700' : '500' }}>{translate('inactive', 'Inactive')}</Text>
								</TouchableOpacity>
							</View>
						</View>
`;
content = content.replace(
    /(<Text style=\{styles\.cardTitle\}>\{translate\('general_info', 'General Info'\)\}<\/Text>)/g,
    `$1\n${statusToggleStr}`
);

fs.writeFileSync('src/features/products/EditProductScreen.tsx', content);
console.log('EditProductScreen created');
