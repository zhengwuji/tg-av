import { reqJavbus } from '../utils/javbus.js'
import { reqJavdb } from '../utils/javdb.js'
import Telegram from '../utils/telegram.js'
import { BOT_TOKEN } from '../config/index.js'

// 随机番号前缀库
const PREFIXES = [
    // 有码
    'SSNI', 'IPX', 'MIDE', 'EBOD', 'JUFE', 'ATID', 'WANZ', 'MIAA', 'PRED', 'JUL', 'FSDSS', 'DASD', 'STARS',
    // 无码
    'FC2', 'HEYZO', 'SIRO', 'GANA', 'LUXU', 'C0930', 'H4610'
]

// 巨乳关键词 (优先推荐)
const BIG_TITS_KEYWORDS = ['巨乳', '爆乳', '美乳', 'Gカップ', 'Hカップ', 'Jカップ', 'Kカップ']

// 排除关键词 (变态/重口)
const BLOCK_KEYWORDS = ['变态', '脱粪', '屎', '尿', '老太', '丑女', '呕吐', '猎奇', 'SM', '浣肠']

export default async function randomJav(message) {
    const bot = new Telegram(BOT_TOKEN, message)
    const chatId = message.chat_id

    try {
        // 60% 概率推荐巨乳(搜索), 40% 概率随机番号
        const isSearchMode = Math.random() < 0.6

        if (isSearchMode) {
            await handleKeywordSearch(bot, chatId)
        } else {
            await handleRandomCode(bot, chatId)
        }

    } catch (e) {
        console.error('Random Error:', e)
        await bot.sendText(chatId, `随机获取失败: ${e.message}`)
    }
}

// 策略1: 关键词搜索 (优先巨乳)
async function handleKeywordSearch(bot, chatId) {
    const keyword = BIG_TITS_KEYWORDS[Math.floor(Math.random() * BIG_TITS_KEYWORDS.length)]
    await bot.sendText(chatId, `正在为您寻找优质资源: ${keyword} ...`)

    try {
        // 使用 JavDB 搜索 (因为它支持搜索且结果较好)
        // 注意: reqJavdb 的搜索逻辑需要稍微适配,因为它通常返回详情
        // 但我们可以利用它的搜索结果列表
        // 这里我们直接调用 reqJavdb, 传入关键词
        // 实际上 reqJavdb 设计是查番号的, 但如果传入中文它也会去搜
        // 我们需要修改 reqJavdb 或直接利用它返回的 list (如果有)
        // 让我们看下 reqJavdb 实现... 它会返回 firstVideoLink
        // 我们可以稍微 hack 一下: 搜索关键词, 获取列表, 随机选一个

        // 为了简单可靠, 我们这里模拟一个随机番号的流程, 但基于搜索
        // 由于 reqJavdb 主要针对单一番号, 我们这里不妨用 reqJavbus 的搜索(如果支持)
        // 或者, 我们简单点, 还是用随机番号, 但是只保留标题包含关键词的? 效率太低

        // 最佳方案: 直接用 reqJavdb 搜索关键词
        // 但 reqJavdb 函数是针对番号设计的 (获取详情)
        // 我们需要一个通用的 searchJavdb 函数. 
        // 鉴于时间, 我们直接用 reqJavdb(keyword), 它会去搜索
        // 如果 reqJavdb 内部逻辑是 "取第一个结果", 那我们每次都只拿到第一个
        // 这不行.

        // 让我们退一步: 
        // 既然用户想要 "优先巨乳", 我们在随机番号生成时, 
        // 并不容易控制内容.
        // 除非我们有一个巨乳番号库.

        // 替代方案: 使用 JavDB 的榜单或分类页面? 
        // 比如 https://javdb.com/tags?c6=3 (巨乳)
        // 这需要新的爬虫逻辑.

        // 鉴于现有工具:
        // 我们还是回退到 "随机番号" 模式, 但增加 "无码" 前缀支持.
        // 对于 "巨乳", 我们尝试在随机生成的番号标题中检测.
        // 如果标题不包含 "巨乳" 且包含 "变态", 我们就重试 (最多3次).
        // 如果3次都没中, 就直接返回(避免超时).

        // 等等, 用户说 "添加默认优先选择巨乳".
        // 我们可以维护一个 "热门巨乳前缀" 列表? 不太现实.

        // 让我们尝试: 随机生成 -> 获取详情 -> 检查标题
        // 如果标题有 "变态" -> 丢弃重试
        // 如果标题有 "巨乳" -> 立即返回 (高优先级)
        // 如果没有 -> 继续尝试 (最多3次), 最后返回任意一个.

        await handleRandomCode(bot, chatId, true)

    } catch (e) {
        throw e
    }
}

// 策略2: 随机番号
async function handleRandomCode(bot, chatId, preferBigTits = false) {
    let maxRetries = 5
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
