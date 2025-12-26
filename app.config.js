import 'dotenv/config';
import packagejson from './package.json' with { type: 'json' }

export default {
    expo: {
        name: packagejson.name,
        slug: packagejson.name,
        version: packagejson.version,
        platforms: [
            "ios",
            "android",
            "web"
        ],
        orientation: "default",
        icon: "./assets/images/icon.png",
        scheme: "drinaluza",
        userInterfaceStyle: "automatic",
        newArchEnabled: true,
        splash: {
            image: "./assets/images/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: "#1C2526"
        },
        ios: {
            supportsTablet: true,
            infoPlist: {
                NSAppTransportSecurity: {
                    NSAllowsArbitraryLoads: true
                }
            },
            bundleIdentifier: "com.ahmedderbala.drinaluza"
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/images/adaptive-icon.png",
                backgroundColor: "#1C2526"
            },
            edgeToEdgeEnabled: true,
            package: "com.ahmedderbala.drinaluza",
            versionCode: 1
        },
        web: {
            bundler: "metro",
            output: "static",
            favicon: "./assets/images/favicon.png"
        },
        plugins: [
            "expo-router",
            [
                "expo-build-properties",
                {
                    android: {
                        usesCleartextTraffic: true,
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
            "@react-native-community/datetimepicker"
        ],
        experiments: {
            typedRoutes: true
        },
        extra: {
            routerRoot: "src",
            router: {},
            eas: {
        projectId: "663c7ecc-f495-4630-9913-c923ef3f8bb2"
      }

        },
        jsEngine: "hermes",
        runtimeVersion: {
            policy: "appVersion"
        },
        updates: {
            url: "https://u.expo.dev/cf16d9ec-c8c7-457f-b2a2-6d5eacf535d1"
        },
        buildCacheProvider: "eas"
    }
};
