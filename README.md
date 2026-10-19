# Trading Kitz Cloud — แผน H1 เข้า LINE แม้ปิดคอม

รันบน GitHub Actions (ฟรี) ทุกชั่วโมง: ดึงราคาจาก Crypto.com (ฟรี ไม่ใช้เครดิต) → วิเคราะห์ด้วยตรรกะเดียวกับเว็บแอป → สร้างภาพแผน → ส่งเข้า LINE OA

## ตั้งค่า (ครั้งเดียว)
1. สมัคร/ล็อกอิน github.com → New repository → ชื่อ `trading-kitz-cloud` → เลือก **Public** → Create
2. กด "uploading an existing file" → ลากไฟล์ทั้งหมดในโฟลเดอร์นี้ (รวมโฟลเดอร์ .github และ images) → Commit
3. Settings → Secrets and variables → Actions → **New repository secret** → Name: `LINE_TOKEN` · Secret: Channel access token ของ LINE OA
4. (ไม่บังคับ) แท็บ Variables → เพิ่มตัวแปร
   - `ASSETS` = `XAUUSD` (หลายตัวคั่นด้วยจุลภาค: XAUUSD,XAGUSD,USOIL,BTCUSD)
   - `HOURS` = `8-23` (ช่วงเวลาไทยที่จะส่ง)
   - `EVERY` = `1` (ทุกกี่ชั่วโมง เช่น 2 = ทุก 2 ชั่วโมง เพื่อประหยัดโควตา LINE)
5. แท็บ Actions → เปิดใช้งาน workflows → เลือก "Trading Kitz hourly plan" → **Run workflow** เพื่อทดสอบ

## หมายเหตุ
- repository ต้องเป็น Public เพื่อให้ LINE ดึงภาพได้ (ภาพแผนจะมองเห็นได้สาธารณะ แต่ token อยู่ใน Secrets ปลอดภัย)
- GitHub อาจรันช้ากว่าเวลาที่ตั้ง 5–15 นาที
- LINE OA แพ็กเกจฟรีจำกัดจำนวนข้อความต่อเดือน ตั้ง EVERY/HOURS ให้พอดีโควตา
- ภาพเก่ากว่า 3 วันจะถูกลบเอง
