# ติดตั้ง+เริ่มห้องฝึก OWASP Juice Shop (สร้างมาเพื่อให้ฝึกแฮ็กอย่างถูกกฎหมาย)
# รัน: powershell -File lab-setup.ps1   (ครั้งแรกโหลด ~5-10 นาที แล้วเว็บจะเปิดที่ http://localhost:3000)
$ErrorActionPreference = "Stop"
$env:CYPRESS_INSTALL_BINARY = "0"   # cypress ไม่จำเป็นสำหรับรันเซิร์ฟเวอร์ และการโหลด binary มักพังบน Windows
Set-Location (Split-Path $PSCommandPath)

if (!(Test-Path "juice-shop")) {
  Write-Host "1/3 กำลังดาวน์โหลด Juice Shop..." -ForegroundColor Green
  git clone --depth 1 https://github.com/juice-shop/juice-shop.git
}
Push-Location juice-shop
if (!(Test-Path "node_modules")) {
  Write-Host "2/3 กำลังติดตั้ง (5-10 นาที)..." -ForegroundColor Green
  npm install --no-audit --no-fund
}
Write-Host "3/3 เริ่มเว็บฝึกที่ http://localhost:3000 (กด Ctrl+C เพื่อหยุด)" -ForegroundColor Green
npm start
