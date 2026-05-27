---
trigger: always_on
---

## App Update Rules

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

Required updates should block app usage until updated.
Optional updates should allow the user to continue using the app.

check for updates using this link
EXPO_PUBLIC_UPDATE_CHECK_URL

download an update using this link
EXPO_PUBLIC_UPDATE_DOWNLOAD_ROOT_URL

keep the latest apk file only