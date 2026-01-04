import Telegram from '../utils/telegram.js'
import { BOT_TOKEN, ROBOT_NAME } from '../config/index.js'
import { reqJavdb } from '../utils/javdb.js'
import { reqJavbus } from '../utils/javbus.js'
import { reqPornhub } from '../utils/pornhub.js'
import { reqXHamster } from '../utils/xhamster.js'
import randomJav from './random.js'
import { searchStar } from './star.js'
import moment from 'moment'
moment.locale('zh-cn')

export default async request => {
  try {
    const body = await request.json()

    // 检查是否有有效的消息文本
    if (!body.message || !body.message.text) {
      return new Response('ok', { status: 200 })
    }

    const MESSAGE = {
      chat_id: body.message.chat.id,
      chat_type: body.message.chat.type,
      message_id: body.message.message_id,
      first_name: body.message.chat.first_name,
      last_name: body.message.chat.last_name,
      text: body.message.text.toLowerCase()
    }

    const headers = new Headers({
      'content-type': 'application/json;charset=UTF-8'
    })
    const RETURN_OK = new Response('working', { status: 200, headers: headers })

    const bot = new Telegram(BOT_TOKEN, MESSAGE)

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
      由 Cloudflare Worker 强力驱动
    `

    const state = { start: Date.now(), date: {} }

    // 支持多种番号格式:
    // 1. 字母+数字: ssni-888, ssni_888, ssni 888
    // 2. 纯数字+下划线: 010126_01, 123456_99
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
          // 字母+数字格式: ssni888 -> ssni-888
          code = match[1] + '-' + match[2]
        } else if (match[3] && match[4]) {
          // 纯数字格式: 保持原样 010126_01
          code = match[3] + '_' + match[4]
        }
      }

      let isPrivate = MESSAGE.chat_type === 'private'
      let max = isPrivate ? 10 : 3

      try {
        if (isPrivate) bot.sendText(MESSAGE.chat_id, `开始查找车牌：${code} ……`)

        // 优先使用JavDB,失败时降级到JavBus
        let result = null
        let source = ''

        try {
          // 优先尝试JavDB
          result = await reqJavdb(code)
          source = 'JavDB'

          // 如果JavDB没有找到结果(或只有基本信息无磁力),尝试JavBus
          if (!result.title || result.magnet.length === 0) {
            const busResult = await reqJavbus(code)
            // 只有当JavBus有结果时才覆盖
            if (busResult.title) {
              result = busResult
              source = 'JavBus'
            }
            // 否则保留JavDB的结果(可能只有标题和封面)
          }
        } catch (e) {
          // JavDB失败,降级到JavBus
          console.log(`JavDB failed for ${code}, falling back to JavBus:`, e.message)
          try {
            result = await reqJavbus(code)
            source = 'JavBus'
          } catch (busErr) {
            console.log(`JavBus also failed:`, busErr.message)
            // 如果之前JavDB有部分结果(如在catch前已赋值),这里可能需要处理
            // 但通常catch意味着JavDB完全失败,所以result可能为空
            if (!result) result = { title: '', cover: '', magnet: [], list: [] }
          }
        }

        let { title, cover, magnet, list } = result

        const media = {
          url: cover || '',
          caption: title || ''
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
              message +=
                '\n磁力链接: ' + '\n' + '<code>' + item.link + '</code>'
              return i + 1 < max
            })
          }
          if (list.length) {
            list.every((list, i) => {
              message +=
                '\n----------------------\n点击观看: <a href="' +
                list.link +
                '">' +
                list.title +
                '</a>'
              message += '\n时长: ' + list.duration
              if (list.view) message += '\n观看人数: ' + list.view
              return i + 1 < max
            })
          }
          if (!isPrivate && magnet.length > max) {
            message += `\n-----------\n在群聊中发车，还有 ${magnet.length -
              max} 个Magnet链接没有显示\n与 ${ROBOT_NAME} 机器人单聊可以显示所有链接`
          }
          bot.sendText(MESSAGE.chat_id, message)
        } else {
          bot.sendText(MESSAGE.chat_id, '还没有相关链接')
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
        if (isPrivate)
          bot.sendText(MESSAGE.chat_id, `开始查找关键字：${code} ……`)

        let { list } = await reqPornhub(code, false)

        if (list.length) {
          let message = '关键字查询：[' + code + ']\n'
          list.every((list, i) => {
            message +=
              '\n----------------------\n点击观看: <a href="' +
              list.link +
              '">' +
              list.title +
              '</a>'
            message += '\n时长: ' + list.duration
            message += '\n好评率: ' + list.good
            message += '\n观看人数: ' + list.views
            return i + 1 < max
          })
          bot.sendText(MESSAGE.chat_id, message)
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
      let max = isPrivate ? 10 : 3

      try {
        if (isPrivate) bot.sendText(MESSAGE.chat_id, `开始推荐热门 ……`)

        let { list } = await reqPornhub(code, true)

        if (list.length) {
          let message = '推荐热门查询：[' + code + ']\n'
          list.every((list, i) => {
            message +=
              '\n----------------------\n点击观看: <a href="' +
              list.link +
              '">' +
              list.title +
              '</a>'
            message += '\n时长: ' + list.duration
            message += '\n好评率: ' + list.good
            message += '\n观看人数: ' + list.views
            return i + 1 < max
          })
          bot.sendText(MESSAGE.chat_id, message)
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
      let max = isPrivate ? 10 : 3

      try {
        if (isPrivate) bot.sendText(MESSAGE.chat_id, `开始推荐资源：${code} ……`)

        let { list } = await reqXHamster(code)

        if (list.length) {
          let message = '推荐资源：[' + code + ']\n'
          list.every((list, i) => {
            message +=
              '\n----------------------\n点击观看: <a href="' +
              list.link +
              '">' +
              list.title +
              '</a>'
            message += '\n时长：' + list.duration
            return i + 1 < max
          })
          bot.sendText(MESSAGE.chat_id, message)
        } else {
          bot.sendText(MESSAGE.chat_id, '还没有相关链接')
        }
      } catch (e) {
        bot.sendText(MESSAGE.chat_id, e.message)
      }
      return RETURN_OK
    } else if (MESSAGE.text.startsWith('/random')) {
      await randomJav(MESSAGE)
      return RETURN_OK
    } else if (MESSAGE.text.startsWith('/star')) {
      let starName = MESSAGE.text.replace('/star', '').trim()
      await searchStar(MESSAGE, starName)
      return RETURN_OK
    } else {
      bot.sendText(MESSAGE.chat_id, help_text)
      return RETURN_OK
    }

    ///////////////// 绘制 ///////////////////////////////
    function drawState(range) {
      let now = moment()
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
  } catch (err) {
    return new Response(err.stack || err)
  }
}
