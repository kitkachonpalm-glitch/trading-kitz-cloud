// Trading Kitz Cloud · รันทุก 5 นาทีบน GitHub Actions (ไม่ต้องเปิดคอม)
// 1) แผน H1 + ภาพ ทุกชั่วโมง  2) แจ้งเมื่อราคาเข้าโซน Demand/Supply  3) แจ้งสัญญาณ BUY/SELL ใหม่
// 4) ติดตามไม้ตามสัญญาณ: แจ้งถึง TP1/TP2/TP3, โดน SL, หรือสัญญาณกลับทิศ
// ราคา: Crypto.com Exchange public API (ฟรี ไม่ใช้คีย์ ไม่เสียเครดิต)
import fs from 'fs';
import { createRequire } from 'module';
import canvasPkg from '@napi-rs/canvas';
const { createCanvas, GlobalFonts, loadImage } = canvasPkg;
const require = createRequire(import.meta.url);
const { analyze, drawScenCanvas, scenarioText, pickZones, fmt } = require('./engine.cjs');

const ASSETS = {
  XAUUSD: { name: 'ทองคำ', inst: 'XAUUSD-PERP', dp: 2 },
  XAGUSD: { name: 'เงิน', inst: 'XAGUSD-PERP', dp: 3 },
  USOIL: { name: 'น้ำมันดิบ', inst: 'CLUSD-PERP', dp: 2 },
  BTCUSD: { name: 'บิตคอยน์', inst: 'BTC_USD', dp: 1 },
};
const env = (k, d) => (process.env[k] ?? '') === '' ? d : process.env[k];
const want = env('ASSETS', 'XAUUSD').split(',').map(s => s.trim().toUpperCase()).filter(s => ASSETS[s]);
const [h0, h1] = env('HOURS', '8-23').split('-').map(Number);          // ช่วงเวลาไทยที่ส่งแผนรายชั่วโมง
const every = Math.max(1, Number(env('EVERY', 1)));
const SIG_TFS = env('SIG_TFS', '1h,15m').split(',').map(s => s.trim()).filter(Boolean);   // ไทม์เฟรมที่แจ้งสัญญาณ
const ON = k => env(k, '1') !== '0';                                     // ALERT_PLAN / ALERT_ZONE / ALERT_SIGNAL / ALERT_EXIT
const force = env('FORCE', '0') === '1';
const TF_SEC = { '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1D': 86400 };
const TF_TH = { '5m': '5 นาที', '15m': '15 นาที', '1h': '1 ชม.', '4h': '4 ชม.' };
const now = Date.now() / 1000, bkk = new Date(Date.now() + 7 * 3600e3), hh = bkk.getUTCHours();

const STATE_FILE = 'state.json';
const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {};
state.plans ??= {}; state.trades ??= {}; state.sent ??= []; state.lastCheck ??= {}; state.zoneHit ??= {};
const sent = new Set(state.sent);
const pending = [];
const push = (text, image) => pending.push(image ? { text, image } : { text });

for (const f of fs.existsSync('fonts') ? fs.readdirSync('fonts') : []) if (/\.ttf$/i.test(f)) GlobalFonts.registerFromPath('fonts/' + f, 'IBM Plex Sans Thai');

