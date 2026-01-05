import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import input from 'input' // npm install input

const apiId = Number(process.env.API_ID)
const apiHash = process.env.API_HASH

if (!apiId || !apiHash) {
    console.error('Error: API_ID and API_HASH environment variables are required.')
    console.log('Usage: API_ID=12345 API_HASH=abcdef node scripts/generate_session.js')
    process.exit(1)
}

const stringSession = new StringSession('')

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
})

async function main() {
    console.log('Loading interactive example...')
    await client.start({
        phoneNumber: async () => await input.text('Please enter your number: '),
        password: async () => await input.text('Please enter your password: '),
        phoneCode: async () => await input.text('Please enter the code you received: '),
        onError: (err) => console.log(err),
    })
    console.log('You should now be connected.')
    console.log('Save this session string to your .env file as SESSION_STRING:')
    console.log(client.session.save()) // This should print the session string
    await client.disconnect()
}

main()
