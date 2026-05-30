I am building a cross-platform Expo (React Native) application for a Business Manager app. I need a robust, clean Splash Screen component that handles initialization and coordinates with an app update check using AppUpdater before letting the user into the main application.

Requirements:
 Create reusable component in src/core/splash/ 
1. Splash Screen Component:
   - Use 'expo-splash-screen' to keep the native splash screen visible while loading.
   - The component should render a clean, professional business-themed loading UI (logo placeholder, a loading spinner, and status text like "Checking for updates..." or "Loading assets...").
   - It must handle asset preloading (fonts, essential icons) and state initialization using a `try/catch/finally` block.

2. AppUpdater Integration:
   - integrate an `AppUpdater` logic sequence within this initialization phase.

3. Coding Style:
   - Provide clear console logging for the initialization steps so I can debug the agent's execution flow.
   - Return clean, modular code separating the Splash/Update coordination logic from the UI presentation if necessary.