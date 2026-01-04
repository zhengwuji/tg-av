import { reqJavbus } from '../utils/javbus.js'
import Telegram from '../utils/telegram.js'
import { BOT_TOKEN } from '../config/index.js'

// A list of common prefixes to generate random codes
const PREFIXES = ['SSNI', 'IPX', 'MIDE', 'EBOD', 'JUFE', 'ATID', 'WANZ', 'MIAA', 'PRED', 'JUL']

export default async function randomJav(message) {
    const bot = new Telegram(BOT_TOKEN, message)
    const chatId = message.chat_id

    try {
        await bot.sendText(chatId, "正在随机抽取车牌...")

        // Simple random strategy: Pick a prefix and a random number
        const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)]
        const number = Math.floor(Math.random() * 900) + 10 // 010 to 910
        const code = `${prefix}-${number.toString().padStart(3, '0')}`

        await bot.sendText(chatId, `尝试获取: ${code}`)

        let { title, cover, magnet, list } = await reqJavbus(code)

        if (!title) {
            await bot.sendText(chatId, `运气不好，${code} 没有找到，请重试。`)
            return
        }

        const media = {
            url: cover || '',
            caption: title || ''
        }
        await bot.sendPhoto(chatId, media)

        if (magnet.length > 0) {
            let msg = `\n----------------------\n随机推荐: ${code}`
            msg += `\n磁力链数量: ${magnet.length}`
            // Show first magnet
            msg += `\n首个磁力: <code>${magnet[0].link}</code>`
            await bot.sendText(chatId, msg)
        } else {
            await bot.sendText(chatId, "找到影片但没有磁力链接")
        }

    } catch (e) {
        await bot.sendText(chatId, `随机获取失败: ${e.message}`)
    }
}
