## AppUpdater

in src/core/app-updater/ create AppUpdater component wich is responsible for checking and downloading updates.

Use semantic version comparison for update behavior.

Current app version format:
MAJOR.MINOR.PATCH

Examples:
1.2.3
2.5.0

Rules:

- If the latest version has a different MAJOR version than the current version:
  Example:
  Current: 1.2.x
  Latest: 2.x.y

  → This is a REQUIRED update.

- If the latest version has the same MAJOR version but a higher MINOR version:
  Example:
  Current: 1.2.x
  Latest: 1.3.x

  → This is a REQUIRED update.

- If only the PATCH version is higher:
  Example:
  Current: 1.2.x
  Latest: 1.2.z

  → This is an OPTIONAL update.

  - If the latest version is lower than the current version do nothing

Required updates should block app usage until updated. except for web version you should just refresh the page.
Optional updates should allow the user to continue using the app.

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
  "body": "# Changelog\n\n## [1.16.1] - 2026-05-29\n### Added\n- Completely rewrote `KeyboardSafeView` and `KeyboardSafeFlatList` from scratch as highly robust, cross-platform, layout-aware containers.\n- Integrated automatic scroll-to-focused-input automation leveraging standard host measurements relative to viewport wrapping containers on Native and Web.\n- Added configurable `bottomOffset` and `dismissKeyboardOnTap` properties to customize padding and background tap dismiss behavior.\n- Supported seamless landscape and portrait orientation transitions with automatic layout recalculation when keyboard height changes.\n- Completely rewrote the authentication route (`/auth`) from scratch to provide a stunning premium-tier interface with advanced saved accounts lists, flag selector buttons, strict validation sanitizers, custom checkbox components, and complete storage destruction buttons.\n\n### Fixed\n- Fixed layout overlap, flickering, and jumps when virtual keyboards are triggered inside nested navigators, modals, and tab views across Android and iOS.\n\n##"
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


keep only the latest version apk file in cache

in update modal show:
- update type (required/optional)
- message text based on update type:
  REQUIRED → "a new update is available, please update your app to continue using it"
  OPTIONAL → "a new update is available, you can update your app to continue using it"
- name 
- published date
- current version (version installed on device)
- latest version
- size: size in MB
- device free storage size
- download count
- whats new (changelog)
- exit button (exit app) for required update and later button (closes the modal or continue app loading) for optional update that close the modal
- update button that downloads the update

check for updates on app startup
use SmartScreenHeader to show download progress in the rightContent for OPTIONAL update 

in /settings add a section for app updates with this UI:
- check for updates button
- current version
- latest version
- size
- download count
- cached apk file if available with delete button next to it.
- share button:
  - on android: use expo-sharing
    - opt to share download url or cached apk file. advice the user to use quick share for fast sharing with other devices.
  - on web: copy download url to clipboard  


Implement app update checking in parallel with the splash screen lifecycle.

Requirements:

- App startup flow:
  1. Splash screen appears immediately on app launch
  2. Update check starts immediately in parallel
  3. Do NOT navigate to the main app yet
  4. Keep splash screen visible while checking for updates
  5. If update exists:
     - hide splash screen
     - display update modal
     - block access to app if update is required
  6. If no update exists:
     - hide splash screen
     - render the normal app/home screen

Behavior requirements:

- Avoid white screen or flickering during startup
- Prevent rendering home screen before update check completes
- Prevent navigation race conditions
- Ensure splash screen remains smooth during async operations
- Update check must have timeout protection, use config.TIMEOUT_MS
- Handle offline/network failure gracefully
- If update check fails:
  - continue to app normally

Architecture requirements:

- Update checking logic must be centralized in:
  `src/core/app-updater/`

- Startup state should include:
  - initializing
  - checkingUpdate
  - updateAvailable
  - updateRequired
  - ready
  - error

- Use a startup gate pattern:
  - splash screen acts as startup gate
  - app content renders only after startup resolution

- The update modal must:
  - appear above navigation
  - work on Android, iOS
  - support optional and required updates
  - support loading/progress state

- Use proper async cancellation and cleanup to avoid memory leaks.

- Optimize startup performance:
  - run update check concurrently with other startup tasks
  - avoid unnecessary rerenders
  - memoize provider values where appropriate

