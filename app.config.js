import 'dotenv/config';
import fs from 'fs';
const packagejson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

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
        userInterfaceStyle: "dark",
        backgroundColor: "#000000",
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
            backgroundColor: "#000000",
            googleServicesFile: "google-services.json",
            softwareKeyboardLayoutMode: "resize",
            // Add this line to give Gradle 8GB of Heap and 2GB of Metaspace
            gradleArguments: ["-Dorg.gradle.jvmargs=-Xmx8192m -XX:MaxMetaspaceSize=2048m"],
            adaptiveIcon: {
                foregroundImage: "./assets/images/adaptive-icon.png",
                backgroundColor: "#1C2526"
            },
            package: "com.ahmedderbala.drinaluza",
            versionCode: 1
        },
        web: {
            bundler: "metro",
            output: "static",
            favicon: "./assets/images/favicon.png"
        },
        plugins: [
            "expo-font",
            "expo-router",
            "expo-asset",
            "expo-secure-store",
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
            "@react-native-community/datetimepicker",
            "expo-audio",
            "expo-sharing",
            "expo-image"
        ],
        experiments: {
            typedRoutes: true
        },
        extra: {
            routerRoot: "src",
            router: {},
            NODE_ENV: process.env.EXPO_PUBLIC_NODE_ENV || 'development',
            eas: {
                projectId: "663c7ecc-f495-4630-9913-c923ef3f8bb2"
            }

        },
        jsEngine: "hermes",
        runtimeVersion: {
            policy: "appVersion"
        },
        buildCacheProvider: "eas"
    }
};
