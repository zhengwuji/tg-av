import { TARGET_CHANNEL_ID } from '../config/index.js'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const writeFile = promisify(fs.writeFile)
const unlink = promisify(fs.unlink)
const mkdir = promisify(fs.mkdir)

/**
 * 处理转发的媒体消息
 * @param {Object} message - Telegram消息对象
 * @param {Object} bot - Telegram Bot实例
 */
export async function processForwardedMedia(message, bot) {
    if (!TARGET_CHANNEL_ID) {
        console.error('TARGET_CHANNEL_ID not configured')
        await bot.sendText(message.chat_id, '❌ 目标频道未配置，请联系管理员设置 TARGET_CHANNEL_ID')
        return
    }

    try {
        // 获取媒体类型和file_id
        let mediaType = null
        let fileId = null
        
        if (message.photo && message.photo.length > 0) {
            mediaType = 'photo'
            fileId = message.photo[message.photo.length - 1].file_id // 获取最大尺寸
        } else if (message.video) {
            mediaType = 'video'
            fileId = message.video.file_id
        } else if (message.document) {
            mediaType = 'document'
            fileId = message.document.file_id
        }

        if (!mediaType || !fileId) {
            await bot.sendText(message.chat_id, '❌ 未检测到支持的媒体类型（支持：图片、视频、文档）')
            return
        }

        // 构造交互按钮
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '📥 下载到服务器', callback_data: `media_dl:${mediaType}:${fileId}` },
                    { text: '📢 转发到频道', callback_data: `media_fwd:${mediaType}:${message.message_id}` }
                ]
            ]
        }

        // 回复用户，询问操作
        await bot.sendMessage(message.chat_id, `🤖 已收到${getMediaTypeName(mediaType)}，请选择操作：`, {
            reply_to_message_id: message.message_id,
            reply_markup: JSON.stringify(keyboard)
        })

    } catch (error) {
        console.error('[MediaHandler] Error processing media:', error)
        await bot.sendText(message.chat_id, `❌ 处理失败: ${error.message}`)
    }
}

/**
 * 处理媒体相关的回调查询
 * @param {Object} callbackQuery - 回调查询对象
 * @param {Object} bot - Telegram Bot实例
 */
export async function handleMediaCallback(callbackQuery, bot) {
    const data = callbackQuery.data
    const message = callbackQuery.message
    const chatId = message.chat.id
    
    // 格式: action:type:id
    // media_dl:photo:file_id_xxx
    // media_fwd:photo:message_id_123
    const parts = data.split(':')
    const action = parts[0]
    const mediaType = parts[1]
    const id = parts.slice(2).join(':') // file_id might contain colons? usually not, but safe to join

    try {
        if (action === 'media_fwd') {
            // 转发到频道
            const messageId = parseInt(id)
            
            // 这里的 messageId 是用户发给机器人的那条原始消息的ID
            // 但 callbackQuery.message 是机器人发的那个带按钮的消息
            // 我们需要转发的是原始消息。
            // 之前的 processForwardedMedia 中，我们把原始消息ID放在了 callback_data 里
            
            // 注意：bot.copyMessage 需要 from_chat_id，这里是当前聊天
            await bot.copyMessage(TARGET_CHANNEL_ID, chatId, messageId)
            
            await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ 已转发' })
            await bot.editMessageText(chatId, message.message_id, `✅ ${getMediaTypeName(mediaType)}已成功转发到频道！`)
            
        } else if (action === 'media_dl') {
            // 下载到服务器
            const fileId = id
            await bot.answerCallbackQuery(callbackQuery.id, { text: '📥 开始下载...' })
            await bot.editMessageText(chatId, message.message_id, `⏳ 正在下载${getMediaTypeName(mediaType)}到服务器...`)
            
            const timestamp = new Date().getTime()
            const ext = getExtension(mediaType)
            const filename = `${mediaType}_${timestamp}${ext}`
            const downloadPath = path.join(process.cwd(), 'downloads', filename)
            
            await downloadMedia(bot, fileId, downloadPath)
            
            await bot.sendText(chatId, `✅ 下载完成！\n📂 保存路径: ${downloadPath}`)
        }
    } catch (error) {
        console.error('[MediaHandler] Callback error:', error)
        await bot.sendText(chatId, `❌ 操作失败: ${error.message}`)
    }
}

/**
 * 获取媒体类型的中文名称
 */
function getMediaTypeName(mediaType) {
    const names = {
        photo: '图片',
        video: '视频',
        document: '文档'
    }
    return names[mediaType] || '媒体'
}

/**
 * 获取简单的扩展名猜测
 */
function getExtension(mediaType) {
    switch (mediaType) {
        case 'photo': return '.jpg'
        case 'video': return '.mp4'
        case 'document': return '.dat' // 文档类型较杂，暂用dat，实际应从file_path分析
        default: return ''
    }
}

/**
 * 下载媒体到本地
 * @param {Object} bot - Telegram Bot实例
 * @param {string} fileId - 文件ID
 * @param {string} downloadPath - 下载路径
 */
export async function downloadMedia(bot, fileId, downloadPath) {
    try {
        // 确保下载目录存在
        const dir = path.dirname(downloadPath)
        await mkdir(dir, { recursive: true })

        // 获取文件信息
        const fileInfo = await bot.getFile(fileId)
        if (!fileInfo || !fileInfo.file_path) {
            throw new Error('Failed to get file info')
        }

        // 如果是文档，尝试从 file_path 获取正确扩展名
        if (downloadPath.endsWith('.dat')) {
             const realExt = path.extname(fileInfo.file_path)
             if (realExt) {
                 downloadPath = downloadPath.replace('.dat', realExt)
             }
        }

        // 下载文件
        const buffer = await bot.downloadFileBuffer(fileInfo.file_path)
        if (!buffer) {
            throw new Error('Failed to download file')
        }

        // 写入文件
        await writeFile(downloadPath, Buffer.from(buffer))
        console.log(`[MediaHandler] Downloaded file to ${downloadPath}`)

        return downloadPath
    } catch (error) {
        console.error('[MediaHandler] Download error:', error)
        throw error
    }
}
