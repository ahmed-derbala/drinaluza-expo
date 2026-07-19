import fs from 'fs';
const packagejson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

// 1. Check if we are building for development or production
const IS_DEV = process.env.EXPO_PUBLIC_APP_ENV === 'development';
export default {
    expo: {
        // 2. Give the dev app a distinct name so you can tell them apart on your phone
        name: IS_DEV ? `${packagejson.name}-dev` : packagejson.name,
        slug: packagejson.name,
        version: packagejson.version,
        platforms: [
            "ios",
            "android",
            "web"
        ],
        orientation: "default",
        icon: IS_DEV ? "./assets/images/icon_dev.png" : "./assets/images/icon.png",
        // 3. Keep schemes unique so deep links routes correctly
        scheme: IS_DEV ? "drinaluza-dev" : "drinaluza",
        userInterfaceStyle: "dark",
        backgroundColor: "#000000",
        newArchEnabled: true,
        ios: {
            supportsTablet: true,
            infoPlist: {
                NSAppTransportSecurity: {
                    NSAllowsArbitraryLoads: true
                }
            },
            // 4. Unique iOS bundle ID for development
            bundleIdentifier: IS_DEV ? "com.ahmedderbala.drinaluza.dev" : "com.ahmedderbala.drinaluza"
        },
        android: {
            backgroundColor: "#000000",
            googleServicesFile: "google-services.json",
            softwareKeyboardLayoutMode: "resize",
            statusBar: {
                translucent: false,
                backgroundColor: "#000000"
            },
            adaptiveIcon: {
                //foregroundImage: "./assets/images/adaptive-icon.png",
                foregroundImage: IS_DEV ? "./assets/images/icon_dev.png" : "./assets/images/icon.png",
                backgroundColor: "#000000"
            },
            // 5. Unique Android package name so both apps install side-by-side!
            package: IS_DEV ? "com.ahmedderbala.drinaluza.dev" : "com.ahmedderbala.drinaluza",
            versionCode: 1,
            permissions: [
                "android.permission.REQUEST_INSTALL_PACKAGES"
            ]
        },
        web: {
            bundler: "metro",
            output: "static",
            //favicon: "./assets/images/favicon.png"
            favicon: IS_DEV ? "./assets/images/icon_dev.png" : "./assets/images/icon.png",
        },
        plugins: [
            "expo-font",
            "expo-router",
            "expo-asset",
            "expo-secure-store",
            "@react-native-community/datetimepicker",
            "expo-audio",
            "expo-sharing",
            "expo-image",
            [
                "expo-build-properties",
                {
                    android: {
                        usesCleartextTraffic: true,
                        enableProguardInReleaseBuilds: true,
                        ndk: {
                            abiFilters: [
                                "arm64-v8a"
                            ]
                        },
                        packagingOptions: {
                            pickFirst: [
                                "**/libhermes.so",
                                "**/libc++_shared.so"
                            ]
                        }
                    }
                }
            ],
            [
                "expo-splash-screen",
                {
                    image: IS_DEV ? "./assets/images/icon_dev.png" : "./assets/images/icon.png",
                    resizeMode: "contain",
                    backgroundColor: "#000000",
                    //imageWidth: 200 // Adjust this number to make your icon larger or smaller on the screen
                }
            ]
        ],
        experiments: {
            typedRoutes: true
        },
        extra: {
            routerRoot: "src",
            router: {},
            NODE_ENV: process.env.EXPO_PUBLIC_NODE_ENV || 'local',
            eas: {
                projectId: "663c7ecc-f495-4630-9913-c923ef3f8bb2"
            }

        },
        jsEngine: "hermes",
        buildCacheProvider: "eas",
        updates: {
            url: "https://u.expo.dev/663c7ecc-f495-4630-9913-c923ef3f8bb2"
        },
        runtimeVersion: {
            policy: "appVersion"
        }
    }
};