import Telegram from '../utils/telegram.js'
import { BOT_TOKEN, ROBOT_NAME, ADMIN_ID, SESSION_STRING, DOWNLOAD_PATHS } from '../config/index.js'
import { reqJavdb } from '../utils/javdb.js'
import { reqJavbus } from '../utils/javbus.js'
import { reqPornhub } from '../utils/pornhub.js'
import { reqXHamster } from '../utils/xhamster.js'
import { reqSukebei } from '../utils/sukebei.js'
import randomJav, { handleCallback } from './random.js'
import { searchStar } from './star.js'
import { processForwardedMedia, handleMediaCallback } from '../utils/mediaHandler.js'
import { downloadRestrictedMessage } from '../utils/userbot.js'
import moment from 'moment'
moment.locale('zh-cn')

const state = { start: Date.now(), date: {} }
let currentStorageKey = Object.keys(DOWNLOAD_PATHS)[0] || 'Local'

export default async request => {
    try {
        const body = await request.json()

        // 处理回调查询 (按钮点击)
        if (body.callback_query) {
            console.log(`[Callback] Received: ${body.callback_query.data} from ${body.callback_query.from.id}`)
            await bot.sendVideo(MESSAGE.chat_id, { file_path: filePath })
        } else {
            await bot.sendDocument(MESSAGE.chat_id, { file_path: filePath })
        }
    }
            } catch (error) {
    console.error('[RestrictedContent] Error:', error)
    await bot.sendText(MESSAGE.chat_id, `❌ 获取失败: ${error.message}\n\n请检查: \n1. Userbot 是否配置正确\n2. 您的账号是否在该频道/群组中\n3. 链接是否有效`)
}
return RETURN_OK
        }

if (!body.message.text) {
    return RETURN_OK
}

const userStatus = isAdmin ? '👑 管理员 (无限制)' : '👤 普通用户'
const restrictedStatus = SESSION_STRING ? '✅ 已启用' : '❌ 未启用'

const help_text = `
      欢迎使用寻龙机器人,请输入命令格式: \n
        /start 欢迎语 \n
        /av ssni-888 查询 \n
        /star 三上悠亜 搜索演员 \n
        /state 5 查询历史 \n
        /show ht/mv/lg/tr/cm 关键字查询P站 \n
        /xv 麻豆 关键字查询P站 \n
        /xm 4k 关键字查询XHAMSTER站 \n
        /random 随机推荐番号 \n
        
      🆕 **新功能 (仅管理员):**
      1. **媒体转载**: 转发图片/视频给机器人 -> 下载或转发
      2. **受限下载**: 发送禁止转发的链接(t.me/c/...) -> 破解下载
         (状态: ${restrictedStatus})

      📊 当前状态:
      ID: ${MESSAGE.chat_id}
      身份: ${userStatus}
      
      由 Cloudflare Worker 强力驱动
    `

const codeRegex = /^([a-z]+)(?:-|_|\s)?([0-9]+)$|^(\d{6})_(\d{2})$/

if (body.message.sticker) {
    bot.sendText(MESSAGE.chat_id, help_text)
    return RETURN_OK
}

