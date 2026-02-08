// Dashboard-related TypeScript interfaces

export interface DashboardStats {
	totalSales: number
	totalRevenue: number
	totalOrders: number
	totalProducts: number
	currency: string
}

export interface RecentActivity {
	id: string
	type: 'sale' | 'order' | 'product_added' | 'shop_created'
	title: string
	description: string
	timestamp: string
	amount?: number
	currency?: string
}

export interface DashboardData {
	stats: DashboardStats
	recentActivities: RecentActivity[]
	topProducts?: Array<{
		id: string
		name: string
		sales: number
		revenue: number
	}>
}
