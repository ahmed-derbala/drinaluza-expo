import { FeedItem } from './feed.interface'
import { getGeoCoordinates } from '@/core/helpers/maps'
import { log } from '@/core/log'

export const businessContactCache = new Map<string, any>()

export const enrichFeedContacts = async (items: FeedItem[], updateState: (items: FeedItem[]) => void) => {
	const localContacts = new Map<string, any>()
	const localLocations = new Map<string, any>()

	for (const item of items) {
		if (item.card?.kind === 'business') {
			const bSlug = item.business?.slug || item.slug
			if (bSlug) {
				if (item.contact) {
					localContacts.set(bSlug, item.contact)
					businessContactCache.set(bSlug, item.contact)
				}
				if (item.business?.location) {
					localLocations.set(bSlug, item.business.location)
					businessContactCache.set(`${bSlug}_location`, item.business.location)
				}
			}
		}
		if (item.card?.kind === 'user' && item.contact && item.role === 'business_owner') {
			const ownerSlug = item.slug
			if (ownerSlug) {
				localContacts.set(ownerSlug, item.contact)
				businessContactCache.set(ownerSlug, item.contact)
			}
		}
	}

	let hasUpdates = false
	const enriched = items.map((item) => {
		if (item.card?.kind === 'product' && item.business) {
			const bSlug = item.business.slug
			const ownerSlug = item.business.owner?.slug
			const contact = businessContactCache.get(bSlug) || localContacts.get(bSlug) || businessContactCache.get(ownerSlug) || localContacts.get(ownerSlug)
			const location = businessContactCache.get(`${bSlug}_location`) || localLocations.get(bSlug)

			const hasNewContact = contact && !item.business.contact
			const hasNewLocation = location && !getGeoCoordinates(item.business.location)

			if (hasNewContact || hasNewLocation) {
				hasUpdates = true
				return {
					...item,
					business: {
						...item.business,
						...(hasNewContact ? { contact } : {}),
						...(hasNewLocation ? { location } : {})
					}
				}
			}
		}
		return item
	})

	if (hasUpdates) {
		updateState(enriched)
	}

	const missingSlugs = new Set<string>()
	for (const item of enriched) {
		if (item.card?.kind === 'product' && item.business && !item.business.contact) {
			const bSlug = item.business.slug
			if (bSlug && !businessContactCache.has(bSlug)) {
				missingSlugs.add(bSlug)
			}
		}
	}

	if (missingSlugs.size === 0) return

	try {
		const { getBusinessBySlug } = require('@/features/businesses/businesses.api')
		await Promise.all(
			Array.from(missingSlugs).map(async (slug) => {
				try {
					const res = await getBusinessBySlug(slug)
					if (res?.data) {
						if (res.data.contact) {
							businessContactCache.set(slug, res.data.contact)
						}
						if (res.data.location) {
							businessContactCache.set(`${slug}_location`, res.data.location)
						}
					}
				} catch (err) {
					log({
						level: 'error',
						label: 'enrichFeedContacts',
						message: `Failed to fetch contact for business: ${slug}`,
						error: err
					})
				}
			})
		)

		const fullyEnriched = enriched.map((item) => {
			if (item.card?.kind === 'product' && item.business && !item.business.contact) {
				const bSlug = item.business.slug
				const ownerSlug = item.business.owner?.slug
				const contact = businessContactCache.get(bSlug) || businessContactCache.get(ownerSlug)
				const location = businessContactCache.get(`${bSlug}_location`)

				if (contact || location) {
					return {
						...item,
						business: {
							...item.business,
							...(contact ? { contact } : {}),
							...(location ? { location } : {})
						}
					}
				}
			}
			return item
		})

		updateState(fullyEnriched)
	} catch (e) {
		log({
			level: 'error',
			label: 'enrichFeedContacts',
			message: 'Contact enrichment error',
			error: e
		})
	}
}
