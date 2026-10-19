// ส่งแผนที่สร้างไว้เข้า LINE (รันหลังจาก push ภาพขึ้น GitHub แล้ว)
import fs from 'fs';
const tok = process.env.LINE_TOKEN, repo = process.env.GITHUB_REPOSITORY, br = process.env.GITHUB_REF_NAME || 'main';
const pending = JSON.parse(fs.readFileSync('pending.json', 'utf8') || '[]');
if (!tok) { console.log('ยังไม่ได้ตั้ง LINE_TOKEN ใน Secrets'); process.exit(pending.length ? 1 : 0); }
await new Promise(r => setTimeout(r, 8000));   // รอให้ GitHub เผยแพร่ภาพ
for (const p of pending) {
  const url = `https://raw.githubusercontent.com/${repo}/${br}/${p.image}`;
  const r = await fetch('https://api.line.me/v2/bot/message/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
    body: JSON.stringify({ messages: [{ type: 'text', text: p.text.slice(0, 4900) }, { type: 'image', originalContentUrl: url, previewImageUrl: url }] }) });
  console.log('LINE', r.status, await r.text());
}
