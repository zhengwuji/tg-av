import * as cheerio from 'cheerio'
import { getValidCookie } from './cookieManager.js'

const javdbUrl = 'https://javdb.com'

// Helper function to calculate magnet quality score
function getMagnetQualityScore(magnet) {
    let score = 0

    // Check for uncensored (无码/無碼/uncensored)
    const uncensoredKeywords = ['无码', '無碼', 'uncensored', '无修正', 'FC2']
    const titleLower = (magnet.link + magnet.size).toLowerCase()
    if (uncensoredKeywords.some(keyword => titleLower.includes(keyword.toLowerCase()))) {
        score += 100
    }

    // Check for HD
    if (magnet.is_hd) {
        score += 50
    }

    // Check for subtitle
    if (magnet.has_subtitle) {
        score += 25
    }

    // Prefer larger file sizes (usually better quality)
    const sizeMatch = magnet.size.match(/(\d+\.?\d*)\s*(GB|MB)/i)
    if (sizeMatch) {
        const size = parseFloat(sizeMatch[1])
        const unit = sizeMatch[2].toUpperCase()
        const sizeInMB = unit === 'GB' ? size * 1024 : size
        score += Math.min(sizeInMB / 100, 20) // Cap at 20 points
    }

    return score
}

// Sort magnets by quality score (highest first)
function sortMagnetsByQuality(magnets) {
    return magnets.sort((a, b) => {
        return getMagnetQualityScore(b) - getMagnetQualityScore(a)
    })
}

// Modern User-Agent
const BASE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
}

export async function reqJavdb(id, options = {}) {
    const result = { title: '', cover: '', magnet: [], list: [], screenshots: [] }

    try {
        // Get valid cookie (auto-login if needed)
        const cookie = await getValidCookie()

        // Step 1: Search for the code
        const searchUrl = `${javdbUrl}/search?q=${encodeURIComponent(id)}`

        let ajax_req = {
            headers: {
                ...BASE_HEADERS,
                "Cookie": cookie
            },
            method: "GET",
            redirect: 'follow'
        }

        let response = await fetch(searchUrl, ajax_req)
        if (!response.ok) {
            throw new Error(`JavDB search failed: ${response.status}`)
        }

        let responseText = await response.text()
        let $ = cheerio.load(responseText)

        // Find the first video link from search results
        // JavDB search results are in <div class="movie-list"> with <a> tags
        let firstVideoLink = null

        // Try to find exact match first (from search results)
        const $videoItems = $('.movie-list .item')
        if ($videoItems.length > 0) {
            let $firstItem = null

            // 如果开启了随机模式, 从结果中随机选一个
            if (options.random) {
                const randomIndex = Math.floor(Math.random() * $videoItems.length)
                $firstItem = $videoItems.eq(randomIndex)
                console.log(`[JavDB] Random mode: picked index ${randomIndex} from ${$videoItems.length} results`)
            } else {
                // 默认取第一个
                $firstItem = $videoItems.first()
            }

            const $link = $firstItem.find('a')
            if ($link.length > 0) {
                firstVideoLink = $link.attr('href')
                result.link = javdbUrl + firstVideoLink // 保存详情页链接

                // Extract preliminary info from search result
                // Title is usually in the 'title' attribute of the link or image
                result.title = $link.attr('title') || $firstItem.find('.video-title').text().trim()

                // Cover image
                const $img = $firstItem.find('img')
                let coverSrc = $img.attr('src') || $img.attr('data-src')
                if (coverSrc) {
                    if (coverSrc.startsWith('//')) {
                        coverSrc = 'https:' + coverSrc
                    } else if (coverSrc.startsWith('/')) {
                        coverSrc = javdbUrl + coverSrc
                    }
                    result.cover = coverSrc
                }
            }
        }

        if (!firstVideoLink) {
            throw new Error(`未找到番号: ${id}`)
        }

        // Step 2: Fetch the detail page
        const detailUrl = javdbUrl + firstVideoLink
        ajax_req.headers["Referer"] = searchUrl

        response = await fetch(detailUrl, ajax_req)
        // Note: 403 or redirect might happen if login required

        responseText = await response.text()
        $ = cheerio.load(responseText)

        // Check if redirected to login page
        if ($('title').text().includes('登入') || $('title').text().includes('Login')) {
            console.log(`JavDB requires login for ${id}, returning basic info`)
            // 尝试重新获取Cookie并重试一次? 
            // 暂时先返回基本信息, 因为getValidCookie应该已经处理了登录
            return result
        }

        // Parse cover image
        const $cover = $('.video-cover img, .column-video-cover img')
        if ($cover.length > 0) {
            let coverSrc = $cover.attr('src')
            if (coverSrc) {
                // Handle relative URLs
                if (coverSrc.startsWith('//')) {
                    coverSrc = 'https:' + coverSrc
                } else if (coverSrc.startsWith('/')) {
                    coverSrc = javdbUrl + coverSrc
                }
                result.cover = coverSrc
            }
        }

        // Parse title
        const $title = $('.video-detail .title strong, .title.is-4 strong')
        if ($title.length > 0) {
            result.title = $title.text().trim()
        }

        // Parse screenshots/preview images
        const $screenshots = $('.tile-images.preview-images a, .preview-images a')
        if ($screenshots.length > 0) {
            $screenshots.each((i, elem) => {
                let screenshotUrl = $(elem).attr('href')
                if (screenshotUrl) {
                    if (screenshotUrl.startsWith('//')) {
                        screenshotUrl = 'https:' + screenshotUrl
                    } else if (screenshotUrl.startsWith('/')) {
                        screenshotUrl = javdbUrl + screenshotUrl
                    }
                    result.screenshots.push(screenshotUrl)
                }
            })
        }

        // Parse magnet links
        // JavDB uses a different structure - magnet links are direct <a href="magnet:...">
        const $magnetLinks = $('a[href^="magnet:"]')
        if ($magnetLinks.length > 0) {
            $magnetLinks.each((i, elem) => {
                const $elem = $(elem)

                const magnetUrl = $elem.attr('href')
                if (!magnetUrl) return

                // Get the text content which contains filename and size
                const linkText = $elem.text().trim()

                // Try to extract size from the text (e.g., "4.75GB", "1.32GB", "799MB")
                const sizeMatch = linkText.match(/(\d+\.?\d*\s*(GB|MB|KB))/i)
                const size = sizeMatch ? sizeMatch[0] : ''

                // Check for tags in the text
                let is_hd = ''
                let has_subtitle = ''

                if (linkText.includes('高清') || linkText.includes('HD') || linkText.includes('_HD') || linkText.includes('2K') || linkText.includes('4K')) {
                    is_hd = '高清'
                }
                if (linkText.includes('字幕') || linkText.includes('中文') || linkText.includes('_C') || linkText.includes('-C') || linkText.includes('_ch')) {
                    has_subtitle = '字幕'
                }

                // Try to find date/time info (JavDB doesn't always show this in the magnet section)
                const dateTime = ''

                result.magnet.push({
                    link: decodeURI(magnetUrl.trim()),
                    size: size,
                    dateTime: dateTime,
                    is_hd: is_hd,
                    has_subtitle: has_subtitle
                })
            })

            // Sort magnets by quality
            result.magnet = sortMagnetsByQuality(result.magnet)
        }

    } catch (e) {
        console.error("JavDB fetch failed:", e)
        throw e
    }

    return result
}
