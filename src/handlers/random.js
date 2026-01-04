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
]

// 巨乳关键词 (优先推荐)
const BIG_TITS_KEYWORDS = ['巨乳', '爆乳', '美乳', 'Gカップ', 'Hカップ', 'Jカップ', 'Kカップ']

// 排除关键词 (变态/重口)
const BLOCK_KEYWORDS = ['变态', '脱粪', '屎', '尿', '老太', '丑女', '呕吐', '猎奇', 'SM', '浣肠']

export default async function randomJav(message) {
    const bot = new Telegram(BOT_TOKEN, message)
    const chatId = message.chat_id

    // 显示随机推荐菜单
    const keyboard = {
        inline_keyboard: [
            [
                { text: '🎲 随便来一个', callback_data: 'random_direct' },
                { text: '🎯 精准筛选', callback_data: 'filter_main' }
            ]
        ]
    }

    await bot.sendMessage(chatId, '请选择推荐模式：', {
        reply_markup: JSON.stringify(keyboard)
    })
}

// 处理回调查询
export async function handleCallback(callbackQuery) {
    const bot = new Telegram(BOT_TOKEN, { chat_id: callbackQuery.message.chat.id })
    const chatId = callbackQuery.message.chat.id
    const data = callbackQuery.data
    const callbackId = callbackQuery.id

    console.log(`[HandleCallback] Data: ${data}, ChatID: ${chatId}`)

    try {
        // 必须响应回调,否则按钮会一直转圈
        await bot.answerCallbackQuery(callbackId)

        // 1. 直接随机
        if (data === 'random_direct') {
            await handleRandomCode(bot, chatId)
        }
        // 2. 显示主分类
        else if (data === 'filter_main') {
            const keyboard = {
                inline_keyboard: []
            }
            // 每行显示3个分类
            let row = []
            for (const category of Object.keys(CATEGORIES)) {
                row.push({ text: category, callback_data: `cat:${category}` })
                if (row.length === 3) {
                    keyboard.inline_keyboard.push(row)
                    row = []
                }
            }
            if (row.length > 0) keyboard.inline_keyboard.push(row)

            await bot.sendMessage(chatId, '请选择分类：', {
                reply_markup: JSON.stringify(keyboard)
            })
        }
        // 3. 显示子标签
        else if (data.startsWith('cat:')) {
            const category = data.split(':')[1]
            const tags = CATEGORIES[category]

            const keyboard = {
                inline_keyboard: []
            }
            // 每行显示4个标签
            let row = []
            for (const tag of tags) {
                row.push({ text: tag, callback_data: `tag:${tag}` })
                if (row.length === 4) {
                    keyboard.inline_keyboard.push(row)
                    row = []
                }
            }
            if (row.length > 0) keyboard.inline_keyboard.push(row)

            // 返回按钮
            keyboard.inline_keyboard.push([{ text: '🔙 返回分类', callback_data: 'filter_main' }])

            await bot.sendMessage(chatId, `【${category}】请选择标签：`, {
                reply_markup: JSON.stringify(keyboard)
            })
        }
        // 4. 标签搜索 (或翻页)
        else if (data.startsWith('tag:')) {
            const tag = data.split(':')[1]
            await handleTagSearch(bot, chatId, tag)
        }

    } catch (e) {
        console.error('Callback Error:', e)
        await bot.sendText(chatId, `操作失败: ${e.message}`)
    }
}

// 标签搜索逻辑
async function handleTagSearch(bot, chatId, tag) {
    await bot.sendText(chatId, `正在搜索【${tag}】相关的影片...`)

    try {
        // 使用 JavDB 搜索
        // 随机页码 1-5, 增加随机性
        // const page = Math.floor(Math.random() * 5) + 1

        // 调用 reqJavdb, 开启随机模式
        // 尝试最多5次以找到带磁链的结果
        let result = null
        for (let i = 0; i < 5; i++) {
            const tempResult = await reqJavdb(tag, { random: true })
            if (tempResult.title && tempResult.magnet && tempResult.magnet.length > 0) {
                result = tempResult
                break
            }
            // 如果是最后一次尝试且之前没找到, 就用最后一次的结果(即使没磁链)
            // 或者我们可以决定严格不返回? 用户说"没有磁链的能不选就不选" -> 最好还是严格点
            // 但如果真的没有, 还是告诉用户比较好
            if (i === 4 && !result) {
                result = tempResult
            }
        }

        if (!result || !result.title) {
            await bot.sendText(chatId, `未找到关于【${tag}】的资源`)
            return
        }

        // Check if login is required
        if (result.loginRequired) {
            await bot.sendText(chatId, `⚠️ 搜索【${tag}】需要登录 JavDB 才能查看。\n请联系管理员在 .env 中配置 JAVDB_EMAIL 和 JAVDB_PASSWORD。`)
            return
        }

        // 如果最终还是没有磁链, 提示用户
        if (!result.magnet || result.magnet.length === 0) {
            await bot.sendText(chatId, `关于【${tag}】的资源暂时没有找到带磁链的，请重试或换个标签。`)
            return
        }

        const media = {
            url: result.cover || '',
            caption: result.link ? `<a href="${result.link}">${result.title}</a>` : (result.title || ''),
            parse_mode: 'HTML'
        }

        // 添加"再来一个"按钮
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '🔄 换一个', callback_data: `tag:${tag}` }, // 点击再次触发搜索(随机)
                    { text: '🔙 返回分类', callback_data: 'filter_main' }
                ]
            ]
        }

        await bot.sendPhoto(chatId, media, {
            reply_markup: JSON.stringify(keyboard)
        })

        // 发送磁力 (如果有)
        if (result.magnet && result.magnet.length > 0) {
            let msg = `\n----------------------\n标签: ${tag}`
            msg += `\n首个磁力: <code>${result.magnet[0].link}</code>`
            await bot.sendText(chatId, msg)
        } else {
            await bot.sendText(chatId, `找到影片但没有磁力链接`)
        }

    } catch (e) {
        console.error(e)
        await bot.sendText(chatId, `搜索出错: ${e.message}`)
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

            // 检查是否有磁力
            const hasMagnet = result.magnet && result.magnet.length > 0

            // 如果没有磁力, 直接跳过 (用户要求严格过滤)
            if (!hasMagnet) {
                console.log(`Skipped no magnet content: ${title}`)
                continue
            }

            // 如果是优先巨乳模式
            if (preferBigTits) {
                if (BIG_TITS_KEYWORDS.some(k => title.includes(k))) {
                    // 找到了巨乳且有磁力!
                    bestResult = { ...result, code }
                    break
                }
                // 如果没找到巨乳但有磁力, 暂存为保底
                if (!bestResult) {
                    bestResult = { ...result, code }
                }
            } else {
                // 普通模式且有磁力, 直接返回
                bestResult = { ...result, code }
                break
            }
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
