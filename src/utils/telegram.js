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

  async getFile(fileId) {
    const url = `${this.telegramUrl}/getFile`
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId })
    }
    try {
      const response = await fetch(url, opts)
      const data = await response.json()
      return data.result
    } catch (e) {
      console.error('getFile failed:', e)
      return null
    }
  }

  async downloadFileBuffer(filePath) {
    const url = `https://api.telegram.org/file/bot${this.token}/${filePath}`
    try {
      const response = await fetch(url)
      return await response.arrayBuffer()
    } catch (e) {
      console.error('downloadFileBuffer failed:', e)
      return null
    }
  }

  async sendVideo(chat_id, video, options = {}) {
    let payload = {
      "chat_id": chat_id,
      "parse_mode": "HTML",
      "video": video.url || video.file_id,
      ...options
    }

    if (video.caption) {
      payload.caption = video.caption
    }

    return this.callApi('sendVideo', payload)
  }

  async sendDocument(chat_id, document, options = {}) {
    let payload = {
      "chat_id": chat_id,
      "parse_mode": "HTML",
      "document": document.url || document.file_id,
      ...options
    }

    if (document.caption) {
      payload.caption = document.caption
    }

    return this.callApi('sendDocument', payload)
  }

  async copyMessage(chat_id, from_chat_id, message_id, options = {}) {
    let payload = {
      "chat_id": chat_id,
      "from_chat_id": from_chat_id,
      "message_id": message_id,
      ...options
    }

    return this.callApi('copyMessage', payload)
  }

}

export default Telegram
