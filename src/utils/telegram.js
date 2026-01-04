// import fetch from 'node-fetch' // Using built-in fetch

class Telegram {
  constructor(token, message) {
    this.token = token
    this.message = message
    this.telegramUrl = 'https://api.telegram.org/bot' + this.token
  }

  async callApi(method, payload) {
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

  async sendMessage(chat_id, text, options = {}) {
    let payload = {
      "chat_id": chat_id,
      "parse_mode": "HTML",
      "disable_web_page_preview": true,
      "text": text,
      ...options
    };
    return this.callApi('sendMessage', payload)
  }

  async sendText(chat_id, text, options = {}) {
    return this.sendMessage(chat_id, text, options)
  }

  async sendPhoto(chat_id, photo, options = {}) {
    let payload = {
      "chat_id": chat_id,
      "parse_mode": "HTML",
      "disable_web_page_preview": true,
      "photo": photo.url,
      ...options
    };

    if (photo.caption) {
      payload.caption = photo.caption
    }

    return this.callApi('sendPhoto', payload)
  }

  async answerCallbackQuery(callback_query_id, text = '') {
    return this.callApi('answerCallbackQuery', {
      callback_query_id: callback_query_id,
      text: text
    })
  }

  async getFile(file_id) {
    const url = `${this.telegramUrl}/getFile?file_id=${file_id}`
    try {
      const response = await fetch(url)
      return await response.json()
    } catch (e) {
      console.error('Telegram getFile failed:', e)
      return null
    }
  }

  async getFileLink(file_id) {
    const file = await this.getFile(file_id)
    if (file && file.ok && file.result) {
      return `https://api.telegram.org/file/bot${this.token}/${file.result.file_path}`
    }
    return null
  }

}

export default Telegram
