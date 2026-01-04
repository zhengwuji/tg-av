import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

puppeteer.use(StealthPlugin())

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function searchXsList(imageUrl) {
    let browser = null
    try {
        console.log(`[XsList] Starting search for: ${imageUrl}`)

        // Launch browser
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        })

        const page = await browser.newPage()

        // Set a realistic User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

        // Navigate to XsList
        await page.goto('https://xslist.org/zh/searchByImage', { waitUntil: 'networkidle2' })

        // Download image to temp file
        const tempFilePath = path.join(__dirname, `temp_${Date.now()}.jpg`)
        const response = await fetch(imageUrl)
        const buffer = await response.arrayBuffer()
        fs.writeFileSync(tempFilePath, Buffer.from(buffer))

        // Upload file
        const inputUploadHandle = await page.$('input[type=file]')
        await inputUploadHandle.uploadFile(tempFilePath)

        // Wait for results
        // The results usually appear dynamically or after a redirect/reload
        // We wait for the result container or a specific element indicating success
        // Based on screenshots, results are listed with similarity
        try {
            await page.waitForSelector('h3 a', { timeout: 30000 }) // Wait for result links (actress names are usually links)
        } catch (e) {
            console.log('[XsList] Timeout waiting for results')
            fs.unlinkSync(tempFilePath)
            return null
        }

        // Parse results
        const results = await page.evaluate(() => {
            const items = document.querySelectorAll('div.row > div') // Adjust selector based on actual page structure if needed
            // Based on screenshot: 
            // "Akari Mitani - ... - 90.87% similarity"
            // It seems results are stacked. Let's try to find the first valid result.

            // More generic approach: find elements containing "similarity"
            const resultElements = Array.from(document.querySelectorAll('body *')).filter(el =>
                el.innerText && el.innerText.includes('similarity') && el.tagName === 'A' // Usually the name is a link above the similarity text or part of it
            )

            // Actually, looking at the screenshot:
            // Link: Akari Mitani - ... - 90.87% similarity
            // The link text itself contains the info.

            const links = Array.from(document.querySelectorAll('a'))
            const match = links.find(a => a.innerText.includes('similarity'))

            if (match) {
                const text = match.innerText
                // Format: "Name - ... - XX.XX% similarity"
                const similarityMatch = text.match(/(\d+\.?\d*)%\s*similarity/)
                const nameMatch = text.split('-')[0].trim()

                return {
                    name: nameMatch,
                    similarity: similarityMatch ? parseFloat(similarityMatch[1]) : 0,
                    link: match.href
                }
            }
            return null
        })

        // Cleanup temp file
        fs.unlinkSync(tempFilePath)

        return results

    } catch (error) {
        console.error('[XsList] Error:', error)
        return null
    } finally {
        if (browser) await browser.close()
    }
}
