import sagiri from 'sagiri'
import { SAUCENAO_API_KEY } from '../config/index.js'
import { reqJavdb } from '../utils/javdb.js'

let client = null

if (SAUCENAO_API_KEY) {
    client = sagiri(SAUCENAO_API_KEY)
}

export async function handleImageSearch(bot, message) {
    if (!client) {
        await bot.sendText(message.chat_id, '⚠️ 未配置 SauceNAO API Key，无法使用以图搜图功能。')
        return
    }

    const photo = message.photo[message.photo.length - 1] // Get the largest photo
    const fileId = photo.file_id

    await bot.sendText(message.chat_id, '🔍 正在识别图片中...')

    try {
        const fileLink = await bot.getFileLink(fileId)
        if (!fileLink) {
            await bot.sendText(message.chat_id, '❌ 获取图片链接失败，请重试。')
            return
        }

        console.log('[ImageSearch] Searching for image:', fileLink)
        const results = await client(fileLink)

        console.log('[ImageSearch] SauceNAO returned:', results ? results.length : 0, 'results')

        // 检查是否有结果
        if (!results || results.length === 0) {
            console.log('[ImageSearch] No results from SauceNAO')
            const caption = `⚠️ SauceNAO 未找到任何结果。\n\n` +
                `📱 请手动尝试以下搜索引擎：\n\n` +
                `🔍 <a href="https://xslist.org/zh/searchByImage">XsList 搜脸</a> - 专业女优识别\n` +
                `🔍 <a href="https://lens.google.com">Google Lens</a> - 通用图片搜索\n` +
                `🔍 <a href="https://yandex.com/images/">Yandex Images</a> - 备用搜索\n\n` +
                `💡 提示：在上述网站中上传图片进行搜索`

            await bot.sendPhoto(message.chat_id, {
                url: fileLink,
                caption: caption,
                parse_mode: 'HTML'
            })
            return
        }

        // Filter results with high similarity
        const bestMatch = results.find(r => r && r.similarity > 70)

        console.log('[ImageSearch] Best match similarity:', bestMatch ? bestMatch.similarity : 'none')

        if (!bestMatch) {
            console.log('[ImageSearch] No high-similarity match found')
            // 当 SauceNAO 无法识别时，提供多个搜索引擎的链接
            const caption = `⚠️ SauceNAO 未找到相似度足够高的结果。\n\n` +
                `📱 请手动尝试以下搜索引擎：\n\n` +
                `🔍 <a href="https://xslist.org/zh/searchByImage">XsList 搜脸</a> - 专业女优识别\n` +
                `🔍 <a href="https://lens.google.com">Google Lens</a> - 通用图片搜索\n` +
                `🔍 <a href="https://yandex.com/images/">Yandex Images</a> - 备用搜索\n\n` +
                `💡 提示：在上述网站中上传图片进行搜索`

            await bot.sendPhoto(message.chat_id, {
                url: fileLink,
                caption: caption,
                parse_mode: 'HTML'
            })
            return
        }

        console.log('[ImageSearch] Best match:', bestMatch)

        // Try to extract JAV code from the result  
        let code = ''

        // Check raw data first (often contains source info)
        if (bestMatch.raw) {
            // Common JAV patterns
            const codeRegex = /([a-zA-Z]{2,5})[-_]?(\d{3,5})/

            // Check source field
            if (bestMatch.raw.source) {
                const match = bestMatch.raw.source.match(codeRegex)
                if (match) code = `${match[1]}-${match[2]}`
            }

            // Check characters/material if source didn't yield
            if (!code && bestMatch.raw.characters) {
                const match = bestMatch.raw.characters.match(codeRegex)
                if (match) code = `${match[1]}-${match[2]}`
            }
        }

        // If no code found from regex, try to use the title or other metadata
        if (!code && bestMatch.authorName) {
            const match = bestMatch.authorName.match(/([a-zA-Z]{2,5})[-_]?(\d{3,5})/)
            if (match) code = `${match[1]}-${match[2]}`
        }

        if (code) {
            console.log('[ImageSearch] Extracted code:', code)
            await bot.sendText(message.chat_id, `🎯 识别到番号: ${code}，正在查询详细信息...`)

            try {
                const result = await reqJavdb(code)

                if (result) {
                    const caption = `<a href="${result.link}">${result.title}</a>\n\n` +
                        `识别相似度: ${bestMatch.similarity}%\n` +
                        `来源: ${bestMatch.site} - ${bestMatch.authorName || 'Unknown'}\n\n` +
                        `🕵️‍♀️ <a href="https://xslist.org/zh/searchByImage">在 XsList 上搜脸</a>`

                    await bot.sendPhoto(message.chat_id, {
                        url: result.cover,
                        caption: caption,
                        parse_mode: 'HTML'
                    })

                    // Send magnets if available
                    if (result.magnet && result.magnet.length > 0) {
                        let magnetMsg = ''
                        result.magnet.slice(0, 3).forEach(m => {
                            magnetMsg += `\n----------------------\n` +
                                `大小: ${m.size}\n` +
                                `磁力: <code>${m.link}</code>`
                        })
                        await bot.sendText(message.chat_id, magnetMsg, { parse_mode: 'HTML' })
                    }
                } else {
                    await bot.sendText(message.chat_id, `⚠️ 识别到番号 ${code} 但未找到详细信息。`)
                }
            } catch (e) {
                console.error('[ImageSearch] JavDB query failed:', e)
                await bot.sendText(message.chat_id, `⚠️ 识别到番号 ${code} 但查询详情失败: ${e.message}`)
            }

        } else {
            // If no code found, just return the SauceNAO result info
            console.log('[ImageSearch] No JAV code extracted, showing raw result')
            const caption = `🔍 识别结果:\n\n` +
                `相似度: ${bestMatch.similarity}%\n` +
                `来源: ${bestMatch.site}\n` +
                `作者/角色: ${bestMatch.authorName || 'Unknown'}\n` +
                `链接: ${bestMatch.url}\n\n` +
                `⚠️ 未能自动提取番号，请手动尝试搜索。\n\n` +
                `🕵️‍♀️ <a href="https://xslist.org/zh/searchByImage">在 XsList 上搜脸</a>`

            await bot.sendPhoto(message.chat_id, {
                url: bestMatch.thumbnail,
                caption: caption,
                parse_mode: 'HTML'
            })
        }

    } catch (e) {
        console.error('[ImageSearch] Error:', e)
        await bot.sendText(message.chat_id, `❌ 图片搜索失败: ${e.message || '未知错误'}`)
    }
}
