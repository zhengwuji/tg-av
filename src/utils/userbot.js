import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import { API_ID, API_HASH, SESSION_STRING } from '../config/index.js'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const writeFile = promisify(fs.writeFile)
const mkdir = promisify(fs.mkdir)

let client = null

/**
 * Initialize the Userbot client
 */
export async function initUserbot() {
    if (client) return client

    if (!API_ID || !API_HASH || !SESSION_STRING) {
        console.log('[Userbot] Missing credentials, skipping initialization.')
        return null
    }

    try {
        client = new TelegramClient(new StringSession(SESSION_STRING), Number(API_ID), API_HASH, {
            connectionRetries: 5,
        })
        await client.connect()
        console.log('[Userbot] Connected successfully.')
        return client
    } catch (error) {
        console.error('[Userbot] Connection failed:', error)
        return null
    }
}

/**
 * Download media from a restricted message link
 * @param {string} link - The message link (e.g., https://t.me/c/123456/789)
 * @returns {Promise<string>} - The path to the downloaded file
 */
export async function downloadRestrictedMessage(link) {
    if (!client) {
        await initUserbot()
        if (!client) throw new Error('Userbot not configured or failed to connect.')
    }

    try {
        // Parse link
        // https://t.me/c/1234567890/123 -> channelId: -1001234567890, msgId: 123
        // https://t.me/username/123 -> channelId: username, msgId: 123

        let entity
        let msgId

        const parts = link.split('/')
        const lastPart = parts[parts.length - 1]
        msgId = parseInt(lastPart)

        if (link.includes('/c/')) {
            // Private channel ID
            // The link format is usually /c/1234567890/123
            // GramJS expects the ID without -100 prefix for some methods, but let's try to resolve it.
            // Actually, for getMessages, we might need the input peer.
            // Let's try to use the ID from the link.
            const idPart = parts[parts.length - 2]
            entity = `-100${idPart}` // Construct standard channel ID
        } else {
            // Public username
            entity = parts[parts.length - 2]
        }

        console.log(`[Userbot] Fetching message ${msgId} from ${entity}...`)

        // Get message
        const messages = await client.getMessages(entity, { ids: [msgId] })
        if (!messages || messages.length === 0 || !messages[0]) {
            throw new Error('Message not found or inaccessible.')
        }

        const message = messages[0]

        if (!message.media) {
            throw new Error('Message does not contain media.')
        }

        console.log('[Userbot] Downloading media...')

        // Determine filename
        let filename = 'restricted_download'
        let ext = ''

        if (message.photo) {
            ext = '.jpg'
            filename = `photo_${message.id}`
        } else if (message.video) {
            ext = '.mp4'
            filename = `video_${message.id}`
            // Try to get attribute name
            const attr = message.document?.attributes?.find(a => a.fileName)
            if (attr) filename = attr.fileName
        } else if (message.document) {
            ext = '.dat' // Default
            const attr = message.document.attributes.find(a => a.fileName)
            if (attr) {
                filename = attr.fileName
                ext = '' // filename already has extension
            } else {
                filename = `doc_${message.id}`
            }
        }

        const downloadDir = path.join(process.cwd(), 'downloads')
        await mkdir(downloadDir, { recursive: true })

        const filePath = path.join(downloadDir, filename + ext)

        const buffer = await client.downloadMedia(message, {
            outputFile: filePath
        })

        console.log(`[Userbot] Downloaded to ${filePath}`)
        return filePath

    } catch (error) {
        console.error('[Userbot] Download error:', error)
        throw error
    }
}
