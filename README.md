# 🛒 Drinaluza

**Drinaluza** is a powerful, mobile-first marketplace application designed to empower small businesses and provide a seamless shopping experience for customers. Built on a modern React Native & Expo stack, it bridges the gap between local businesses and their community.

[![Download Android App](https://img.shields.io/badge/Download-Android_App-3DDC84?style=for-the-badge&logo=android)](https://drive.google.com/drive/folders/1euN1ogdssvbiq4wJdxYQBYqMXWbwIpBm?usp=drive_link)
[![Web App Netlify](https://img.shields.io/badge/Web_App-Netlify-00C7B7?style=for-the-badge&logo=netlify)](https://drinaluza.netlify.app/)
[![Web App Vercel](https://img.shields.io/badge/Web_App-Vercel-000000?style=for-the-badge&logo=vercel)](https://drinaluza.vercel.app/)

---

## 🚀 Features

### 🛍️ For Customers
*   **Dynamic Feed**: Discover new products and stay updated on local businesses.
*   **Business Directory**: Browse and view detailed, engaging business profiles.
*   **Order Tracking**: Seamlessly monitor purchase history and live order status.
*   **Profile Hub**: A comprehensive dashboard to manage personal information and settings.

### 🏪 For Business Owners
*   **Business Command Center**: A dedicated dashboard for multi-business operations.
*   **Product Management**: Deeply integrated, fluid tools to add, edit, and organize inventory with rich details.
*   **Real-time Analytics**: Visualize live sales data and track business growth.
*   **Intelligent Inventory**: Keep track of product status, low-stock warnings, and lifecycle operations.

---

## 🛠 Tech Stack

*   **Framework**: [Expo SDK](https://expo.dev/)
*   **Core**: React Native, React 
*   **Language**: TypeScript
*   **Navigation**: Expo Router (File-based routing)
*   **Networking**: Axios Custom Client
*   **Storage**: `@react-native-async-storage/async-storage`, `expo-secure-store`
*   **UI/UX**: `react-native-gesture-handler`, `expo-linear-gradient`, `react-native-svg`

---

## 🏁 Getting Started

### Prerequisites

*   Node.js LTS
*   npm
*   Expo CLI (or use `npx expo`)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/ahmed-derbala/drinaluza-expo.git
    cd drinaluza-expo
    ```

2.  **Install dependencies**
    You can use the built-in helper script for a complete initial setup:
    ```bash
    npm run first-time:local
    ```
    Or manually install standard dependencies:
    ```bash
    npm install
    ```

3.  **Run the application**
    
    Start the development server:
    ```bash
    npm run dev
    # or
    npm run start
    ```

    *   Press `a` for Android emulator
    *   Press `i` for iOS simulator
    *   Press `w` for Web environment

---

## 📂 Project Architecture

Drinaluza follows a clean, highly modular **feature-based architecture** to enforce separation of concerns and maintainability.

```text
src/
├── app/                 # Expo Router file-based route definitions
├── config/              # Environment configurations & layout constants
├── core/                # Core utilities, API clients, and React contexts
└── features/            # Feature modules (UI, API, Interfaces)
    ├── auth/            # Authentication workflows
    ├── business/        # Business administration & sales
    ├── businesses/      # Public business directories
    ├── common/          # Shared atomic components (Header, Toast, etc.)
    ├── dashboard/       # Unified dashboard and profile switching
    ├── feed/            # Activity feeds & algorithmic sorting
    ├── products/        # Product browsing & creation
    ├── profile/         # User profile management
    └── search/          # Global search components
```

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Expo development server with a clean cache. |
| `npm run start` | Standard Expo start command. |
| `npm run android` | Run on connected Android device/emulator. |
| `npm run ios` | Run on iOS simulator. |
| `npm run web` | Run as a responsive Web Application. |
| `npm run clean` | Deep clean of `node_modules`, `.expo` cache, and fresh reinstall. |
| `npm run build` | Local production build generator for Android APK/AAB. |
| `npm run format` | Enforce code style with Prettier. |

---

## ⚙️ Environment Configuration

### Gradle Settings (`~/.gradle/gradle.properties`)
For optimal Android build performance, ensure your gradle properties are set:
```properties
# =========================================================
# Java
# =========================================================
# download jdk from https://jdk.java.net/archive/
org.gradle.java.installations.auto-download=false
org.gradle.java.home=/usr/lib/jvm/jdk-17.0.2

# =========================================================
# Core Gradle Performance
# =========================================================

org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.configuration-cache=true
org.gradle.configuration-cache.problems=warn
org.gradle.vfs.watch=true

# =========================================================
# High RAM Optimization
# =========================================================

# 8 GB heap for Gradle daemon
# Good for Expo + React Native + Hermes + NDK
org.gradle.jvmargs=-Xmx8g -Xms4g \
-XX:MaxMetaspaceSize=2g \
-XX:+UseG1GC \
-XX:MaxGCPauseMillis=200 \
-Dfile.encoding=UTF-8 \
-Dkotlin.daemon.jvm.options=-Xmx4g

# =========================================================
# Kotlin
# =========================================================

kotlin.incremental=true
kotlin.code.style=official

# =========================================================
# Android Optimizations
# =========================================================

android.useAndroidX=true
android.enableJetifier=true

# Faster resource/R processing
android.nonTransitiveRClass=true
android.nonFinalResIds=true

# =========================================================
# React Native / Expo
# =========================================================

# Faster runtime and often better builds
hermesEnabled=true

# Enable only if dependencies support it
# newArchEnabled=true
```

### Android Environment (`~/.zshrc` or `~/.bashrc`)
Ensure the Android SDK is correctly linked in your terminal profile:
```bash
# === ANDROID SDK PATHS ===
export ANDROID_HOME=$HOME/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

# === ANDROID NDK PATHS ===
# Change the version number below to match your actual installed NDK folder
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk
export PATH=$PATH:$ANDROID_NDK_HOME
```

---

## ✍️ Author

**Ahmed Derbala**
