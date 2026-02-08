// Business-related TypeScript interfaces

export interface Business {
	id: string
	name: string
	ownerId: string
	createdAt: string
	updatedAt: string
	status: 'pending' | 'approved' | 'rejected'
}

export interface Shop {
	id: string
	businessId: string
	name: string
	description?: string
	address?: string
	imageUrl?: string
	createdAt: string
	updatedAt: string
}

export interface Product {
	id: string
	shopId: string
	name: string
	description?: string
	price: number
	currency: string
	imageUrl?: string
	stock?: number
	createdAt: string
	updatedAt: string
}

// Note: Sale interface is defined in sales.api.ts to avoid duplication
