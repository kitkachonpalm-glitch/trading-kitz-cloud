// Trading Kitz Cloud · สร้างแผน H1 + ภาพ ทุกชั่วโมงบน GitHub Actions (ไม่ต้องเปิดคอม)
// ราคา: Crypto.com Exchange public API (ฟรี ไม่ต้องใช้คีย์ ไม่เสียเครดิต)
import fs from 'fs';
import { createRequire } from 'module';
import canvasPkg from '@napi-rs/canvas';
const { createCanvas, GlobalFonts, loadImage } = canvasPkg;
const require = createRequire(import.meta.url);
const { analyze, drawScenCanvas, scenarioText, pickZones } = require('./engine.cjs');

const ASSETS = {
  XAUUSD: { name: 'ทองคำ', inst: 'XAUUSD-PERP', dp: 2 },
  XAGUSD: { name: 'เงิน', inst: 'XAGUSD-PERP', dp: 3 },
  USOIL: { name: 'น้ำมันดิบ', inst: 'CLUSD-PERP', dp: 2 },
  BTCUSD: { name: 'บิตคอยน์', inst: 'BTC_USD', dp: 1 },
};
const want = (process.env.ASSETS || 'XAUUSD').split(',').map(s => s.trim().toUpperCase()).filter(s => ASSETS[s]);
const hours = (process.env.HOURS || '8-23').split('-').map(Number);           // ช่วงเวลาไทยที่จะส่ง
const every = Math.max(1, Number(process.env.EVERY || 1));                    // ส่งทุกกี่ชั่วโมง
const bkk = new Date(Date.now() + 7 * 3600e3), hh = bkk.getUTCHours();
const force = process.env.FORCE === '1';
if (!force && (hh < hours[0] || hh > hours[1] || hh % every !== 0)) { console.log('นอกช่วงเวลาที่ตั้งไว้ ข้าม', hh); fs.writeFileSync('pending.json', '[]'); process.exit(0); }

for (const f of fs.existsSync('fonts') ? fs.readdirSync('fonts') : []) if (/\.ttf$/i.test(f)) GlobalFonts.registerFromPath('fonts/' + f, 'IBM Plex Sans Thai');

async function candles(inst, tf, count) {
  const u = `https://api.crypto.com/exchange/v1/public/get-candlestick?instrument_name=${inst}&timeframe=${tf}&count=${count}`;
  const r = await fetch(u); const j = await r.json(); const d = j?.result?.data || [];
  return d.map(x => ({ t: Math.floor(+x.t / 1000), o: +x.o, h: +x.h, l: +x.l, c: +x.c, v: +x.v || 0 })).filter(b => isFinite(b.c)).sort((a, b) => a.t - b.t);
}
function htfDir(d) { if (!d || d.length < 21) return null; const c = d.map(b => b.c), n = c.length, sma = e => c.slice(e - 20, e).reduce((a, b) => a + b, 0) / 20, s1 = sma(n), s0 = sma(n - 3); return c[n - 1] > s1 && s1 > s0 ? 1 : c[n - 1] < s1 && s1 < s0 ? -1 : 0; }

const logo = fs.existsSync('logo.png') ? await loadImage('logo.png') : null;
const C = { up: '#13a874', dn: '#e04a5f', buy: '#0c9463', sell: '#d43450', gold: '#a8790a', muted: '#5a6b85', grid: 'rgba(20,40,80,.08)', bg: '#f6f8fc' };
fs.mkdirSync('images', { recursive: true });
for (const f of fs.readdirSync('images')) if (Date.now() - fs.statSync('images/' + f).mtimeMs > 3 * 864e5) fs.unlinkSync('images/' + f);
const pending = [];
for (const id of want) {
  const a = { id, ...ASSETS[id] };
  try {
    const k = await candles(a.inst, '1h', 300), d = await candles(a.inst, '1D', 60);
    if (k.length < 60) { console.log(id, 'ข้อมูลไม่พอ'); continue; }
    if (Date.now() / 1000 - k[k.length - 1].t > 3 * 3600 && !force) { console.log(id, 'ตลาดปิด ข้าม'); continue; }
    const an = analyze(k, htfDir(d)); if (!an) continue;
    const S = { a, an, zones: pickZones(an), bias: an.bias, at: Date.now(), src: 'Crypto.com' };
    const W = 1200, H = 680, top = 70, cv = createCanvas(W, H + top);
    drawScenCanvas(S, cv, W, H, 1, C, top);
    const x = cv.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0);
    let tx = 24; if (logo) { x.drawImage(logo, 14, 7, 56, 56); tx = 82; }
    x.fillStyle = '#14233a'; x.font = '700 28px "IBM Plex Sans Thai"'; x.textBaseline = 'middle'; x.fillText(`Trading Kitz · ${a.name} H1`, tx, 36);
    const b = S.bias === 'BUY' ? ['มุมมอง: ซื้อ', C.buy] : S.bias === 'SELL' ? ['มุมมอง: ขาย', C.sell] : ['มุมมอง: รอจังหวะ', C.muted];
    x.font = '500 20px "IBM Plex Sans Thai"'; x.fillStyle = b[1]; x.fillText(`${b[0]} · คะแนน ${an.score}/10`, 560, 36);
    x.fillStyle = C.muted; x.font = '16px "IBM Plex Sans Thai"'; x.fillText(bkk.toISOString().slice(0, 16).replace('T', ' ') + ' (ไทย)', 1000, 36);
    const name = `${id}-${Date.now()}.jpg`;
    fs.writeFileSync('images/' + name, cv.toBuffer('image/jpeg', 86));
    pending.push({ text: '☁️ ' + scenarioText(S, true) + '\n(ส่งจากระบบคลาวด์ · ราคา Crypto.com)', image: 'images/' + name });
    console.log(id, 'สร้างแผนแล้ว', an.bias, an.score);
  } catch (e) { console.log(id, 'ผิดพลาด', e.message); }
}
fs.writeFileSync('pending.json', JSON.stringify(pending));
