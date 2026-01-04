// import fetch from 'node-fetch' // Using built-in fetch

class Telegram {
  constructor(token, message) {
    this.token = token
    this.message = message
    this.telegramUrl = 'https://api.telegram.org/bot' + this.token
  }

  async sendMessage(method, payload) {
    const url = `${this.telegramUrl}/${method}`
    const opts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
    try {
      await fetch(url, opts)
    } catch (e) {
      console.error(`Telegram ${method} failed:`, e)
    }
  }

  sendText(chat_id, text) {
    let payload = {
      "chat_id": chat_id,
      "parse_mode": "HTML",
      "disable_web_page_preview": true,
      "text": text
    };
    return this.sendMessage('sendMessage', payload)
  }

  sendPhoto(chat_id, photo) {
    let payload = {
      "chat_id": chat_id,
      "parse_mode": "HTML",
      "disable_web_page_preview": true,
      "photo": photo.url
    };

    if (photo.caption) {
      payload.caption = photo.caption
    }

    return this.sendMessage('sendPhoto', payload)
  }

}

export default Telegram
