## updates
apply rules from .agent/rules/

updates component is responsible for checking, downloading and installing updates.

use these directories:
src/app/updates/ (expo-router)
src/features/updates/

use modern ui

check for updates using config.UPDATE_CHECK_URL 
example responce of config.UPDATE_CHECK_URL:
```{
  "tag_name": "v1.16.2",
  "name": "Release v1.16.2",
  "published_at": "2026-05-29T17:15:54Z",
  "assets": [
    {
      "name": "drinaluza-1.16.2.apk",
      "content_type": "application/vnd.android.package-archive",
      "size": 112732026,
      "download_count": 3,
      "browser_download_url": "https://github.com/ahmed-derbala/drinaluza-expo-releases/releases/download/v1.16.2/drinaluza-1.16.2.apk"
    }
  ],
  "body": "Changelog"
}
```

create a function that takes config.UPDATE_CHECK_URL as input and returns from the response this object:
{
  name,
  published_at,
  latest_version,
  size,
  download_count,
  changelog (body),
  download_url (browser_download_url)
}

### in updates screen show:
on android:
- check for updates button
- published date
- current version
- latest version
- size
- device free storage size
- download count
- list of downloaded apk files from cache with their details, delete and install buttons next to each one. 
- download button. disable if the current version is equal or higher than the latest version
- download progress
- share button. use expo-sharing:
    - ask the user to share the download url or the downloaded apk file if exists in cache.
      - if sharing apk file is choosen: show a dialog recommending using quick share for faster share with other devices
- whats new (changelog)

use SmartKebabMenu to show download progress next to updates menu item.
when download is complete trigger an apk file install immediately.

on web:
- check for updates button
- published date
- current version 
- latest version
- size
- download count
- download button
- refresh button. disable if the current version is equal or higher than the latest version
- share button: copy download url to clipboard
- whats new (changelog)


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

- if there is no previous screen, the back button opens /feed
- keep only the latest version apk file
- Avoid white screen or flickering during startup
- when app starts prevent rendering home screen before update check completes
- Prevent navigation race conditions
- Update check must have timeout protection, use config.TIMEOUT_MS
- Handle offline/network failure gracefully
- If update check fails:
  - continue to app normally

- Use proper async cancellation and cleanup to avoid memory leaks.

