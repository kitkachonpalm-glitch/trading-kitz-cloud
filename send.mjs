// ส่งการแจ้งเตือนเข้า LINE (รันหลังจาก push ภาพขึ้น GitHub แล้ว)
import fs from 'fs';
const tok = process.env.LINE_TOKEN, repo = process.env.GITHUB_REPOSITORY, br = process.env.GITHUB_REF_NAME || 'main';
const pending = JSON.parse(fs.existsSync('pending.json') ? fs.readFileSync('pending.json', 'utf8') || '[]' : '[]');
if (!pending.length) { console.log('ไม่มีอะไรต้องแจ้ง'); process.exit(0); }
if (!tok) { console.log('ยังไม่ได้ตั้ง LINE_TOKEN ใน Secrets'); process.exit(1); }
if (pending.some(p => p.image)) await new Promise(r => setTimeout(r, 8000));   // รอให้ GitHub เผยแพร่ภาพ
// รวมหลายข้อความเป็น 1 ครั้งส่ง (ไม่เกิน 5 กล่อง) เพื่อประหยัดโควตา LINE
const msgs = [];
for (const p of pending) {
  msgs.push({ type: 'text', text: p.text.slice(0, 4900) });
  if (p.image) { const url = `https://raw.githubusercontent.com/${repo}/${br}/${p.image}`; msgs.push({ type: 'image', originalContentUrl: url, previewImageUrl: url }); }
}
for (let i = 0; i < msgs.length; i += 5) {
  const r = await fetch('https://api.line.me/v2/bot/message/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
    body: JSON.stringify({ messages: msgs.slice(i, i + 5) }) });
  console.log('LINE', r.status, await r.text());
}
