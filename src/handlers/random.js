import { reqJavbus } from '../utils/javbus.js'
import { reqJavdb } from '../utils/javdb.js'
import Telegram from '../utils/telegram.js'
import { BOT_TOKEN } from '../config/index.js'

import { CATEGORIES } from '../data/categories.js'

// 随机番号前缀库
const PREFIXES = [
    // 有码
    'SSNI', 'IPX', 'MIDE', 'EBOD', 'JUFE', 'ATID', 'WANZ', 'MIAA', 'PRED', 'JUL', 'FSDSS', 'DASD', 'STARS',
    // 无码
    'FC2', 'HEYZO', 'SIRO', 'GANA', 'LUXU', 'C0930', 'H4610'
    let bestResult = null

    await bot.sendText(chatId, "正在随机抽取车牌 (智能筛选中)...")

    for (let i = 0; i < maxRetries; i++) {
    // 随机前缀
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)]
    const number = Math.floor(Math.random() * 900) + 10
    const code = `${prefix}-${number.toString().padStart(3, '0')}`

    try {
        console.log(`Random try ${i + 1}: ${code}`)
        const result = await reqJavbus(code)

        if (!result.title) continue // 没找到

        const title = result.title

        // 检查屏蔽词
        if (BLOCK_KEYWORDS.some(k => title.includes(k))) {
            console.log(`Skipped blocked content: ${title}`)
            continue
        }

        // 如果是优先巨乳模式
        if (preferBigTits) {
            if (BIG_TITS_KEYWORDS.some(k => title.includes(k))) {
                // 找到了巨乳!
                bestResult = { ...result, code }
                break
            }
        }

        // 暂存一个有效结果 (作为保底)
        if (!bestResult) {
            bestResult = { ...result, code }
        }

        // 如果不是优先模式, 找到一个有效的就返回
        if (!preferBigTits) break

    } catch (e) {
        // ignore error and retry
    }
}

if (bestResult) {
    const { title, cover, magnet, code } = bestResult
    const media = {
        url: cover || '',
        caption: title || ''
    }
    await bot.sendPhoto(chatId, media)

    if (magnet.length > 0) {
        let msg = `\n----------------------\n随机推荐: ${code}`
        msg += `\n磁力链数量: ${magnet.length}`
        msg += `\n首个磁力: <code>${magnet[0].link}</code>`
        await bot.sendText(chatId, msg)
    } else {
        await bot.sendText(chatId, `找到影片 ${code} 但没有磁力链接`)
    }
} else {
    await bot.sendText(chatId, "运气不好，随机几次都没找到满意的资源，请重试。")
}
}
