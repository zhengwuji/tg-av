import 'dotenv/config'
import TelegramBot from 'node-telegram-bot-api';
import { BOT_TOKEN } from './src/config/index.js';
import teleWorker from './src/handlers/teleWorker.js';

// 创建bot实例
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Telegram Bot 启动中...');
console.log('📡 使用 Polling 模式接收消息');

// 监听所有消息
bot.on('message', async (msg) => {
    try {
        // 构造类似 Webhook 的请求对象
        const webhookBody = {
            message: msg
        };

        // 创建模拟的 Request 对象
        const mockRequest = {
            json: async () => webhookBody
        };

        // 调用原有的 teleWorker 处理逻辑
        await teleWorker(mockRequest);
    } catch (error) {
        console.error('处理消息时出错:', error);
    }
});

// 错误处理
bot.on('polling_error', (error) => {
    console.error('Polling 错误:', error);
});

console.log('✅ Bot 已启动，等待消息...');
