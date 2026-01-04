import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

puppeteer.use(StealthPlugin())

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function searchGoogleLens(imageUrl) {
    let browser = null
    try {
        console.log(`[GoogleLens] Starting search for: ${imageUrl}`)

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
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

        // Navigate to Google Images
        await page.goto('https://www.google.com/imghp?hl=zh-CN', { waitUntil: 'networkidle2' })

        // Click the camera icon "Search by image"
        // The selector might change, but usually it's an aria-label or specific class
        // We can try to find the input[type=file] directly if it exists, or click the button first

        // Try to find the camera button
        const cameraButton = await page.$('div[aria-label="按图片搜索"]');
        if (cameraButton) {
            await cameraButton.click();
        } else {
            // Try English label or generic icon class
            const altButton = await page.$('div[aria-label="Search by image"]');
            if (altButton) await altButton.click();
            else {
                // Fallback: try to click the div with camera icon class if known, or just wait
                // Google's new Lens UI might be different.
                // Let's try to find the file input directly. It might be hidden.
            }
        }

        // Wait for file input to appear
        // In new Google Lens, it might be a drag drop zone.
        // Usually there is an input[type=file] name='encoded_image' or similar

        // Download image to temp file
        const tempFilePath = path.join(__dirname, `lens_${Date.now()}.jpg`)
        const response = await fetch(imageUrl)
        const buffer = await response.arrayBuffer()
        fs.writeFileSync(tempFilePath, Buffer.from(buffer))

        // Upload file
        // Note: Google Lens often uses a specific input for upload
        const inputUploadHandle = await page.waitForSelector('input[type=file]', { timeout: 5000 });
        if (inputUploadHandle) {
            await inputUploadHandle.uploadFile(tempFilePath);
        } else {
            throw new Error('Could not find file input for Google Lens');
        }

        // Wait for results
        // Google Lens results URL usually starts with https://lens.google.com/search?
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

        const resultUrl = page.url();
        console.log(`[GoogleLens] Result URL: ${resultUrl}`);

        // Try to extract "Visual matches" or text
        // This is hard because the UI is complex canvas/dynamic
        // But we can return the URL at least.

        // Cleanup
        fs.unlinkSync(tempFilePath);

        return {
            url: resultUrl
        };

    } catch (error) {
        console.error('[GoogleLens] Error:', error)
        return null
    } finally {
        if (browser) await browser.close()
    }
}
