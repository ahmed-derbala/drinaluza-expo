const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)

// Resolve @/ alias to ./src/ for Metro bundler
const srcDir = path.resolve(__dirname, 'src')

// Map: alias key -> subdirectory under src/
const aliasMap = {
    api: 'core/api',
    bootstrap: 'core/bootstrap',
    cache: 'core/cache',
    connection: 'core/connection',
    constants: 'core/constants',
    contexts: 'core/contexts',
    disk: 'core/disk',
    error: 'core/error',
    helpers: 'core/helpers',
    hooks: 'core/hooks',
    log: 'core/log',
    platform: 'core/platform',
    scroll: 'core/scroll',
    socketio: 'core/socketio',
    storage: 'core/storage',
    theme: 'core/theme',
    translation: 'core/translation',
    'smart-header': 'core/smart-header',
    'smart-kebab-menu': 'core/smart-kebab-menu',
    'smart-media': 'core/smart-media',
    'smart-tabs': 'core/smart-tabs',
    address: 'core/ui/address',
    badges: 'core/ui/badges',
    buttons: 'core/ui/buttons',
    cards: 'core/ui/cards',
    contact: 'core/ui/contact',
    forms: 'core/ui/forms',
    languages: 'core/ui/languages',
    location: 'core/ui/location',
    modals: 'core/ui/modals',
    qrcode: 'core/ui/qrcode',
    reviews: 'features/reviews',
    spinner: 'core/ui/spinner',
    states: 'core/ui/states',
    toast: 'core/ui/toast',
    about: 'features/about',
    auth: 'features/auth',
    businesses: 'features/businesses',
    customers: 'features/customers',
    dashboard: 'features/dashboard',
    feed: 'features/feed',
    notifications: 'features/notifications',
    order: 'features/orders',
    orders: 'features/orders',
    products: 'features/products',
    profile: 'features/profile',
    purchases: 'features/purchases',
    sales: 'features/sales',
    scanner: 'features/scanner',
    search: 'features/search',
    settings: 'features/settings',
    updates: 'features/updates',
    users: 'features/users',
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName.startsWith('@/')) {
        const newModuleName = path.join(srcDir, moduleName.slice(2))
        return context.resolveRequest(context, newModuleName, platform)
    }
    if (moduleName.startsWith('@') && !moduleName.startsWith('@/')) {
        const key = moduleName.slice(1).split('/')[0]
        if (aliasMap[key]) {
            const rest = moduleName.slice(1 + key.length)
            const newModuleName = path.join(srcDir, aliasMap[key] + rest)
            return context.resolveRequest(context, newModuleName, platform)
        }
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
