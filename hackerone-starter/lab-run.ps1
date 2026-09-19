# build + start Juice Shop (ทำงานพื้นหลัง บันทึกผลลง build.log / server.log)
$env:NODE_OPTIONS = "--max-old-space-size=4096"
$base = Split-Path $PSCommandPath
Set-Location (Join-Path $base "juice-shop")
npm run build:frontend 2>&1 | Out-File (Join-Path $base "build.log") -Encoding utf8
npm start 2>&1 | Out-File (Join-Path $base "server.log") -Encoding utf8
