# Drinaluza Expo

Drinaluza is a mobile-first application designed to empower small businesses by providing comprehensive management tools alongside a seamless shopping experience for customers. Built with Expo and React Native, it bridges the gap between local businesses and their community.

## 🚀 Features

### For Customers
*   **Feed**: Discover new products and updates from local businesses.
*   **Shops**: Browse a directory of shops and view detailed shop profiles.
*   **Orders**: Track purchase history and current order status.
*   **Profile**: Manage personal information and settings.
*   **Customer Dashboard**: A personalized hub for your activity.

### For Business Owners
*   **Business Dashboard**: A dedicated command center for your business operations.
*   **Shop Management**: Create and manage multiple shops.
*   **Product Management**: deeply integrated tools to add, edit, and list products with categories and details.
*   **Sales Tracking**: Visualize sales data (powered by `react-native-chart-kit`).
*   **Inventory**: Keep track of "My Products" and "My Shops".

## 🛠 Tech Stack

*   **Framework**: [Expo SDK 54](https://expo.dev/)
*   **Core**: React Native, React 19
*   **Language**: TypeScript
*   **Navigation**: Expo Router (File-based routing)
*   **Networking**: Axios
*   **Storage**: `@react-native-async-storage/async-storage`, `expo-secure-store`
*   **UI/UX**: `react-native-gesture-handler`, `expo-linear-gradient`, `react-native-svg`

## 🏁 Getting Started

### Prerequisites

*   Node.js (v22 recommended as per engines)
*   npm or yarn
*   Expo CLI (or use `npx expo`)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/ahmed-derbala/drinaluza-expo.git
    cd drinaluza-expo
    ```

2.  **Install dependencies**
    You can use the helper script for the first time setup:
    ```bash
    npm run first-time:local
    ```
    Or manually:
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
    *   Press `w` for Web

## 📜 Available Scripts

*   `npm run dev` / `npm run start:local`: Starts the Expo development server with a clean cache.
*   `npm run start`: Standard Expo start command.
*   `npm run android`: Run on Android device/emulator.
*   `npm run ios`: Run on iOS simulator.
*   `npm run web`: Run in web browser.
*   `npm run clean`: comprehensive clean up of `node_modules`, `.expo` cache, and reinstall dependencies.
*   `npm run fix`: Runs expo-doctor, cleans cache, and reinstalls.
*   `npm run build`: Local production build for Android.
*   `npm run test`: Run Jest tests.
*   `npm run format`: Format code with Prettier.

## 📂 Project Structure

```
src/
├── app/                 # Expo Router screens and layouts
│   ├── auth/            # Authentication screens
│   └── home/            # Main application screens
│       ├── business/    # Business dashboard & management
│       ├── shops/       # Shop browsing
│       └── ...          # Profile, Feed, Settings
├── components/          # Reusable UI components
├── config/              # App configuration
├── constants/           # Global constants
├── contexts/            # React Context definitions
├── core/                # Core business logic/types
├── stores/              # State management
└── utils/               # Helper functions
```

## ✍️ Author

Ahmed Derbala
