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
        let caption = message.caption || ''

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

        // 通知用户开始处理
        await bot.sendText(message.chat_id, `📥 开始处理${getMediaTypeName(mediaType)}...`)

        // 使用copyMessage直接转发到频道（更高效，不需要下载）
        try {
            await bot.copyMessage(TARGET_CHANNEL_ID, message.chat.id, message.message_id)
            await bot.sendText(message.chat_id, `✅ ${getMediaTypeName(mediaType)}已成功转发到频道！`)

            console.log(`[MediaHandler] Successfully forwarded ${mediaType} to channel ${TARGET_CHANNEL_ID}`)
        } catch (copyError) {
            console.error('[MediaHandler] copyMessage failed, trying alternative method:', copyError)

            // 如果copyMessage失败，尝试通过file_id直接发送
            await sendMediaByFileId(bot, TARGET_CHANNEL_ID, mediaType, fileId, caption)
            await bot.sendText(message.chat_id, `✅ ${getMediaTypeName(mediaType)}已成功发送到频道！`)
        }

    } catch (error) {
        console.error('[MediaHandler] Error processing media:', error)
        await bot.sendText(message.chat_id, `❌ 处理失败: ${error.message}`)
    }
}

/**
 * 通过file_id直接发送媒体到频道
 */
async function sendMediaByFileId(bot, channelId, mediaType, fileId, caption) {
    const options = caption ? { caption } : {}

    switch (mediaType) {
        case 'photo':
            await bot.sendPhoto(channelId, { file_id: fileId }, options)
            break
        case 'video':
            await bot.sendVideo(channelId, { file_id: fileId }, options)
            break
        case 'document':
            await bot.sendDocument(channelId, { file_id: fileId }, options)
            break
        default:
            throw new Error(`Unsupported media type: ${mediaType}`)
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
 * 下载媒体到本地（备用方案）
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

/**
 * 清理本地文件
 * @param {string} filePath - 文件路径
 */
export async function cleanupFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            await unlink(filePath)
            console.log(`[MediaHandler] Cleaned up file: ${filePath}`)
        }
    } catch (error) {
        console.error('[MediaHandler] Cleanup error:', error)
    }
}