if (MESSAGE.text.startsWith('/start')) {
    bot.sendText(MESSAGE.chat_id, help_text)
    return RETURN_OK
} else if (MESSAGE.text === '/state') {
    let buffer = drawState(5)
    bot.sendText(MESSAGE.chat_id, buffer)
    return RETURN_OK
} else if (MESSAGE.text.startsWith('/state')) {
    let days = MESSAGE.text.replace('/state', '').trim()
    let buffer = drawState(days)
    bot.sendText(MESSAGE.chat_id, buffer)
    return RETURN_OK
} else if (MESSAGE.text === '/av') {
    bot.sendText(MESSAGE.chat_id, help_text)
    return RETURN_OK
} else if (MESSAGE.text.startsWith('/av')) {
    const today = moment().format('YYYY-MM-DD')
    if (state.date[today]) state.date[today]++
    else state.date[today] = 1

    let code = MESSAGE.text.replace('/av', '').trim()
    if (codeRegex.test(code)) {
        const match = code.match(codeRegex)
        if (match[1] && match[2]) {
            code = match[1] + '-' + match[2]
        } else if (match[3] && match[4]) {
            code = match[3] + '_' + match[4]
        }
    }

    let isPrivate = MESSAGE.chat_type === 'private'
    let max = isAdmin ? 100 : (isPrivate ? 10 : 3)

    try {
        if (isPrivate) {
            let startMsg = `开始查找车牌：${code} ……`
            if (isAdmin) startMsg += `\n(👑 管理员模式: 无限制)`
            bot.sendText(MESSAGE.chat_id, startMsg)
        }

        let result = null
        let source = ''

        try {
            result = await reqJavdb(code)
            source = 'JavDB'
            if (!result.title || result.magnet.length === 0) {
                const busResult = await reqJavbus(code)
                if (busResult.title) {
                    result = busResult
                    source = 'JavBus'
                }
            }
        } catch (e) {
            console.log(`JavDB failed for ${code}, falling back to JavBus:`, e.message)
            try {
                result = await reqJavbus(code)
                source = 'JavBus'
            } catch (busErr) {
                console.log(`JavBus also failed:`, busErr.message)
                if (!result) result = { title: '', cover: '', magnet: [], list: [] }
            }
        }

        if (result.magnet.length === 0) {
            try {
                console.log(`No magnets found yet, trying Sukebei for ${code}...`)
                const sukebeiResult = await reqSukebei(code)
                if (sukebeiResult.magnet.length > 0) {
                    result.magnet = sukebeiResult.magnet
                    if (!result.title) {
                        result.title = sukebeiResult.title
                        source = 'Sukebei'
                    }
                }
            } catch (e) {
                console.log(`Sukebei fallback failed for ${code}:`, e.message)
            }
        }

        let { title, cover, magnet, list } = result

        const media = {
            url: cover || '',
            caption: result.link ? `<a href="${result.link}">${title}</a>` : (title || ''),
            parse_mode: 'HTML'
        }
        await bot.sendPhoto(MESSAGE.chat_id, media)

        if (magnet.length || list.length) {
            let message = ''
            if (magnet.length) {
                magnet.every((item, i) => {
                    message += '\n----------------------\n日期: ' + item.dateTime
                    message += '\n大小: ' + item.size
                    if (item.is_hd) message += '\n分辨率: ' + item.is_hd
                    if (item.has_subtitle) message += '\n字幕: 有' + item.has_subtitle
                    message += '\n磁力链接: ' + '\n' + '<code>' + item.link + '</code>'
                    return i + 1 < max
                })
            }
            if (list.length) {
                list.every((list, i) => {
                    message += '\n----------------------\n点击观看: <a href="' + list.link + '">' + list.title + '</a>'
                    message += '\n时长: ' + list.duration
                    if (list.view) message += '\n观看人数: ' + list.view
                    return i + 1 < max
                })
            }
            if (!isPrivate && magnet.length > max) {
                message += `\n-----------\n在群聊中发车，还有 ${magnet.length - max} 个Magnet链接没有显示\n与 ${ROBOT_NAME} 机器人单聊可以显示所有链接`
            }
            bot.sendText(MESSAGE.chat_id, message)
        } else {
            let noLinkMsg = '⚠️ 未抓取到磁力链接'
            if (source === 'JavDB') {
                noLinkMsg += '\n(该资源可能需要登录JavDB才能查看磁力)'
                if (result.link) {
                    noLinkMsg += `\n\n👉 <a href="${result.link}">点击这里访问网页版查看</a>`
                }
            } else {
                noLinkMsg += '\n还没有相关链接'
            }
            bot.sendText(MESSAGE.chat_id, noLinkMsg, { parse_mode: 'HTML' })
        }
    } catch (e) {
        bot.sendText(MESSAGE.chat_id, e.message)
    }
    return RETURN_OK
} else if (MESSAGE.text.startsWith('/xv')) {
    const today = moment().format('YYYY-MM-DD')
    if (state.date[today]) state.date[today]++
    else state.date[today] = 1

    let code = MESSAGE.text.replace('/xv', '').trim()
    let isPrivate = MESSAGE.chat_type === 'private'
    let max = isPrivate ? 10 : 3

    try {
        if (isPrivate) bot.sendText(MESSAGE.chat_id, `开始查找关键字：${code} ……`)
        let { list } = await reqPornhub(code, false)

        if (list.length) {
            const sendMax = isPrivate ? 5 : 3
            for (let i = 0; i < list.length; i++) {
                if (i >= sendMax) break
                const item = list[i]
                const caption = `<b>${item.title}</b>\n\n⏱ 时长: ${item.duration}\n👁 观看: ${item.views}\n👍 好评: ${item.good}\n\n<a href="${item.link}">🎥 点击观看</a>`
                try {
                    await bot.sendPhoto(MESSAGE.chat_id, {
                        url: item.cover,
                        caption: caption,
                        parse_mode: 'HTML'
                    })
                } catch (err) {
                    console.error('Send photo failed:', err)
                    await bot.sendText(MESSAGE.chat_id, caption)
                }
            }
        } else {
            bot.sendText(MESSAGE.chat_id, '还没有相关链接')
        }
    } catch (e) {
        bot.sendText(MESSAGE.chat_id, e.message)
    }
    return RETURN_OK
} else if (MESSAGE.text.startsWith('/show')) {
    const today = moment().format('YYYY-MM-DD')
    if (state.date[today]) state.date[today]++
    else state.date[today] = 1
    let code = MESSAGE.text.replace('/show', '').trim()
    let isPrivate = MESSAGE.chat_type === 'private'
    try {
        if (isPrivate) bot.sendText(MESSAGE.chat_id, `开始推荐热门 ……`)
        let { list } = await reqPornhub(code, true)
        if (list.length) {
            const sendMax = isPrivate ? 5 : 3
            for (let i = 0; i < list.length; i++) {
                if (i >= sendMax) break
                const item = list[i]
                const caption = `<b>${item.title}</b>\n\n⏱ 时长: ${item.duration}\n👁 观看: ${item.views}\n👍 好评: ${item.good}\n\n<a href="${item.link}">🎥 点击观看</a>`
                try {
                    await bot.sendPhoto(MESSAGE.chat_id, {
                        url: item.cover,
                        caption: caption,
                        parse_mode: 'HTML'
                    })
                } catch (err) {
                    console.error('Send photo failed:', err)
                    await bot.sendText(MESSAGE.chat_id, caption)
                }
            }
        } else {
            bot.sendText(MESSAGE.chat_id, '还没有相关链接')
        }
    } catch (e) {
        bot.sendText(MESSAGE.chat_id, e.message)
    }
    return RETURN_OK
} else if (MESSAGE.text.startsWith('/xm')) {
    const today = moment().format('YYYY-MM-DD')
    if (state.date[today]) state.date[today]++
    else state.date[today] = 1
    let code = MESSAGE.text.replace('/xm', '').trim()
    let isPrivate = MESSAGE.chat_type === 'private'
    try {
        if (isPrivate) bot.sendText(MESSAGE.chat_id, `开始推荐资源：${code} ……`)
        let { list } = await reqXHamster(code)
        if (list.length) {
            const sendMax = isPrivate ? 5 : 3
            for (let i = 0; i < list.length; i++) {
                if (i >= sendMax) break
                const item = list[i]
                const caption = `<b>${item.title}</b>\n\n⏱ 时长: ${item.duration}\n\n<a href="${item.link}">🎥 点击观看</a>`
                try {
                    await bot.sendPhoto(MESSAGE.chat_id, {
                        url: item.cover,
                        caption: caption,
                        parse_mode: 'HTML'
                    })
                } catch (err) {
                    console.error('Send photo failed:', err)
                    await bot.sendText(MESSAGE.chat_id, caption)
                }
            }
        } else {
            bot.sendText(MESSAGE.chat_id, '还没有相关链接')
        }
    } catch (e) {
        bot.sendText(MESSAGE.chat_id, e.message)
        let earlyDay = moment().subtract(range, 'day')
        let date = [],
            data = []
        while (earlyDay.diff(now) <= 0) {
            let dateKey = earlyDay.format('YYYY-MM-DD')
            date.push(dateKey)
            if (state.date[dateKey]) data.push(state.date[dateKey])
            else data.push(0)
            earlyDay = earlyDay.add(1, 'day')
        }
        let message =
            '从 ' +
            moment(state.start).fromNow() +
            ' 开始工作\n\n       日期       : 查询车牌号次数'
        date.forEach((d, i) => {
            message += '\n' + d + ' : ' + data[i]
        })
        return message
    }
