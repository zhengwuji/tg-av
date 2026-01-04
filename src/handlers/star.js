import * as cheerio from 'cheerio'
import Telegram from '../utils/telegram.js'
import { BOT_TOKEN } from '../config/index.js'

const javUrl = 'https://www.javbus.com'

// Search for an actor/actress on JavBus
export async function searchStar(message, starName) {
    const bot = new Telegram(BOT_TOKEN, message)
    const chatId = message.chat_id

    if (!starName || starName.trim() === '') {
        await bot.sendText(chatId, "请提供演员名称,例如: /star 三上悠亜")
        return
    }

    try {
        await bot.sendText(chatId, `正在搜索演员: ${starName}...`)

        // JavBus star search URL format
        const searchUrl = `${javUrl}/search/${encodeURIComponent(starName)}?type=&parent=ce`

        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Cookie": "existmag=mag"
        }

        const response = await fetch(searchUrl, {
            headers,
            redirect: 'manual'
        })

        if (!response.ok && response.status !== 302) {
            await bot.sendText(chatId, `搜索失败: HTTP ${response.status}`)
            return
        }

        const html = await response.text()

        // Parse search results
        const $ = cheerio.load(html)

        // Find movie items in search results
        const $movies = $('.movie-box')

        if ($movies.length === 0) {
            await bot.sendText(chatId, `未找到演员 "${starName}" 的相关作品`)
            return
        }

        // Get first 5 results
        let resultText = `找到 ${$movies.length} 部作品:\n\n`
        const maxResults = Math.min(5, $movies.length)

        for (let i = 0; i < maxResults; i++) {
            const $movie = $movies.eq(i)
            const title = $movie.find('img').attr('title') || ''
            const code = $movie.find('date').text().trim()
            const link = javUrl + $movie.find('a').attr('href')

            resultText += `${i + 1}. ${code}\n${title}\n${link}\n\n`
        }

        await bot.sendText(chatId, resultText)

    } catch (e) {
        console.error('Star search error:', e)
        await bot.sendText(chatId, `搜索失败: ${e.message}`)
    }
}

export default searchStar
