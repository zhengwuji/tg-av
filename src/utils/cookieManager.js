import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { getEnv } from '../config/index.js'

puppeteer.use(StealthPlugin())

let cachedCookie = ''
let cookieExpiry = 0

export async function getValidCookie() {
    // 如果缓存的Cookie有效且未过期(有效期设为2小时),直接返回
    if (cachedCookie && Date.now() < cookieExpiry) {
        return cachedCookie
    }

    const email = getEnv('JAVDB_EMAIL', '')
    const password = getEnv('JAVDB_PASSWORD', '')

    if (!email || !password) {
        console.warn('未配置 JAVDB_EMAIL 或 JAVDB_PASSWORD, 无法自动登录。使用默认/环境变量Cookie。')
        return process.env.JAVDB_COOKIE || "over18=1; locale=zh"
    }

    console.log('正在启动浏览器进行JavDB自动登录...')

    let browser = null
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })

        const page = await browser.newPage()

        // 设置视口大小
        await page.setViewport({ width: 1366, height: 768 })

        // 访问登录页
        await page.goto('https://javdb.com/login', { waitUntil: 'networkidle2', timeout: 60000 })

        // 检查是否已经在登录页(可能被重定向)
        const title = await page.title()
        if (!title.includes('Login') && !title.includes('登入')) {
            console.log('似乎不需要登录或已登录:', title)
        } else {
            // 输入账号密码
            await page.type('input[name="email"]', email)
            await page.type('input[name="password"]', password)

            // 点击登录按钮
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
                page.click('button.button.is-success')
            ])
        }

        // 获取Cookies
        const cookies = await page.cookies()

        // 转换为Cookie字符串
        const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ')

        // 确保包含必要的Cookie
        let finalCookie = cookieStr
        if (!finalCookie.includes('over18=1')) finalCookie += '; over18=1'
        if (!finalCookie.includes('locale=zh')) finalCookie += '; locale=zh'

        // 更新缓存
        cachedCookie = finalCookie
        cookieExpiry = Date.now() + 2 * 60 * 60 * 1000 // 2小时有效期

        console.log('JavDB自动登录成功, Cookie已更新')
        return finalCookie

    } catch (error) {
        console.error('JavDB自动登录失败:', error)
        // 失败时返回旧的或默认Cookie
        return cachedCookie || process.env.JAVDB_COOKIE || "over18=1; locale=zh"
    } finally {
        if (browser) await browser.close()
    }
}
