import * as cheerio from 'cheerio'
// Using built-in fetch for Cloudflare Worker compatibility

const xhamsterUrl = 'https://xhamster.com'

const BASE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7"
}

export async function reqXHamster(id) {
  const result = { list: [] }

  // Correct search URL
  let url = xhamsterUrl + '/search/' + encodeURI(id)

  let ajax_req = {
    headers: { ...BASE_HEADERS, "Referer": xhamsterUrl },
    method: "GET"
  }

  try {
    let response = await fetch(url, ajax_req)
    let responseText = await response.text()

    let $ = cheerio.load(responseText, {
      xmlMode: true,
      decodeEntities: true,
      normalizeWhitespace: true
    })

    let $items = $('div.video-thumb')
    if ($items.length > 0) {
      let list = []
      for (let i = 0; i < $items.length; i++) {
        let $item = $items.eq(i)
        let $a = $item.find('a.video-thumb__image-container')
        let $img = $item.find('img.thumb-image-container__image')
        let $duration = $item.find('div.thumb-image-container__duration span')

        // Title is often in aria-label or a separate element
        let title = $a.attr('aria-label') || $item.find('a.video-thumb-info__name').text().trim()

        if ($a.length === 0) continue

        list.push({
          title: title,
          cover: $img.attr('src') || $img.attr('data-src'),
          link: $a.attr('href'), // XHamster links are usually absolute or relative? Check test. Usually absolute or relative.
          duration: $duration.text().trim()
        })
      }
      result.list = list.splice(0, 8)
    }
  } catch (e) {
    console.error("XHamster fetch failed:", e)
  }

  return result
}
