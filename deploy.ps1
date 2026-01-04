# 部署脚本 - 将本地代码部署到服务器

$SERVER = "192.161.160.139"
$PORT = "55"
$USER = "root"
$REMOTE_PATH = "/root/javbus-bot"
$LOCAL_PATH = "c:\Users\Administrator\Desktop\ssh\Find-JavBus-Bot"

Write-Host "🚀 开始部署 JavBus Bot 到服务器..." -ForegroundColor Green

# 1. 清理本地不需要的文件
Write-Host "`n📦 清理本地文件..." -ForegroundColor Yellow
$excludeItems = @(
    "$LOCAL_PATH\node_modules",
    "$LOCAL_PATH\.git"
)

# 2. 使用 SCP 上传文件
Write-Host "`n📤 上传文件到服务器..." -ForegroundColor Yellow
Write-Host "目标: ${USER}@${SERVER}:${PORT}${REMOTE_PATH}" -ForegroundColor Cyan

# 注意: 需要手动输入密码 Qq852446634
scp -P $PORT -r `
    "$LOCAL_PATH\src" `
    "$LOCAL_PATH\package.json" `
    "$LOCAL_PATH\package-lock.json" `
    "$LOCAL_PATH\server.js" `
    "$LOCAL_PATH\router.js" `
    "$LOCAL_PATH\index.js" `
    "$LOCAL_PATH\README.md" `
    "${USER}@${SERVER}:${REMOTE_PATH}/"

Write-Host "`n✅ 文件上传完成!" -ForegroundColor Green
Write-Host "`n接下来请SSH登录服务器执行以下命令:" -ForegroundColor Yellow
Write-Host "  cd $REMOTE_PATH" -ForegroundColor Cyan
Write-Host "  npm install" -ForegroundColor Cyan
Write-Host "  npm start" -ForegroundColor Cyan