async function candles(inst, tf, count) {
  const u = `https://api.crypto.com/exchange/v1/public/get-candlestick?instrument_name=${inst}&timeframe=${tf}&count=${count}`;
  const r = await fetch(u); const j = await r.json(); const d = j?.result?.data || [];
  return d.map(x => ({ t: Math.floor(+x.t / 1000), o: +x.o, h: +x.h, l: +x.l, c: +x.c, v: +x.v || 0 })).filter(b => isFinite(b.c)).sort((a, b) => a.t - b.t);
}
// ── แหล่งราคา: MT5 บนคอมคุณ (ถ้าเปิดอยู่) ไม่งั้นใช้ Crypto.com ──
const PC = (process.env.PC_URL || '').trim().replace(/\/+$/, '').replace(/\/mcp$/, '');
const TF_MT = { '5m': 'M5', '15m': 'M15', '1h': 'H1', '4h': 'H4', '1D': 'D1' };
const TF_LB = { '5m': 'M5', '15m': 'M15', '1h': 'H1', '4h': 'H4', '1D': 'D1' };
let pcOk = false, pcBroker = '';
async function pcFetch(path) { const r = await fetch(PC + path, { headers: { 'ngrok-skip-browser-warning': '1', 'User-Agent': 'trading-kitz-cloud' }, signal: AbortSignal.timeout(12000) }); return r.json(); }
if (PC) { try { const j = await pcFetch('/api/ping'); pcOk = !!j.ok; pcBroker = j.broker || ''; } catch (e) { pcOk = false; } }
console.log('แหล่งราคา:', pcOk ? `MT5 บนคอม (${pcBroker})` : 'Crypto.com');
const SRC = pcOk ? `XM MT5${pcBroker ? ' · ' + pcBroker : ''}` : 'Crypto.com';
async function getK(a, tf, count) {
  if (pcOk) { try { const j = await pcFetch(`/api/candles?symbol=${a.id}&tf=${TF_MT[tf]}&count=${count}`); if (j.ok && j.candles?.length) return j.candles.map(c => ({ t: c[0], o: c[1], h: c[2], l: c[3], c: c[4], v: c[5] || 0 })); } catch (e) {} }
  return candles(a.inst, tf, count);
}
const closedOnly = (k, tf) => k.filter(b => b.t + TF_SEC[tf] <= now + 5);
function htfDir(d) { if (!d || d.length < 21) return null; const c = d.map(b => b.c), n = c.length, sma = e => c.slice(e - 20, e).reduce((a, b) => a + b, 0) / 20, s1 = sma(n), s0 = sma(n - 3); return c[n - 1] > s1 && s1 > s0 ? 1 : c[n - 1] < s1 && s1 < s0 ? -1 : 0; }
const f = (a, v) => fmt(v, a.dp);

const logo = fs.existsSync('logo.png') ? await loadImage('logo.png') : null;
const C = { up: '#13a874', dn: '#e04a5f', buy: '#0c9463', sell: '#d43450', gold: '#a8790a', muted: '#5a6b85', grid: 'rgba(20,40,80,.08)', bg: '#f6f8fc' };
fs.mkdirSync('images', { recursive: true });
for (const x of fs.readdirSync('images')) if (Date.now() - fs.statSync('images/' + x).mtimeMs > 3 * 864e5) fs.unlinkSync('images/' + x);

function planImage(S, right) {
  const a = S.a, an = S.an, W = 1200, H = 680, top = 70, cv = createCanvas(W, H + top);
  drawScenCanvas(S, cv, W, H, 1, C, top);
  const x = cv.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0);
  let tx = 24; if (logo) { x.drawImage(logo, 14, 7, 56, 56); tx = 82; }
  x.fillStyle = '#14233a'; x.font = '700 28px "IBM Plex Sans Thai"'; x.textBaseline = 'middle'; x.fillText(`Trading Kitz · ${a.name} ${S.tf || 'H1'}`, tx, 36);
  const b = right || (S.bias === 'BUY' ? ['มุมมอง: ซื้อ', C.buy] : S.bias === 'SELL' ? ['มุมมอง: ขาย', C.sell] : ['มุมมอง: รอจังหวะ', C.muted]);
  x.font = '500 20px "IBM Plex Sans Thai"'; x.fillStyle = b[1]; x.fillText(right ? b[0] : `${b[0]} · คะแนน ${an.score}/10`, 560, 36);
  x.fillStyle = C.muted; x.font = '16px "IBM Plex Sans Thai"'; x.fillText(bkk.toISOString().slice(0, 16).replace('T', ' ') + ' (ไทย)', 1000, 36);
  const name = `${a.id}-${S.tf || 'H1'}-${Date.now()}.jpg`; fs.writeFileSync('images/' + name, cv.toBuffer('image/jpeg', 86)); return 'images/' + name;
}
// ระดับของไม้จากสัญญาณ: ใช้แผนของระบบถ้าทิศตรงกัน ไม่งั้นใช้ SL ของสัญญาณ + 1.5R / 2.5R / 3.5R
function tradeLevels(an, sig) {
  const p = an.plan, side = sig.s, dir = side === 'buy' ? 1 : -1, entry = an.k[sig.i].c;
  if (p && !p.wait && p.side === side) return { side, entry: p.entry, sl: p.sl, tps: [p.t1, p.t2, p.t3], slFrom: p.slFrom, tpFrom: p.tpFrom };
  const risk = Math.abs(entry - sig.stop);
  return { side, entry, sl: sig.stop, tps: [1.5, 2.5, 3.5].map(m => entry + dir * m * risk), slFrom: 'สวิงล่าสุด', tpFrom: ['1.5R', '2.5R', '3.5R'] };
}

