import 'dotenv/config'
import TelegramBot from 'node-telegram-bot-api';
import { BOT_TOKEN } from './src/config/index.js';
import teleWorker from './src/handlers/teleWorker.js';

// 创建bot实例
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Telegram Bot 启动中...');
console.log('📡 使用 Polling 模式接收消息');

// 设置命令列表
bot.setMyCommands([
    { command: 'start', description: '欢迎语' },
    { command: 'av', description: '番号查询 (例: /av ssni-888)' },
    { command: 'random', description: '随机推荐番号' },
    { command: 'show', description: '热门推荐 (Pornhub)' },
    { command: 'star', description: '演员搜索 (例: /star 三上悠亜)' },
    { command: 'xv', description: '视频搜索 (Pornhub)' },
    { command: 'xm', description: '视频搜索 (XHamster)' },
    { command: 'state', description: '查询统计' }
]).then(() => {
    console.log('✅ 命令列表已更新');
}).catch((error) => {
    console.error('❌ 更新命令列表失败:', error);
});

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

// 监听回调查询 (按钮点击)
bot.on('callback_query', async (query) => {
    try {
        // 构造类似 Webhook 的请求对象
        const webhookBody = {
            callback_query: query,
            message: query.message
        };

        // 创建模拟的 Request 对象
        const mockRequest = {
            json: async () => webhookBody
        };

        // 调用原有的 teleWorker 处理逻辑
        await teleWorker(mockRequest);
    } catch (error) {
        console.error('处理回调时出错:', error);
    }
});

// 错误处理
bot.on('polling_error', (error) => {
    console.error('Polling 错误:', error);
});

console.log('✅ Bot 已启动，等待消息...');
