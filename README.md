# FlowFoundry landing page

หน้า landing page แบบ static สำหรับเสนอขายบริการ automation ให้ธุรกิจขนาดเล็ก

**เว็บออนไลน์แล้ว:** https://pp0910619247-netizen.github.io/flowfoundry/
**Repo:** https://github.com/pp0910619247-netizen/flowfoundry
**เดโม่สมองจำลอง LUMA:** https://pp0910619247-netizen.github.io/flowfoundry/luma-brain/
**เดโม่ระบบรับออเดอร์:** https://pp0910619247-netizen.github.io/flowfoundry/demo/

## เปิดใช้งาน

เปิด `index.html` ด้วย browser ได้ทันที หรือเสิร์ฟด้วย static hosting เช่น GitHub Pages, Cloudflare Pages หรือ Netlify

## ตั้งค่าก่อนเผยแพร่

1. ✅ อีเมลติดต่อ: `aiginol011@gmail.com` (ตั้งใน `contactEmail` ที่ `app.js` แล้ว — แก้ได้ที่จุดเดียว ปุ่มส่งเมลตรงจะอัปเดตเอง)
2. ตรวจสอบราคา ข้อความ และเครือข่าย Polygon ให้ตรงกับบริการ
3. เพิ่มช่องทางติดต่อจริงและลิงก์ผลงานก่อนยิงโฆษณา
4. ทดสอบการคัดลอก wallet และการเปิดอีเมลร่างบนมือถือ

## Deploy ฟรีภายใน 5 นาที

### A) Netlify Drop (เร็วที่สุด)
1. เปิด https://app.netlify.com/drop
2. ลากโฟลเดอร์นี้ทั้งโฟลเดอร์ลงบนหน้าเว็บ
3. ได้ URL ทันที — สมัครบัญชีฟรีเพื่อเก็บเว็บถาวรและเปลี่ยนชื่อโดเมน (Site settings → Change site name)

### B) GitHub Pages
1. สร้าง repository ใหม่แบบ public แล้วอัปโหลดไฟล์ 4 ตัวขึ้น branch main
2. Settings → Pages → Source: "Deploy from a branch" → Branch: main / (root) → Save
3. เว็บจะอยู่ที่ `https://<username>.github.io/<repo>/`

### C) Cloudflare Pages
1. dash.cloudflare.com → Workers & Pages → Create application → Pages → Upload assets
2. ลากโฟลเดอร์นี้ → ได้ `https://<project>.pages.dev` พร้อม CDN ทั่วโลก

> หลัง deploy: ทดสอบบนมือถือ — กดปุ่ม "เลือกแพ็กเกจ" (ต้องเปิดอีเมลร่างถึง aiginol011@gmail.com) และปุ่มคัดลอก wallet

หน้าเว็บนี้ไม่รับ private key และไม่ส่งธุรกรรมอัตโนมัติ การชำระเงินควรเกิดขึ้นหลังยืนยันขอบเขตงานกับลูกค้าเท่านั้น