for (const id of want) {
  const a = { id, ...ASSETS[id] };
  try {
    const k1h = await getK(a, '1h', 300), d = await getK(a, '1D', 60), k5 = await getK(a, '5m', 60);
    if (k1h.length < 60 || !k5.length) { console.log(id, 'ข้อมูลไม่พอ'); continue; }
    const lastBar = k5[k5.length - 1], price = lastBar.c;
    if (now - lastBar.t > 3 * 3600 && !force) { console.log(id, 'ตลาดปิด ข้าม'); continue; }
    const htf = htfDir(d), since = state.lastCheck[id] || now - 600;
    const recent = k5.filter(b => b.t + 300 > since);                    // แท่ง 5 นาทีตั้งแต่รอบก่อน (ใช้หา high/low ที่ราคาไปถึง)
    const hi = Math.max(...recent.map(b => b.h), price), lo = Math.min(...recent.map(b => b.l), price);

    // ── 1) แผน H1 รายชั่วโมง ──
    const hourKey = Math.floor(now / 3600);
    const planDue = force || (hh >= h0 && hh <= h1 && hh % every === 0 && state.plans[id]?.hour !== hourKey);
    const anH = analyze(closedOnly(k1h, '1h').concat(k1h.slice(-1)), htf);
    if (anH && (planDue || state.plans[id]?.hour !== hourKey)) {
      const S = { a, an: anH, zones: pickZones(anH), bias: anH.bias, at: Date.now(), src: SRC, tf: 'H1' };
      state.plans[id] = { hour: hourKey, bias: S.bias, zones: S.zones.map(z => ({ name: z.name, kind: z.kind, top: z.top, bot: z.bot })) };
      if (planDue && ON('ALERT_PLAN')) push('☁️ ' + scenarioText(S, true) + `\n(ราคา ${SRC})`, planImage(S));
    }

    // ── 2) ราคาเข้าโซนของแผน H1 ──
    const pl = state.plans[id];
    for (const [zk, t] of Object.entries(state.zoneHit)) if (now - t > 12 * 3600) delete state.zoneHit[zk];
    if (pl && ON('ALERT_ZONE')) for (const z of pl.zones) {
      const zk = `${id}|${z.kind}|${(z.bot / (anH?.atrL || 1)).toFixed(0)}`;      // โซนเดิม (ราคาใกล้กัน) แจ้งครั้งเดียวใน 12 ชม.
      if (state.zoneHit[zk]) continue;
      if (hi >= z.bot && lo <= z.top) {
        state.zoneHit[zk] = now;
        const buy = z.kind === 'd';
        push(`🎯 ${a.name} ราคาเข้า ${z.name} (${f(a, z.bot)}–${f(a, z.top)}) · โซน H1\nราคาตอนนี้ ${f(a, price)} (${SRC})\n` +
          (buy ? `แผน: รอแท่ง H1/M15 กลับตัวขึ้น (Engulfing / Hammer / ปิดเหนือโซน) แล้วพิจารณา Buy\nSL ใต้ ${f(a, z.bot - (anH?.atrL || 0) * .4)}\nยกเลิกถ้าแท่ง H1 ปิดต่ำกว่า ${f(a, z.bot)}`
               : `แผน: รอแท่ง H1/M15 กลับตัวลง (Engulfing / Shooting Star / ปิดใต้โซน) แล้วพิจารณา Sell\nSL เหนือ ${f(a, z.top + (anH?.atrL || 0) * .4)}\nยกเลิกถ้าแท่ง H1 ปิดเหนือ ${f(a, z.top)}`));
      }
    }

    // ── 3) ติดตามไม้ที่เปิดตามสัญญาณ: TP / SL ──
    const tr = state.trades[id];
    if (tr && ON('ALERT_EXIT')) {
      const dir = tr.side === 'buy' ? 1 : -1, hitSL = dir > 0 ? lo <= tr.sl : hi >= tr.sl;
      if (hitSL) {
        push(`${tr.be ? '⚪' : '❌'} ${a.name} ${tr.side.toUpperCase()} (${TF_TH[tr.tf]}) โดน SL ${tr.be ? 'ที่จุดเข้า (เสมอตัว)' : f(a, tr.sl)}\nเข้า ${f(a, tr.entry)} · ปิดแผนนี้แล้ว`);
        delete state.trades[id];
      } else {
        for (let j = tr.hit.length; j < 3; j++) {
          const t = tr.tps[j]; if (!(dir > 0 ? hi >= t : lo <= t)) break;
          tr.hit.push(j);
          const rr = Math.abs(t - tr.entry) / Math.abs(tr.entry - tr.sl0);
          push(`✅ ${a.name} ${tr.side.toUpperCase()} (${TF_TH[tr.tf]}) ถึง TP${j + 1} ${f(a, t)} (+${rr.toFixed(1)}R)\n` +
            (j === 0 ? `แนะนำ: ปิดบางส่วน และเลื่อน SL มาที่จุดเข้า ${f(a, tr.entry)}` : j === 1 ? 'แนะนำ: ปิดเพิ่ม หรือขยับ SL ตามกำไร' : 'ครบทุกเป้าหมาย · ปิดแผนนี้แล้ว'));
          if (j === 0) { tr.sl = tr.entry; tr.be = true; }
        }
        if (tr.hit.length >= 3) delete state.trades[id];
        else if (now - tr.t > 72 * 3600) { push(`⏱ ${a.name} แผน ${tr.side.toUpperCase()} (${TF_TH[tr.tf]}) เกิน 72 ชม. ยังไม่ถึงเป้า · ปิดการติดตาม`); delete state.trades[id]; }
      }
    }

    // ── 4) สัญญาณ BUY/SELL ใหม่ (แท่งที่ปิดแล้ว) ──
    if (ON('ALERT_SIGNAL')) for (const tf of SIG_TFS) {
      const raw = tf === '1h' ? k1h : await getK(a, tf, 300), k = closedOnly(raw, tf);
      if (k.length < 60) continue;
      const an = analyze(k, htf); if (!an) continue;
      const sig = an.sigs[an.sigs.length - 1];
      if (!sig || sig.i < k.length - 2) continue;                       // ต้องเกิดในแท่งที่เพิ่งปิด
      const key = `${id}|${tf}|${k[sig.i].t}|${sig.s}`; if (sent.has(key)) continue; sent.add(key);
      const L = tradeLevels(an, sig), cur = state.trades[id];
      if (cur && cur.side !== L.side && ON('ALERT_EXIT'))
        push(`🔄 ${a.name} สัญญาณกลับทิศ (${TF_TH[tf]}): ${L.side.toUpperCase()}\nไม้ ${cur.side.toUpperCase()} ที่เข้า ${f(a, cur.entry)} ควรพิจารณาปิด หรือเลื่อน SL ให้แคบลง`);
      if (cur && cur.side === L.side && TF_SEC[cur.tf] > TF_SEC[tf]) continue;   // มีไม้ทิศเดียวกันจากกรอบใหญ่กว่าอยู่แล้ว
      const rr = L.tps.map(t => (Math.abs(t - L.entry) / Math.abs(L.entry - L.sl)).toFixed(1));
      const side = L.side === 'buy' ? 'BUY' : 'SELL';
      an.plan = { side: L.side, entry: L.entry, sl: L.sl, t1: L.tps[0], t2: L.tps[1], t3: L.tps[2] };
      const SI = { a, an, zones: pickZones(an), bias: side, tf: TF_LB[tf], noArrows: true };
      let img = null; try { img = planImage(SI, [`สัญญาณ ${side} · แบบ ${sig.type}`, side === 'BUY' ? C.buy : C.sell]); } catch (e) { console.log('ภาพสัญญาณผิดพลาด', e.message); }
      push(`${L.side === 'buy' ? '🟢 BUY' : '🔴 SELL'} ${a.name} (${TF_LB[tf]} · ${TF_TH[tf]}) · แบบ ${sig.type}${sig.strong ? '' : ' ↺ สวนเทรนด์'}\nคะแนน ${an.score}/10\n` +
        `Entry ${f(a, L.entry)}\nSL ${f(a, L.sl)} (${L.slFrom})\nTP1 ${f(a, L.tps[0])} (1:${rr[0]})\nTP2 ${f(a, L.tps[1])} (1:${rr[1]})\nTP3 ${f(a, L.tps[2])} (1:${rr[2]})\n(ราคา ${SRC} · ระบบจะแจ้งเมื่อถึง TP หรือโดน SL)`, img);
      state.trades[id] = { side: L.side, tf, entry: L.entry, sl: L.sl, sl0: L.sl, tps: L.tps, hit: [], t: now };
    }
    state.lastCheck[id] = now;
    console.log(id, 'ตรวจแล้ว ราคา', price, '· แจ้ง', pending.length);
  } catch (e) { console.log(id, 'ผิดพลาด', e.message); }
}
state.sent = [...sent].slice(-300);
fs.writeFileSync(STATE_FILE, JSON.stringify(state));
fs.writeFileSync('pending.json', JSON.stringify(pending));
