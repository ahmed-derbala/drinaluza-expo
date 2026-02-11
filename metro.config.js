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

module.exports = config
