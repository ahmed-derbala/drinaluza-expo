const {
    withGradleProperties,
    createRunOncePlugin,
} = require('expo/config-plugins');

const withGradleOptimization = (config) => {
    return withGradleProperties(config, (config) => {
        const keys = [
            'org.gradle.daemon',
            'org.gradle.parallel',
            'org.gradle.configureondemand',
            'org.gradle.caching',
            'org.gradle.jvmargs',
            'kotlin.incremental',
            'kotlin.daemon.jvmargs',
            'android.enableShrinkResourcesInReleaseBuilds',
            'android.enableMinifyInReleaseBuilds',
            'android.useAndroidX',
            'android.enableJetifier',
            'android.defaults.buildfeatures.buildconfig',
            'android.nonTransitiveRClass',
            'android.nonFinalResIds'
        ];

        // Filter out existing keys to avoid duplicates
        config.modResults = config.modResults.filter(item => !keys.includes(item.key));

        config.modResults.push(
            // Build Speed Optimizations
            { type: 'property', key: 'org.gradle.daemon', value: 'true' },
            { type: 'property', key: 'org.gradle.parallel', value: 'true' },
            { type: 'property', key: 'org.gradle.configureondemand', value: 'true' },
            { type: 'property', key: 'org.gradle.caching', value: 'true' },
            { type: 'property', key: 'org.gradle.jvmargs', value: '-Xmx4g -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError' },

            // Kotlin Optimizations
            { type: 'property', key: 'kotlin.incremental', value: 'true' },
            { type: 'property', key: 'kotlin.daemon.jvmargs', value: '-Xmx2g' },

            // App Size Optimizations (R8/ProGuard + Resource Shrinking)
            { type: 'property', key: 'android.enableShrinkResourcesInReleaseBuilds', value: 'true' },
            { type: 'property', key: 'android.enableMinifyInReleaseBuilds', value: 'true' },

            // AndroidX (jetifier disabled since modern libs don't need it)
            { type: 'property', key: 'android.useAndroidX', value: 'true' },
            { type: 'property', key: 'android.enableJetifier', value: 'false' },

            // Faster R class generation
            { type: 'property', key: 'android.defaults.buildfeatures.buildconfig', value: 'true' },
            { type: 'property', key: 'android.nonTransitiveRClass', value: 'true' },
            { type: 'property', key: 'android.nonFinalResIds', value: 'true' }
        );
        return config;
    });
};

module.exports = createRunOncePlugin(withGradleOptimization, 'withAndroidOptimization', '1.0.0');
