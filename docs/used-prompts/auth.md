---
trigger: always_on
---

/auth is the authentication screen

recommended auth code locations
src/app/auth
src/features/auth

always use already built component when possible like storage, SmartImageViewer, translation, Toast, KeyboardSafeView

in the header:
- home icon: navigates to home screen
- reset icon: destory storage


show list of available app languages with horizontal scroll bar, only show flags:
- tunisian arabic (tn_arab) (default): Tunisia flag with letter "ع"
- tunisian latin (tn_latn): Tunisia flag with letter "A"
- english (en): USA flag 
- french (fr): France flag
- arabic (ar): Saoudi arabia flag


show list of saved accounts loaded from storage with vertical scroll bar:
- user photo
- user name based on the above selected language, defaults to english because only english is required in multilanguage fields in the database
- user slug
- last accessed date
- remove icon


show welcome form:
- slug textfield: 
    acceptes only lower case latin letters (a-z), latin numbers (0 1 2 3..9) and "-" character but it must be not the first or last character
- check box next to slug to choose to save to account list
    min length 1, max length 20
- password:
  min length 1, max length 20
- check box next to password to choose to require password when switching from account list
- continue button: based on POST /api/auth/signin responce
  - 200 success: signin
  - 404 no user found: ask the user if he wants to signup with that slug and password and that his public user profile will be accessible via EXPO_PUBLIC_FRONTEND_URL/u/:userSlug
  - 409 password incorrect: focus on password field informing the password is incorrect


auth apis:
- POST /api/auth/signin
example responces
{
    "level": "verbose",
    "status": 200,
    "data": {
        "user": {
            "_id": "6a178d11b007d2a0d3afb3a5",
            "slug": "ahmed",
            "name": {
                "en": "Ahmed Derbala"
            },
            "role": "business_owner"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Il9pZCI6IjZhMTc4ZDExYjAwN2QyYTBkM2FmYjNhNSIsInNsdWciOiJhaG1lZCIsIm5hbWUiOnsiZW4iOiJBaG1lZCBEZXJiYWxhIn0sInJvbGUiOiJidXNpbmVzc19vd25lciJ9LCJyZXEiOnsiaXAiOiI6OmZmZmY6MTkyLjE2OC4xLjExIiwiaGVhZGVycyI6eyJ1c2VyLWFnZW50IjoiUG9zdG1hblJ1bnRpbWUvNy41NC4wIn19LCJpYXQiOjE3ODAwNjM5MDMsImV4cCI6MTc4NzgzOTkwM30.H_1o-uxqIi6PF2cquAJHdY9zXo-E3i3MbomFikl7fEc"
    }
}

{
    "level": "warn",
    "status": 404,
    "message": "no user found with slug=ahmed4",
    "data": null
}

{
    "level": "warn",
    "status": 409,
    "message": "password incorrect",
    "data": null
}

- POST /api/auth/singup
example responces
{
    "level": "verbose",
    "status": 200,
    "data": {
        "user": {
            "slug": "ahmed2",
            "name": {
                "en": "ahmed2"
            },
            "role": "customer",
            "contact": {
                "backupPhones": []
            },
            "address": {
                "city": "Ellouza",
                "region": "Sfax",
                "country": "Tunisia"
            },
            "settings": {
                "lang": {
                    "app": "en",
                    "content": "tn_arab"
                },
                "currency": "tnd",
                "notifications": {
                    "isEnabled": true
                }
            },
            "_id": "6a199eec597594952f001088",
            "state": {
                "code": "active",
                "createdAt": "2026-05-29T14:13:00.356Z",
                "updatedAt": "2026-05-29T14:13:00.356Z"
            },
            "__v": 0
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InNsdWciOiJhaG1lZDIiLCJuYW1lIjp7ImVuIjoiYWhtZWQyIn0sInJvbGUiOiJjdXN0b21lciIsImNvbnRhY3QiOnsiYmFja3VwUGhvbmVzIjpbXX0sImFkZHJlc3MiOnsiY2l0eSI6IkVsbG91emEiLCJyZWdpb24iOiJTZmF4IiwiY291bnRyeSI6IlR1bmlzaWEifSwic2V0dGluZ3MiOnsibGFuZyI6eyJhcHAiOiJlbiIsImNvbnRlbnQiOiJ0bl9hcmFiIn0sImN1cnJlbmN5IjoidG5kIiwibm90aWZpY2F0aW9ucyI6eyJpc0VuYWJsZWQiOnRydWV9fSwiX2lkIjoiNmExOTllZWM1OTc1OTQ5NTJmMDAxMDg4Iiwic3RhdGUiOnsiY29kZSI6ImFjdGl2ZSIsImNyZWF0ZWRBdCI6IjIwMjYtMDUtMjlUMTQ6MTM6MDAuMzU2WiIsInVwZGF0ZWRBdCI6IjIwMjYtMDUtMjlUMTQ6MTM6MDAuMzU2WiJ9LCJfX3YiOjB9LCJyZXEiOnsiaXAiOiI6OmZmZmY6MTkyLjE2OC4xLjExIiwiaGVhZGVycyI6eyJ1c2VyLWFnZW50IjoiUG9zdG1hblJ1bnRpbWUvNy41NC4wIn19LCJpYXQiOjE3ODAwNjM5ODAsImV4cCI6MTc4NzgzOTk4MH0.QgnbRomf0CL6jqicvnrsl5ekNujk8IZ583hnpbcLVc8"
    }
}

{
    "level": "warn",
    "status": 409,
    "message": "user already exist",
    "data": null
}

- POST /api/auth/singout
example responces
{
    "level": "verbose",
    "status": 200,
    "message": "singedout",
    "data": {
        "acknowledged": true,
        "deletedCount": 1
    }
}

{
    "level": "warn",
    "status": 401,
    "message": "No token found on headers, cookies or query",
    "data": null
}

use KeyboardSafeView so when keyboard opens, the welcome form scrolls up to not be covered by the keyboard