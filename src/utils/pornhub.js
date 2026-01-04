import * as cheerio from 'cheerio'
// Using built-in fetch for Cloudflare Worker compatibility

const pornhubUrl = 'https://www.pornhub.com'

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
  'Cookie': 'age_verified=1'
}

export async function reqPornhub(id, bool) {
  const result = {
    list: []
  }

  let ajax_req = {
    headers: { ...BASE_HEADERS },
    method: 'GET'
  }

  let url = ''
  if (bool) {
    if (id) {
      url = pornhubUrl + '/video?o=' + id
    } else {
      url = pornhubUrl + '/video'
    }
  } else {
    url = pornhubUrl + '/video/search?search=' + encodeURI(id)
  }

  try {
    let response = await fetch(url, ajax_req)
    let responseText = await response.text()

    let $ = cheerio.load(responseText, {
      xmlMode: true,
      decodeEntities: true,
      normalizeWhitespace: true
    })

    // Modern selector for search results
    // 尝试多种选择器以提高兼容性
    let $items = $('ul#videoSearchResult li.pcVideoListItem, #videoCategory .pcVideoListItem, .videoBox')

    if ($items.length > 0) {
      let list = []
      for (let i = 0; i < $items.length; i++) {
        let $item = $items.eq(i)
        let $a = $item.find('a').eq(0) // Main link usually first
        let $title = $item.find('span.title a')
        let $img = $item.find('img')
        let $duration = $item.find('var.duration')
        let $views = $item.find('span.views var')
        let $rating = $item.find('div.value')

        if ($title.length === 0) continue

        list.push({
          title: $title.text().trim(),
          views: $views.text().trim(),
          good: $rating.text().trim(),
          duration: $duration.text().trim(),
          cover: $img.attr('src') || $img.attr('data-src'), // PH often uses lazy loading
          link: pornhubUrl + $title.attr('href')
        })
      }
      result.list = list.splice(0, 8)
    }
  } catch (e) {
    console.error("Pornhub fetch failed:", e)
  }

  return result
}
