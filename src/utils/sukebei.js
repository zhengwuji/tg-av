import * as cheerio from 'cheerio'

const sukebeiUrl = 'https://sukebei.nyaa.si'

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

    // Prefer more seeders
    if (magnet.seeders) {
        score += Math.min(magnet.seeders, 50)
    }

    return score
}

// Sort magnets by quality score (highest first)
function sortMagnetsByQuality(magnets) {
    return magnets.sort((a, b) => {
        return getMagnetQualityScore(b) - getMagnetQualityScore(a)
    })
}

export async function reqSukebei(code) {
    const result = { title: '', cover: '', magnet: [], list: [], screenshots: [] }

    try {
        const url = `${sukebeiUrl}/?f=0&c=0_0&q=${encodeURIComponent(code)}`

        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Sukebei search failed: ${response.status}`)
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        $('table.torrent-list tbody tr').each((i, elem) => {
            const $tds = $(elem).find('td')
            if ($tds.length < 2) return

            // Title
            const title = $tds.eq(1).find('a').not('.comments').text().trim()
            const viewLink = sukebeiUrl + $tds.eq(1).find('a').not('.comments').attr('href')

            // Magnet
            const magnetUrl = $tds.eq(2).find('a[href^="magnet:"]').attr('href')
            if (!magnetUrl) return

            // Size
            const size = $tds.eq(3).text().trim()

            // Date
            const date = $tds.eq(4).text().trim()

            // Seeders
            const seeders = parseInt($tds.eq(5).text().trim()) || 0

            // Check for tags in the title
            let is_hd = ''
            let has_subtitle = ''
            const titleLower = title.toLowerCase()

            if (titleLower.includes('高清') || titleLower.includes('hd') || titleLower.includes('2k') || titleLower.includes('4k')) {
                is_hd = '高清'
            }
            if (titleLower.includes('字幕') || titleLower.includes('中文') || titleLower.includes('-c') || titleLower.includes('_ch')) {
                has_subtitle = '字幕'
            }

            result.magnet.push({
                link: magnetUrl,
                size: size,
                dateTime: date,
                is_hd: is_hd,
                has_subtitle: has_subtitle,
                seeders: seeders,
                title: title // Keep original title for reference
            })
        })

        // If we found results, set the title from the first result (if not set)
        if (result.magnet.length > 0) {
            result.title = result.magnet[0].title
            result.magnet = sortMagnetsByQuality(result.magnet)
        }

    } catch (e) {
        console.error("Sukebei fetch failed:", e)
        // Don't throw, just return empty result so other sources can be used
    }

    return result
}
