# Purchases Screen - API Integration & Cart Update

## Summary
Updated the purchases screen to work with the actual API response structure and added a fully functional "Cart" tab to view local basket items.

## Changes Made

### 1. Cart Tab Integration
- **New Tab**: Added a "Cart" tab as the default view.
- **Local Storage**: Reads `basket` data from `AsyncStorage`.
- **Sync**: Refreshes cart data on pull-to-refresh and screen focus.
- **UI**: Displays cart items with "IN CART" badge and consistent styling.
- **Count**: Shows the number of items in the cart on the tab.

### 2. Updated OrderItem Interface (`orders.interface.ts`)

**New Structure:**
```typescript
export interface Product {
    _id: string
    name: string
    price: {
        value: { tnd: number; eur?: number; usd?: number }
        unit: { name: string; min: number }
        createdAt: string
        updatedAt: string
    }
    updatedAt: string
}

export interface ProductItem {
    product: Product
    finalPrice: {
        quantity: number
        createdAt: string
        updatedAt: string
    }
}

export interface OrderItem {
    _id: string
    shop: { ... }
    customer: { ... }
    products: ProductItem[]  // Array of products
    status: string
    createdAt: string
    updatedAt: string
}
```

### 3. Updated API Function (`orders.api.ts`)

**Added Status Filtering:**
```typescript
export const getPurchases = async (status?: string): Promise<OrderResponse> => {
    const url = status ? `/purchases?status=${status}` : '/purchases'
    const response = await getApiClient().get(url)
    return response.data
}
```

### 4. Updated PurchasesScreen Component

**Cart & Product Display:**
- Displays all products in an order (purchases) or items in the basket (cart).
- Shows product name and quantity for each item (e.g., "Quantity ×3").
- Displays total item count if multiple products.
- Calculates and shows total order/item price.

**Price Calculation:**
```typescript
const totalPrice = item.products.reduce((sum, productItem) => {
    const price = productItem.product.price.value.tnd || 0
    const quantity = productItem.finalPrice.quantity || 0
    return sum + (price * quantity)
}, 0)
```

## Features

✅ **Cart Tab**: Dedicated tab to view items added to the basket
✅ **Multi-Product Support**: Displays all products in an order
✅ **Quantity Display**: Shows quantity for each product
✅ **Price Calculation**: Automatically calculates total order price
✅ **Status Filtering**: Can filter by order status via API
✅ **Null Safety**: Handles missing data gracefully
✅ **Premium UI**: Maintains modern, polished design
✅ **Responsive**: Adapts to different screen sizes

## Example API Response

```json
{
    "status": 200,
    "data": {
        "pagination": { ... },
        "data": [
            {
                "_id": "69384ebebdc5e479774575ed",
                "products": [
                    {
                        "product": {
                            "_id": "6925c3ba1f2a32bbad28d602",
                            "name": "Whole Octopus",
                            "price": {
                                "value": { "tnd": 37, "eur": 11.1, "usd": 11.8 },
                                "unit": { "name": "KG", "min": 1 }
                            }
                        },
                        "finalPrice": {
                            "quantity": 3
                        }
                    }
                ],
                "status": "cancelled_by_shop",
                ...
            }
        ]
    }
}
```
