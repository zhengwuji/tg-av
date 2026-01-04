import * as cheerio from 'cheerio'
// import fetch from 'node-fetch' // Using built-in fetch

const javUrl = 'https://www.javbus.com'
const embedyUrl = 'https://embedy.cc'

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

// Modern User-Agent and Cookies
const BASE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Cookie": "existmag=mag"
}

export async function reqJavbus(id) {
  const result = { title: '', cover: '', magnet: [], list: [], screenshots: [] }

  let url = javUrl + '/' + id

  // Create request options locally
  let ajax_req = {
    headers: { ...BASE_HEADERS },
    method: "GET",
    redirect: 'manual'
  }

  try {
    let response = await fetch(url, ajax_req)
    if (!response.ok && response.status !== 302) {
      throw new Error(`Failed to fetch JavBus: ${response.status}`)
    }
    let responseText = await response.text()

    let $ = cheerio.load(responseText)
    let $image = $('a.bigImage img')
    result.cover = javUrl + $image.attr('src')
    result.title = $image.attr('title')

    // Parse screenshots from sample waterfall (on main page)
    let $screenshots = $('#sample-waterfall a.sample-box')
    if ($screenshots.length > 0) {
      for (let i = 0; i < $screenshots.length; i++) {
        let screenshotUrl = $screenshots.eq(i).attr('href')
        if (screenshotUrl) {
          result.screenshots.push(screenshotUrl)
        }
      }
    }

    // Updated Regex for robustness
    let gidMatch = responseText.match(/gid\s*=\s*(\d+)/)
    let imgMatch = responseText.match(/img\s*=\s*'([^']+)'/)

    if (gidMatch && imgMatch) {
      let gid = gidMatch[1]
      let img = imgMatch[1]
      let floor = Math.floor(Math.random() * 1e3 + 1)
      url = javUrl + `/ajax/uncledatoolsbyajax.php?gid=${gid}&img=${img}&lang=zh&uc=0&floor=${floor}`
      ajax_req.headers["Referer"] = javUrl + '/' + id

      response = await fetch(url, ajax_req)
      responseText = await response.text()

      $ = cheerio.load(responseText, {
        xmlMode: true,
        decodeEntities: true,
        normalizeWhitespace: true
      })

      let $tr = $('tr')
      if ($tr.length > 0) {
        for (let i = 0; i < $tr.length; i++) {
          let $a = $tr.eq(i).find('td:nth-child(2) a')
          let $a1 = $tr.eq(i).find('td:nth-child(3) a')
          let $subtitle = $tr.eq(i).find('a.btn-warning')
          let $hd = $tr.eq(i).find('a.btn-primary')
          if ($a.length === 0) continue
          result.magnet.push({
            link: decodeURI($a.attr('href').trim()),
            size: $a.text().trim(),
            dateTime: $a1.text().trim(),
            is_hd: $hd.text().trim(),
            has_subtitle: $subtitle.text().trim()
          })
        }

        // Sort magnets by quality: uncensored > HD > subtitle
        result.magnet = sortMagnetsByQuality(result.magnet)
      }
    }

    // Embedy part (kept as is, but using updated headers)
    url = embedyUrl + '/video/' + id
    ajax_req.headers["Referer"] = embedyUrl
    // Note: Embedy might also have protections, but focusing on JavBus first
    try {
      response = await fetch(url, ajax_req)
      if (response.ok) {
        responseText = await response.text()
        $ = cheerio.load(responseText, {
          xmlMode: true,
          decodeEntities: true,
          normalizeWhitespace: true
        })
        let $div = $('div.thumb.c')
        if ($div.length > 0) {
          let list = []
          for (let i = 0; i < $div.length; i++) {
            let $a3 = $div.eq(i).find('a')
            let $t3 = $div.eq(i).find('span.title')
            let $d3 = $div.eq(i).find('span.duration')
            let $i3 = $div.eq(i).find('img')
            let $v3 = $div.eq(i).find('span.view')
            $v3.find(':nth-child(n)').remove()
            if ($a3.length === 0) continue
            list.push({
              title: $t3.text().trim(),
              duration: $d3.text().trim(),
              view: $v3.text().trim(),
              cover: decodeURI($i3.attr('src').trim()),
              link: embedyUrl + decodeURI($a3.attr('href').trim())
            })
          }
          result.list = list.splice(0, 5)
        }
      }
    } catch (e) {
      console.error("Embedy fetch failed:", e)
    }

  } catch (e) {
    console.error("JavBus fetch failed:", e)
    throw e
  }

  return result
}
