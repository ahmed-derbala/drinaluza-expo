/**
 * features/users/userRoles — helpers for the backend `user.roles` array model.
 *
 * Purpose: single place for role checks so screens never compare raw strings.
 * A user can hold several roles at once (e.g. ['customer', 'business_owner']).
 */

export const USER_ROLES = {
	CUSTOMER: 'customer',
	BUSINESS_OWNER: 'business_owner',
	SUPER: 'super'
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

export interface WithRoles {
	roles?: string[] | null
}

/** True when the user holds any of the given roles. */
export const hasRole = (user: WithRoles | null | undefined, ...roles: string[]): boolean => {
	const held = user?.roles ?? []
	return roles.some((role) => held.includes(role))
}

/** Highest-privilege role for display, preferring owner/admin over customer. */
export const displayRole = (roles?: string[] | null): string => {
	const held = roles ?? []
	if (held.includes(USER_ROLES.SUPER)) return USER_ROLES.SUPER
	if (held.includes(USER_ROLES.BUSINESS_OWNER)) return USER_ROLES.BUSINESS_OWNER
	return USER_ROLES.CUSTOMER
}

/** Human label for a role value (e.g. 'business_owner' -> 'BUSINESS OWNER'). */
export const formatRole = (role: string): string => role.replace(/_/g, ' ').toUpperCase()
