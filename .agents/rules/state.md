---
trigger: always_on
---

in the mongo database, documents of some collections like users, products, businesses have state field

export const STATES = {
	PENDING: 'pending',
	ACTIVE: 'active',
	SUSPENDED: 'suspended',
	DELETED: 'deleted',
}