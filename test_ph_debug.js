import * as cheerio from 'cheerio'

const pornhubUrl = 'https://www.pornhub.com'
const BASE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    'Cookie': 'age_verified=1'
}

async function test() {
    console.log('Fetching Pornhub...')
    try {
        const response = await fetch('https://www.pornhub.com/video/search?search=test', { headers: BASE_HEADERS })
        const text = await response.text()
        console.log('Response length:', text.length)

        const $ = cheerio.load(text)

        console.log('Checking selectors:')
        console.log('ul#videoSearchResult li.pcVideoListItem:', $('ul#videoSearchResult li.pcVideoListItem').length)
        console.log('.videoBox:', $('.videoBox').length)
        console.log('.phimage:', $('.phimage').length)
        console.log('li.js-pop:', $('li.js-pop').length)
        console.log('#videoSearchResult:', $('#videoSearchResult').length)

        // Print first item HTML if found
        const items = $('ul#videoSearchResult li.pcVideoListItem')
        if (items.length > 0) {
            console.log('First item HTML:', items.eq(0).html().substring(0, 200))
        } else {
            console.log('Printing body start:', $('body').html().substring(0, 500))
        }

    } catch (e) {
        console.error(e)
    }
}

test()
