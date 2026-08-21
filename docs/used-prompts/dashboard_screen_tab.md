# dashboard screen tab
- do a complete redesign of dashboard screen
- use FilterTabs to switch between tabs (dashboard profiles: business (multiple), personal (single) ))
- use GET /api/dashboard/profiles to sort dashboard profiles
example response:
{
    "level": "verbose",
    "status": 200,
    "data": [
        {
            "_id": "6a875c2e98a82a36fe82b8c5",
            "user": {
                "_id": "6a875c2e98a82a36fe82b8c4",
                "slug": "ahmed",
                "name": {
                    "en": "Ahmed Derbala",
                    "tn_latn": "Ahmed Derbala",
                    "tn_arab": "Ahmed Derbala"
                },
                "role": "business_owner"
            },
            "kind": "personal",
            "topBusinesses": {
                "new": [],
                "frequent": []
            },
            "createdAt": "2026-08-20T19:57:34.313Z",
            "updatedAt": "2026-08-20T19:57:34.313Z",
            "__v": 0
        },
        {
            "_id": "6a875c2fd013b9ab505eba6b",
            "user": {
                "_id": "6a875c2e98a82a36fe82b8c4",
                "slug": "ahmed",
                "name": {
                    "en": "Ahmed Derbala",
                    "tn_latn": "Ahmed Derbala",
                    "tn_arab": "Ahmed Derbala"
                },
                "role": "customer"
            },
            "kind": "business",
            "business": {
                "_id": "6a875c2fd013b9ab505eba6a",
                "owner": {
                    "_id": "6a875c2e98a82a36fe82b8c4",
                    "slug": "ahmed",
                    "name": {
                        "en": "Ahmed Derbala",
                        "tn_latn": "Ahmed Derbala",
                        "tn_arab": "Ahmed Derbala"
                    },
                    "media": {
                        "gallery": []
                    }
                },
                "name": {
                    "en": "Drinaluza",
                    "tn_latn": "Drinaluza",
                    "tn_arab": "Drinaluza"
                },
                "slug": "drinaluza",
                "address": {
                    "street": "ellouza, tri9 douar",
                    "city": "Sfax",
                    "region": "Sfax",
                    "country": "Tunisia",
                },
                "location": {
                    "geo": {
                        "type": "Point",
                        "coordinates": [
                            10.18,
                            36.8
                        ]
                    },
                    "sharingEnabled": false,
                    "createdAt": "2026-08-20T19:57:35.933Z",
                    "updatedAt": "2026-08-20T19:57:35.933Z"
                },
                "media": {
                    "thumbnail": {
                        "url": "https://res.cloudinary.com/dyhvqubig/image/upload/v1783638507/uploads/cdyivmike6xfgfvmzcsx.png"
                    },
                    "gallery": []
                },
                "contact": {
                    "phone": {
                        "fullNumber": "+21699112619",
                        "countryCode": "216",
                        "localNumber": "99112619"
                    },
                    "backupPhones": [
                        {
                            "fullNumber": "+21699111222",
                            "countryCode": "216",
                            "localNumber": "99111222"
                        }
                    ],
                    "whatsapp": "+21699112619",
                    "email": "drinaluza@gmail.com"
                }
            },
            "products": {
                "count": 0,
                "lowStock": 0,
                "outOfStock": 0
            },
            "topProducts": {
                "selling": [],
                "viewed": []
            },
            "topCustomers": {
                "frequent": [],
                "new": []
            },
            "createdAt": "2026-08-20T19:57:35.941Z",
            "updatedAt": "2026-08-20T19:57:35.941Z",
            "__v": 0
        }
    ]
}

- cards should be based on BaseCard
- the press on personal profile opens /dashboard/personal/
- the press on a business profile opens /dashboard/{businessSlug}/