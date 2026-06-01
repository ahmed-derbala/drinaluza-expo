## AppUpdater
based on the rules from .agent/rules/, create AppUpdater component:
src/app/updates/ (expo-router)
src/core/app-updater/

AppUpdater is responsible for checking, downloading and installing updates.

check for updates using config.UPDATE_CHECK_URL link
example responce of config.UPDATE_CHECK_URL:
```{
  "url": "https://api.github.com/repos/ahmed-derbala/drinaluza-expo-releases/releases/331661002",
  "assets_url": "https://api.github.com/repos/ahmed-derbala/drinaluza-expo-releases/releases/331661002/assets",
  "upload_url": "https://uploads.github.com/repos/ahmed-derbala/drinaluza-expo-releases/releases/331661002/assets{?name,label}",
  "html_url": "https://github.com/ahmed-derbala/drinaluza-expo-releases/releases/tag/v1.16.2",
  "id": 331661002,
  "author": {
    "login": "ahmed-derbala",
    "id": 30319876,
    "node_id": "MDQ6VXNlcjMwMzE5ODc2",
    "avatar_url": "https://avatars.githubusercontent.com/u/30319876?v=4",
    "gravatar_id": "",
    "url": "https://api.github.com/users/ahmed-derbala",
    "html_url": "https://github.com/ahmed-derbala",
    "followers_url": "https://api.github.com/users/ahmed-derbala/followers",
    "following_url": "https://api.github.com/users/ahmed-derbala/following{/other_user}",
    "gists_url": "https://api.github.com/users/ahmed-derbala/gists{/gist_id}",
    "starred_url": "https://api.github.com/users/ahmed-derbala/starred{/owner}{/repo}",
    "subscriptions_url": "https://api.github.com/users/ahmed-derbala/subscriptions",
    "organizations_url": "https://api.github.com/users/ahmed-derbala/orgs",
    "repos_url": "https://api.github.com/users/ahmed-derbala/repos",
    "events_url": "https://api.github.com/users/ahmed-derbala/events{/privacy}",
    "received_events_url": "https://api.github.com/users/ahmed-derbala/received_events",
    "type": "User",
    "user_view_type": "public",
    "site_admin": false
  },
  "node_id": "RE_kwDOSps3nM4TxL7K",
  "tag_name": "v1.16.2",
  "target_commitish": "main",
  "name": "Release v1.16.2",
  "draft": false,
  "immutable": false,
  "prerelease": false,
  "created_at": "2026-05-29T17:13:04Z",
  "updated_at": "2026-05-29T17:15:54Z",
  "published_at": "2026-05-29T17:15:54Z",
  "assets": [
    {
      "url": "https://api.github.com/repos/ahmed-derbala/drinaluza-expo-releases/releases/assets/433199132",
      "id": 433199132,
      "node_id": "RA_kwDOSps3nM4Z0hgc",
      "name": "drinaluza-1.16.2.apk",
      "label": "",
      "uploader": {
        "login": "ahmed-derbala",
        "id": 30319876,
        "node_id": "MDQ6VXNlcjMwMzE5ODc2",
        "avatar_url": "https://avatars.githubusercontent.com/u/30319876?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/ahmed-derbala",
        "html_url": "https://github.com/ahmed-derbala",
        "followers_url": "https://api.github.com/users/ahmed-derbala/followers",
        "following_url": "https://api.github.com/users/ahmed-derbala/following{/other_user}",
        "gists_url": "https://api.github.com/users/ahmed-derbala/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/ahmed-derbala/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/ahmed-derbala/subscriptions",
        "organizations_url": "https://api.github.com/users/ahmed-derbala/orgs",
        "repos_url": "https://api.github.com/users/ahmed-derbala/repos",
        "events_url": "https://api.github.com/users/ahmed-derbala/events{/privacy}",
        "received_events_url": "https://api.github.com/users/ahmed-derbala/received_events",
        "type": "User",
        "user_view_type": "public",
        "site_admin": false
      },
      "content_type": "application/vnd.android.package-archive",
      "state": "uploaded",
      "size": 112732026,
      "digest": "sha256:910818185b7e63489be80367ce347667c90e9d6f48e1107e4190b7702d8c891a",
      "download_count": 3,
      "created_at": "2026-05-29T17:13:08Z",
      "updated_at": "2026-05-29T17:15:53Z",
      "browser_download_url": "https://github.com/ahmed-derbala/drinaluza-expo-releases/releases/download/v1.16.2/drinaluza-1.16.2.apk"
    }
  ],
  "tarball_url": "https://api.github.com/repos/ahmed-derbala/drinaluza-expo-releases/tarball/v1.16.2",
  "zipball_url": "https://api.github.com/repos/ahmed-derbala/drinaluza-expo-releases/zipball/v1.16.2",
  "body": "# Changelog\n\n## [1.16.1] - 2026-05-29\n### various bug fixes"
}
```

create a function that takes config.UPDATE_CHECK_URL as input and returns from the response this object:
{
  name,
  published_at,
  latest_version (tag_name),
  size,
  download_count,
  changelog (body),
  download_url (browser_download_url)
}

### in updates screen show:
on android:
- check for updates button
- name 
- published date
- current version
- latest version
- size
- device free storage size
- download count
- whats new (changelog)
- list of downloaded apk files details with delete button next to each one. 
- download button. disable if the current version is higher than the latest version
- download progress
- install button when download is completed or if there is a downloaded apk file ready to install
- share button, use expo-sharing:
    - ask the user if he wants to share the download url or cached apk file (if exists).
    - if sharing apk file is choosen: show a dialog recommending using quick share for faster share with other devices

use SmartScreenHeader to show an update HeaderAction in the headerRight in all screens with download progress, when download is complete change to an install icon. the press on update HeaderAction opens /updates screen if it is not already open.

on web:
- check for updates button
- name 
- published date
- current version 
- latest version
- size
- download count
- whats new (changelog)
- download button
- refresh button that refreshes the page. if current version is higher than latest version disable the refresh button
- copy button: copy download url to clipboard


### Behavior requirements:
-when app starts:
  - on android:
    - check for updates:
      - if current version is equal or higher than latest version:
        - check if there is a downloaded apk file ready to install (apk file version is higher than current version):
          - if yes: install the apk file
          - if no: continue to the app
      - if current version is lower than latest version:
        - open /updates

  - on web: do not check for updates when app starts

- keep only the latest version apk file
- Avoid white screen or flickering during startup
- when app starts prevent rendering home screen before update check completes
- Prevent navigation race conditions
- Update check must have timeout protection, use config.TIMEOUT_MS
- Handle offline/network failure gracefully
- If update check fails:
  - continue to app normally

- Use proper async cancellation and cleanup to avoid memory leaks.

