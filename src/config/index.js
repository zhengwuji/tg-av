// Helper to get environment variable with fallback
// Supports Node.js process.env and Cloudflare Worker globals
export const getEnv = (key, fallback) => {
    // Try Node.js process.env
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
    }
    // Try Cloudflare Worker global (if it exists in global scope)
    // In ES modules workers, bindings are usually passed to the fetch handler, 
    // but for global variable style (Service Worker syntax), they are globals.
    // We check globalThis to be safe.
    if (typeof globalThis !== 'undefined' && globalThis[key]) {
        return globalThis[key];
    }
    // Try direct global access (catch reference error if not defined)
    try {
        // eslint-disable-next-line no-undef
        if (eval(`typeof ${key} !== 'undefined'`)) {
            // eslint-disable-next-line no-undef
            return eval(key);
        }
    } catch (e) {
        // Ignore
    }

    return fallback;
}

export const ALLOWED_GROUPS = []
export const BOT_TOKEN = getEnv('BOT_TOKEN', '')
export const ROBOT_NAME = getEnv('ROBOT_NAME', '@your_bot_username')
export const ADMIN_ID = getEnv('ADMIN_ID', '') // 管理员ID,拥有无限制查看权限
export const TARGET_CHANNEL_ID = getEnv('TARGET_CHANNEL_ID', '') // 媒体转载目标频道ID
export const DOWNLOAD_PATH = getEnv('DOWNLOAD_PATH', '/tmp/bot_downloads') // 临时下载路径
