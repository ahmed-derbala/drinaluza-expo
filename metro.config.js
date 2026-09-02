const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)

// Resolve @/ alias to ./src/ for Metro bundler
const srcDir = path.resolve(__dirname, 'src')

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName.startsWith('@/')) {
        const newModuleName = path.join(srcDir, moduleName.slice(2))
        return context.resolveRequest(context, newModuleName, platform)
    }
    return context.resolveRequest(context, moduleName, platform)
}

// Performance optimizations
config.transformer = {
    ...config.transformer,
    // Enable inline requires to reduce initial bundle parse time
    inlineRequires: true,
    // Minifier config: drop console.* in production
    minifierConfig: {
        compress: {
            drop_console: true,
        },
    },
}
config.resolver.unstable_enablePackageExports = true

module.exports = config
