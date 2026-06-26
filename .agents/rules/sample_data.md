---
trigger: always_on
---

sample data to use for testing when needed

users:
 - user_1:
  - slug: ahmed
  - password: 123
  - role: business_owner
- user_2:
  - slug: abir
  - password: 123
  - role: customer

businesses:
 - business_1:
  - slug: drinaluza
  - owner:
   - slug: ahmed

products:
 - product_1:
  - slug: drinaluza-shrimp
  - business:
   - slug: drinaluza
  - name:
   - en: shrimp