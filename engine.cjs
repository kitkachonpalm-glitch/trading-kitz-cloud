// engine.cjs — สร้างจากเว็บแอป Trading Kitz (ตรรกะเดียวกัน)
const fmt=(v,dp)=>v==null||!isFinite(v)?'—':Number(v).toLocaleString('en-US',{minimumFractionDigits:dp,maximumFractionDigits:dp});
const esc=s=>String(s??'');
/* ═══════════ อินดิเคเตอร์ ═══════════ */
const ema=(a,p)=>{const k=2/(p+1);let e=a[0];return a.map((v,i)=>e=i?v*k+e*(1-k):v)};
function sma(a,p){const r=[];let s=0;for(let i=0;i<a.length;i++){s+=a[i];if(i>=p)s-=a[i-p];r.push(i>=p-1?s/p:null)}return r}
function boll(c,p=20,m=2){const mid=sma(c,p);return mid.map((v,i)=>{if(v==null)return null;let s=0;for(let j=i-p+1;j<=i;j++)s+=(c[j]-v)**2;const sd=Math.sqrt(s/p);return{m:v,u:v+m*sd,l:v-m*sd}})}
function rsi(c,p=14){const r=Array(c.length).fill(50);let g=0,l=0;
  for(let i=1;i<c.length;i++){const d=c[i]-c[i-1],up=Math.max(d,0),dn=Math.max(-d,0);
    if(i<=p){g+=up/p;l+=dn/p}else{g=(g*(p-1)+up)/p;l=(l*(p-1)+dn)/p}
    if(i>=p)r[i]=l===0?100:100-100/(1+g/l)}return r}
function atr(k,p=14){let a=k[0].h-k[0].l;return k.map((b,i)=>{const tr=i?Math.max(b.h-b.l,Math.abs(b.h-k[i-1].c),Math.abs(b.l-k[i-1].c)):b.h-b.l;a=i<p?(a*i+tr)/(i+1):(a*(p-1)+tr)/p;return a||1e-9})}
function adx(k,p=14){const n=k.length,A=Array(n).fill(null),P=Array(n).fill(null),M=Array(n).fill(null);let tr=0,pd=0,md=0,ax=null;const dxs=[];
  for(let i=1;i<n;i++){const up=k[i].h-k[i-1].h,dn=k[i-1].l-k[i].l,p1=up>dn&&up>0?up:0,m1=dn>up&&dn>0?dn:0,t=Math.max(k[i].h-k[i].l,Math.abs(k[i].h-k[i-1].c),Math.abs(k[i].l-k[i-1].c));
    if(i<=p){tr+=t;pd+=p1;md+=m1}else{tr=tr-tr/p+t;pd=pd-pd/p+p1;md=md-md/p+m1}
    if(i>=p&&tr>0){const pp=100*pd/tr,mm=100*md/tr,dx=pp+mm?100*Math.abs(pp-mm)/(pp+mm):0;P[i]=pp;M[i]=mm;
      if(ax==null){dxs.push(dx);if(dxs.length===p)ax=dxs.reduce((a,b)=>a+b)/p}else ax=(ax*(p-1)+dx)/p;A[i]=ax}}
  return{A,P,M}}
function stoch(k,p=14,s=3){const raw=k.map((b,i)=>{if(i<p-1)return 50;let h=-Infinity,l=Infinity;for(let j=i-p+1;j<=i;j++){h=Math.max(h,k[j].h);l=Math.min(l,k[j].l)}return h===l?50:(b.c-l)/(h-l)*100});
  const K=sma(raw,s).map(v=>v??50);return{K,D:sma(K,s).map(v=>v??50)}}

/* ═══════════ รูปแบบแท่งเทียน ═══════════ */
const PAT={
 bullEngulf:{th:'กลืนกินขาขึ้น',en:'Bullish Engulfing',d:1,s:'BE'},bearEngulf:{th:'กลืนกินขาลง',en:'Bearish Engulfing',d:-1,s:'BE'},
 hammer:{th:'ค้อน',en:'Hammer',d:1,s:'H'},shooting:{th:'ดาวตก',en:'Shooting Star',d:-1,s:'SS'},
 morning:{th:'ดาวรุ่ง',en:'Morning Star',d:1,s:'MS'},evening:{th:'ดาวค่ำ',en:'Evening Star',d:-1,s:'ES'},
 soldiers:{th:'ทหารขาว 3 ตัว',en:'Three White Soldiers',d:1,s:'3W'},crows:{th:'อีกาดำ 3 ตัว',en:'Three Black Crows',d:-1,s:'3B'},
 tweezB:{th:'แหนบก้นเหว',en:'Tweezer Bottom',d:1,s:'TB'},tweezT:{th:'แหนบยอดดอย',en:'Tweezer Top',d:-1,s:'TT'},
 doji:{th:'โดจิ (ลังเล)',en:'Doji',d:0,s:'D'},
};
function patterns(k,A,e20){
  const out=[];
  for(let i=3;i<k.length;i++){
    const b=k[i],p=k[i-1],q=k[i-2],a=A[i];
    const body=Math.abs(b.c-b.o),range=b.h-b.l||1e-9,upper=b.h-Math.max(b.o,b.c),lower=Math.min(b.o,b.c)-b.l;
    const pb=Math.abs(p.c-p.o),down=p.c<e20[i-1]&&k[i-3].c>p.c,upT=p.c>e20[i-1]&&k[i-3].c<p.c;
    const add=key=>out.push({i,key,...PAT[key]});
    if(p.c<e20[i-1]&&p.c<p.o&&b.c>b.o&&b.c>=p.o&&b.o<=p.c&&body>pb&&body>.4*a)add('bullEngulf');
    else if(p.c>e20[i-1]&&p.c>p.o&&b.c<b.o&&b.c<=p.o&&b.o>=p.c&&body>pb&&body>.4*a)add('bearEngulf');
    else if(down&&lower>=2*body&&upper<=.15*range&&range>.5*a)add('hammer');
    else if(upT&&upper>=2*body&&lower<=.15*range&&range>.5*a)add('shooting');
    else if(q.c<q.o&&Math.abs(q.c-q.o)>.6*a&&pb<.3*a&&b.c>b.o&&b.c>(q.o+q.c)/2)add('morning');
    else if(q.c>q.o&&Math.abs(q.c-q.o)>.6*a&&pb<.3*a&&b.c<b.o&&b.c<(q.o+q.c)/2)add('evening');
    else if([q,p,b].every(x=>x.c>x.o&&x.c-x.o>.5*a)&&b.c>p.c&&p.c>q.c)add('soldiers');
    else if([q,p,b].every(x=>x.c<x.o&&x.o-x.c>.5*a)&&b.c<p.c&&p.c<q.c)add('crows');
    else if(down&&p.c<p.o&&b.c>b.o&&Math.abs(b.l-p.l)<.07*a)add('tweezB');
    else if(upT&&p.c>p.o&&b.c<b.o&&Math.abs(b.h-p.h)<.07*a)add('tweezT');
    else if(body<=.1*range&&range>.6*a)add('doji');
  }
  return out;
}

/* ═══════════ เครื่องวิเคราะห์ ═══════════ */
function analyze(k,htf){
  const n=k.length;if(n<40)return null;const WARM=Math.min(210,Math.floor(n*.45));
  const c=k.map(b=>b.c),e20=ema(c,20),e50=ema(c,50),e200=ema(c,200),R=rsi(c),A=atr(k),BB=boll(c),AD=adx(k),ST=stoch(k);
  const e12=ema(c,12),e26=ema(c,26),m=e12.map((v,i)=>v-e26[i]),sg=ema(m,9),hist=m.map((v,i)=>v-sg[i]);
  const last=c[n-1],atrL=A[n-1];
  // แนวรับแนวต้านจาก pivot
  const L=5,piv=[];
  for(let i=L;i<n-L;i++){let H=true,Lo=true;for(let j=i-L;j<=i+L;j++){if(k[j].h>k[i].h)H=false;if(k[j].l<k[i].l)Lo=false}if(H)piv.push(k[i].h);if(Lo)piv.push(k[i].l)}
  const tol=.6*atrL,cl=[];
  piv.sort((x,y)=>x-y).forEach(p=>{const z=cl.find(q=>Math.abs(q.p-p)<=tol);if(z){z.p=(z.p*z.n+p)/(z.n+1);z.n++}else cl.push({p,n:1})});
  const res=cl.filter(q=>q.p>last).sort((x,y)=>x.p-y.p).slice(0,3),sup=cl.filter(q=>q.p<last).sort((x,y)=>y.p-x.p).slice(0,3);
  // Supply / Demand
  let zones=[];
  for(let i=2;i<n;i++){const b=k[i],base=k[i-1];if(Math.abs(b.c-b.o)>1.6*A[i]&&Math.abs(base.c-base.o)<.6*A[i-1])zones.push({type:b.c>b.o?'d':'s',top:base.h,bot:base.l,start:i-1,tested:false,broken:false})}
  zones.forEach(z=>{for(let i=z.start+2;i<n;i++){const b=k[i];if(z.type==='d'){if(b.c<z.bot){z.broken=true;break}if(b.l<=z.top)z.tested=true}else{if(b.c>z.top){z.broken=true;break}if(b.h>=z.bot)z.tested=true}}});
  zones=zones.filter(z=>!z.broken);
  const dem=zones.filter(z=>z.type==='d').slice(-3),spl=zones.filter(z=>z.type==='s').slice(-3);
  const inZ=(z,b)=>b.l<=z.top&&b.h>=z.bot;
  const pats=patterns(k,A,e20),patAt={};pats.forEach(p=>patAt[p.i]=p);
  // ── Signal engine v2: ใช้เฉพาะข้อมูล ณ แท่งนั้น (ไม่มองอนาคต) ──
  const SWL=4,smc=[],sigs=[],swH=[],swL=[];let sh=null,sl_=null,trend=0,ls=-99,lastStruct={dir:0,i:-99,type:''},div={bull:-99,bear:-99};
  const slope=(a,i,b)=>i>=b?(a[i]-a[i-b])/(A[i]||1):0;
  for(let i=SWL*2;i<n;i++){
    const j=i-SWL;let H=true,Lw=true;for(let q=j-SWL;q<=j+SWL;q++){if(k[q].h>k[j].h)H=false;if(k[q].l<k[j].l)Lw=false}
    if(H){sh={p:k[j].h,i:j,done:false};swH.push({p:k[j].h,i:j,r:R[j]});const a2=swH[swH.length-2];if(a2&&k[j].h>a2.p&&R[j]<a2.r-2)div.bear=i}
    if(Lw){sl_={p:k[j].l,i:j,done:false};swL.push({p:k[j].l,i:j,r:R[j]});const a2=swL[swL.length-2];if(a2&&k[j].l<a2.p&&R[j]>a2.r+2)div.bull=i}
    if(sh&&!sh.done&&k[i].c>sh.p){const t=trend===-1?'CHoCH':'BOS';smc.push({type:t,dir:1,p:sh.p,from:sh.i,to:i,ft:k[sh.i].t,tt:k[i].t});trend=1;sh.done=true;lastStruct={dir:1,i,type:t}}
    if(sl_&&!sl_.done&&k[i].c<sl_.p){const t=trend===1?'CHoCH':'BOS';smc.push({type:t,dir:-1,p:sl_.p,from:sl_.i,to:i,ft:k[sl_.i].t,tt:k[i].t});trend=-1;sl_.done=true;lastStruct={dir:-1,i,type:t}}
    if(i<WARM||i-ls<6)continue;
    const b=k[i],ax=AD.A[i]??0,upT=b.c>e200[i]&&e50[i]>e200[i]&&slope(e50,i,10)>0,dnT=b.c<e200[i]&&e50[i]<e200[i]&&slope(e50,i,10)<0;
    const pt=patAt[i],recent=(x)=>i-x<=6;let s=null,type='';
    // A) ย่อตัวในเทรนด์ (pullback) แล้วยืนยันกลับตัว
    const tchUp=[0,1,2].some(d=>k[i-d].l<=e20[i-d]+.2*A[i-d]),tchDn=[0,1,2].some(d=>k[i-d].h>=e20[i-d]-.2*A[i-d]);
    if(upT&&ax>18&&tchUp&&b.c>e20[i]&&b.c>b.o&&R[i]>R[i-1]&&Math.min(R[i-1],R[i-2])<55&&hist[i]>hist[i-1]){s='buy';type='Pullback'}
    else if(dnT&&ax>18&&tchDn&&b.c<e20[i]&&b.c<b.o&&R[i]<R[i-1]&&Math.max(R[i-1],R[i-2])>45&&hist[i]<hist[i-1]){s='sell';type='Pullback'}
    // B) BOS ต่อเนื่องเทรนด์ พร้อมโมเมนตัม
    else if(lastStruct.i===i&&lastStruct.type==='BOS'&&lastStruct.dir>0&&upT&&hist[i]>0&&R[i]<72){s='buy';type='BOS'}
    else if(lastStruct.i===i&&lastStruct.type==='BOS'&&lastStruct.dir<0&&dnT&&hist[i]<0&&R[i]>28){s='sell';type='BOS'}
    // C) กลับตัว: CHoCH + divergence หรือแท่งเทียนกลับตัว
    else if(lastStruct.dir>0&&recent(lastStruct.i)&&lastStruct.type==='CHoCH'&&(recent(div.bull)||(pt&&pt.d>0))&&b.c>e20[i]){s='buy';type='Reversal'}
    else if(lastStruct.dir<0&&recent(lastStruct.i)&&lastStruct.type==='CHoCH'&&(recent(div.bear)||(pt&&pt.d<0))&&b.c<e20[i]){s='sell';type='Reversal'}
    if(!s)continue;
    // จุดตัดขาดทุนตามโครงสร้าง (สวิงล่าสุด) จำกัด 0.8–3 ATR
    const sw=s==='buy'?swL.filter(x=>x.i<i).slice(-1)[0]:swH.filter(x=>x.i<i).slice(-1)[0];
    let stop=s==='buy'?Math.min(b.l,sw?.p??b.l)-.4*A[i]:Math.max(b.h,sw?.p??b.h)+.4*A[i];
    const dist=Math.abs(b.c-stop),lim=Math.max(1.2*A[i],Math.min(4.5*A[i],dist));stop=s==='buy'?b.c-lim:b.c+lim;
    sigs.push({i,s,type,stop,strong:type!=='Reversal'});ls=i;
  }
  // ── ทดสอบย้อนหลัง: เข้าที่ราคาเปิดแท่งถัดไป ถือสูงสุด 40 แท่ง ──
  const simulate=(rr,list)=>list.filter(x=>x.i+1<n).map(x=>{const en=k[x.i+1].o,risk=Math.abs(en-x.stop)||A[x.i],dir=x.s==='buy'?1:-1,tp=en+dir*rr*risk;
    for(let q=x.i+1;q<Math.min(n,x.i+41);q++){const bq=k[q],hitSL=dir>0?bq.l<=x.stop:bq.h>=x.stop,hitTP=dir>0?bq.h>=tp:bq.l<=tp;
      if(hitSL)return{...x,r:-1,done:true};if(hitTP)return{...x,r:rr,done:true}}
    const lastQ=Math.min(n-1,x.i+40),r=dir*(k[lastQ].c-en)/risk;return{...x,r,done:lastQ===x.i+40}});
  const stat=t=>{const d=t.filter(x=>x.done);const w=d.filter(x=>x.r>0),gw=w.reduce((a,x)=>a+x.r,0),gl=-d.filter(x=>x.r<=0).reduce((a,x)=>a+x.r,0);
    return{n:d.length,win:d.length?w.length/d.length:0,avg:d.length?d.reduce((a,x)=>a+x.r,0)/d.length:0,pf:gl?gw/gl:(gw?Infinity:0)}};
  const cut=Math.floor(n*.7),ins=sigs.filter(x=>x.i<cut),oos=sigs.filter(x=>x.i>=cut);
  let bestRR=2,bestE=-Infinity;[1.5,2,2.5].forEach(rr=>{const st=stat(simulate(rr,ins));if(st.n>=4&&st.avg>bestE){bestE=st.avg;bestRR=rr}});
  const allT=simulate(bestRR,sigs);sigs.forEach((x,q)=>{const t=allT.find(y=>y.i===x.i);if(t)x.r=t.done?t.r:null});
  const bt={rr:bestRR,all:stat(allT),ins:stat(simulate(bestRR,ins)),oos:stat(simulate(bestRR,oos)),
    byType:['Pullback','BOS','Reversal'].map(t=>({t,...stat(allT.filter(x=>x.type===t))})),bars:n-WARM};
  // Fibonacci จากสวิงล่าสุด 120 แท่ง
  const w=k.slice(-120),off=n-w.length;let hi=-Infinity,lo=Infinity,hiI=0,loI=0;
  w.forEach((b,j)=>{if(b.h>hi){hi=b.h;hiI=j+off}if(b.l<lo){lo=b.l;loI=j+off}});
  const upSwing=hiI>loI,fib=[0,.236,.382,.5,.618,.786,1].map(r=>({r,p:upSwing?hi-(hi-lo)*r:lo+(hi-lo)*r}));
  // ── คะแนนถ่วงน้ำหนัก (−10 ถึง +10) ──
  const near=z=>last>=z.bot-.5*atrL&&last<=z.top+.5*atrL,nearD=dem.find(near),nearS=spl.find(near);
  const nearSup=sup[0]&&last-sup[0].p<.6*atrL,nearRes=res[0]&&res[0].p-last<.6*atrL;
  const rp=pats.filter(p=>p.i>=n-2&&p.d!==0).pop(),ax=AD.A[n-1]??0,N1=n-1;
  const tUp=last>e200[N1]&&e50[N1]>e200[N1],tDn=last<e200[N1]&&e50[N1]<e200[N1];
  const atLoc=v=>v>0?(nearD||nearSup):(nearS||nearRes);
  const lastSig=sigs.filter(x=>x.i>=n-3).pop();
  const checks=[
    {w:2,v:tUp?1:tDn?-1:0,t:'เทรนด์หลักขาขึ้น (ราคาและ EMA50 อยู่เหนือ EMA200)',f:'เทรนด์หลักขาลง (ราคาและ EMA50 อยู่ใต้ EMA200)',z:'เทรนด์หลักยังไม่ชัด'},
    {w:1.5,v:htf||0,t:'กรอบเวลาใหญ่ (รายวัน) เป็นขาขึ้น',f:'กรอบเวลาใหญ่ (รายวัน) เป็นขาลง',z:htf==null?'ไม่มีข้อมูลกรอบรายวัน':'กรอบรายวันยังไม่ชัด'},
    {w:1.5,v:lastStruct.dir,t:`โครงสร้างล่าสุด ${lastStruct.type} ขาขึ้น`,f:`โครงสร้างล่าสุด ${lastStruct.type} ขาลง`,z:'ยังไม่มีโครงสร้างชัด'},
    {w:1,v:hist[N1]>0&&hist[N1]>=hist[N1-1]?1:hist[N1]<0&&hist[N1]<=hist[N1-1]?-1:0,t:'MACD โมเมนตัมขาขึ้นกำลังเพิ่ม',f:'MACD โมเมนตัมขาลงกำลังเพิ่ม',z:'MACD โมเมนตัมแผ่ว'},
    {w:1,v:R[N1]>55&&R[N1]<75?1:R[N1]<45&&R[N1]>25?-1:0,t:`RSI ${R[N1].toFixed(0)} แรงซื้อนำ`,f:`RSI ${R[N1].toFixed(0)} แรงขายนำ`,z:`RSI ${R[N1].toFixed(0)} ${R[N1]>=75?'ซื้อมากเกินไป ระวังย่อ':R[N1]<=25?'ขายมากเกินไป ระวังเด้ง':'เป็นกลาง'}`},
    {w:1,v:ax>20?(AD.P[N1]>AD.M[N1]?1:-1):0,t:`ADX ${ax.toFixed(0)} เทรนด์ขึ้นมีกำลัง`,f:`ADX ${ax.toFixed(0)} เทรนด์ลงมีกำลัง`,z:`ADX ${ax.toFixed(0)} ตลาดไม่มีเทรนด์ (ระวังสัญญาณหลอก)`},
    {w:1,v:nearD||nearSup?1:nearS||nearRes?-1:0,t:'ราคาอยู่ที่แนวรับ/Demand zone',f:'ราคาอยู่ที่แนวต้าน/Supply zone',z:'ราคาไม่ได้อยู่ที่ระดับสำคัญ'},
    {w:1,v:n-1-div.bull<=6?1:n-1-div.bear<=6?-1:0,t:'RSI Bullish divergence',f:'RSI Bearish divergence',z:'ไม่มี RSI divergence'},
    {w:.5,v:rp&&atLoc(rp.d)?rp.d:0,t:`${rp?.en||''} ที่ระดับสำคัญ`,f:`${rp?.en||''} ที่ระดับสำคัญ`,z:'ไม่มีแท่งเทียนกลับตัวที่ระดับสำคัญ'},
  ].map(x=>({text:x.v>0?x.t:x.v<0?x.f:x.z,v:x.v,w:x.w}));
  const raw=checks.reduce((a,x)=>a+x.v*x.w,0),score=Math.round(raw*10)/10;
  const conflict=(htf===1&&raw<0)||(htf===-1&&raw>0);
  let bias=score>=4&&!conflict?'BUY':score<=-4&&!conflict?'SELL':'WAIT';
  if(lastSig&&bias==='WAIT'&&Math.abs(score)>=2.5&&Math.sign(score)===(lastSig.s==='buy'?1:-1))bias=lastSig.s==='buy'?'BUY':'SELL';
  // แผนการเทรด
  let plan;const within=(v,lim)=>v!=null&&isFinite(v)&&Math.abs(v-last)<lim*atrL;
  // ── คำนวณ SL / TP จากโซนจริง ──
  // SL: วางหลังโซนป้องกันที่ใกล้ที่สุด (Demand/แนวรับ/สวิง สำหรับ Buy · Supply/แนวต้าน/สวิง สำหรับ Sell) ที่ห่างอย่างน้อย 1 ATR + เผื่อ 0.4 ATR
  // TP: ใช้โซนฝั่งตรงข้ามที่ได้อย่างน้อย 1R เรียงจากใกล้ไปไกล (Supply/แนวต้าน/Fibo สำหรับ Buy) ถ้าไม่พอใช้ 1.5R / 2.5R / 3.5R
  const lastSwL=swL.length?swL[swL.length-1]:null,lastSwH=swH.length?swH[swH.length-1]:null;
  function levels(dir,entry){
    const prot=dir>0
      ?[...dem.filter(z=>z.top<=entry+.2*atrL).map(z=>({v:z.bot,f:`ใต้ Demand ${fmt2(z.bot)}–${fmt2(z.top)}`})),...sup.map((l,ix)=>({v:l.p,f:`ใต้แนวรับ S${ix+1}`})),...(lastSwL?[{v:lastSwL.p,f:'ใต้จุดต่ำสุดของสวิงล่าสุด'}]:[])].filter(c=>c.v<entry)
      :[...spl.filter(z=>z.bot>=entry-.2*atrL).map(z=>({v:z.top,f:`เหนือ Supply ${fmt2(z.bot)}–${fmt2(z.top)}`})),...res.map((l,ix)=>({v:l.p,f:`เหนือแนวต้าน R${ix+1}`})),...(lastSwH?[{v:lastSwH.p,f:'เหนือจุดสูงสุดของสวิงล่าสุด'}]:[])].filter(c=>c.v>entry);
    prot.sort((a,b)=>Math.abs(entry-a.v)-Math.abs(entry-b.v));
    const pick=prot.find(c=>Math.abs(entry-c.v)>=1*atrL&&Math.abs(entry-c.v)<=4*atrL);
    let risk,slFrom;
    if(pick){risk=Math.abs(entry-pick.v)+.4*atrL;slFrom=pick.f}else{risk=1.8*atrL;slFrom='ไม่มีโซนในระยะ 1–4 ATR ใช้ 1.8 ATR'}
    risk=Math.max(1.2*atrL,Math.min(4.5*atrL,risk));const sl=entry-dir*risk;
    const tgt=(dir>0
      ?[...spl.map(z=>({v:z.bot,f:`ขอบล่าง Supply ${fmt2(z.bot)}`})),...res.map((l,ix)=>({v:l.p,f:`แนวต้าน R${ix+1}`})),...fib.map(f=>({v:f.p,f:`Fibo ${(f.r*100).toFixed(1)}%`}))]
      :[...dem.map(z=>({v:z.top,f:`ขอบบน Demand ${fmt2(z.top)}`})),...sup.map((l,ix)=>({v:l.p,f:`แนวรับ S${ix+1}`})),...fib.map(f=>({v:f.p,f:`Fibo ${(f.r*100).toFixed(1)}%`}))])
      .filter(c=>(c.v-entry)*dir>=1*risk&&(c.v-entry)*dir<=5*risk).sort((a,b)=>(a.v-b.v)*dir);
    const tps=[];for(const c of tgt){if(tps.length>=3)break;if(!tps.length||Math.abs(c.v-tps[tps.length-1].v)>=.6*risk)tps.push(c)}
    for(const m of [1.5,2.5,3.5]){if(tps.length>=3)break;const v=entry+dir*m*risk;if(!tps.length||(v-tps[tps.length-1].v)*dir>=.6*risk)tps.push({v,f:`${m}R (ไม่มีโซนในระยะ)`})}
    tps.sort((a,b)=>(a.v-b.v)*dir);
    return{sl,risk,slFrom,t1:tps[0].v,t2:tps[1].v,t3:tps[2].v,tpFrom:tps.map(t=>t.f),rr:tps.map(t=>Math.abs(t.v-entry)/risk)};
  }
  const fmt2=v=>Number(v).toLocaleString('en-US',{maximumFractionDigits:v>100?2:4});
  if(bias==='BUY'||bias==='SELL'){
    const dir=bias==='BUY'?1:-1,lv=levels(dir,last);
    let alt=null;
    if(!(lastSig&&lastSig.s===(dir>0?'buy':'sell'))){const zL=dir>0?dem.map(z=>z.top).filter(v=>v<last&&within(v,2)).pop():spl.map(z=>z.bot).filter(v=>v>last&&within(v,2)).pop();
      alt=zL??((dir>0?e20[n-1]<last:e20[n-1]>last)&&within(e20[n-1],2)?e20[n-1]:null)}
    plan={side:dir>0?'buy':'sell',dir:dir>0?'ซื้อ (Buy)':'ขาย (Sell)',entry:last,alt,sl:lv.sl,t1:lv.t1,t2:lv.t2,t3:lv.t3,slFrom:lv.slFrom,tpFrom:lv.tpFrom,rrs:lv.rr,setup:lastSig&&lastSig.s===(dir>0?'buy':'sell')?lastSig.type:null};
  }else{
    const d=dem[dem.length-1],s=spl[spl.length-1];
    plan={wait:true,dir:'รอจังหวะ',buyAt:d&&d.top<last&&within(d.top,4)?d.top:sup[0]?.p,sellAt:s&&s.bot>last&&within(s.bot,4)?s.bot:res[0]?.p};
  }
  // โอกาสที่ราคาจะไปถึงระดับต่างๆ (แบบจำลองความผันผวน)
  const lr=[];for(let i=Math.max(1,n-150);i<n;i++)lr.push(Math.log(k[i].c/k[i-1].c));
  const mean=lr.reduce((a,b)=>a+b,0)/lr.length,sd=Math.sqrt(lr.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,lr.length-1))||1e-9;
  const lr50=lr.slice(-50),mu=.5*lr50.reduce((a,b)=>a+b,0)/Math.max(1,lr50.length),HZ=20;
  const Phi=x=>{const t=1/(1+.2316419*Math.abs(x)),d=.3989423*Math.exp(-x*x/2),p=d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return x>0?1-p:p};
  const hitProb=(level,h=HZ)=>{let d=Math.log(level/last),m=mu;if(d<0){d=-d;m=-m}if(d===0)return 1;const s=sd*Math.sqrt(h);
    const ex=Math.min(50,2*m*d/(sd*sd));return Math.max(0,Math.min(1,Phi((-d+m*h)/s)+Math.exp(ex)*Phi((-d-m*h)/s)))};
  const firstHit=(up,dn)=>{const a=Math.log(up/last),b=Math.log(last/dn),L=a+b;if(a<=0)return 1;if(b<=0)return 0;const th=2*mu/(sd*sd);
    if(Math.abs(th*L)<1e-6)return b/L;const v=(1-Math.exp(-th*b))/(1-Math.exp(-th*L));return isFinite(v)?Math.max(0,Math.min(1,v)):b/L};
  res.forEach(l=>l.prob=hitProb(l.p));sup.forEach(l=>l.prob=hitProb(l.p));
  if(!plan.wait){const dr=plan.side==='buy'?1:-1,rk=Math.abs(plan.entry-plan.sl);if(plan.t3==null)plan.t3=plan.entry+dr*Math.max(3*rk,Math.abs(plan.t2-plan.entry)+rk);
    plan.startI=lastSig&&lastSig.s===plan.side&&n-1-lastSig.i<60?lastSig.i:Math.max(0,n-25);plan.pT3=plan.side==='buy'?firstHit(plan.t3,plan.sl):1-firstHit(plan.sl,plan.t3)}
  if(!plan.wait){plan.pT1=plan.side==='buy'?firstHit(plan.t1,plan.sl):1-firstHit(plan.sl,plan.t1);plan.pT2=plan.side==='buy'?firstHit(plan.t2,plan.sl):1-firstHit(plan.sl,plan.t2);
    plan.hT1=hitProb(plan.t1);plan.hSL=hitProb(plan.sl)}
  return{k,e20,e50,e200,R,A,BB,AD,ST,hist,res,sup,dem,spl,pats,sigs,fib,upSwing,checks,score,bias,plan,last,atrL,bt,lastSig,smc:smc.slice(-14),trend,HZ,sd,mu};
}




function drawScenCanvas(S,cv,W,H,dpr,C,top=0){
  cv.width=W*dpr;cv.height=(H+top)*dpr;const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);if(top){x.fillStyle=C.bg||'#fff';x.fillRect(0,0,W,H+top)}else x.clearRect(0,0,W,H);x.translate(0,top);const an=S.an,k=an.k.slice(-72),a=S.a;
  const padR=W>=1000?230:150,cw=W-padR,cEnd=cw*.72,N=k.length,bw=cEnd/N;let hi=Math.max(...k.map(b=>b.h)),lo=Math.min(...k.map(b=>b.l));
  S.zones.forEach(z=>{hi=Math.max(hi,z.top);lo=Math.min(lo,z.bot)});const pd=(hi-lo)*.08;hi+=pd;lo-=pd;const Y=p=>12+(hi-p)/(hi-lo)*(H-36);
  x.font='11px "IBM Plex Sans Thai",system-ui';x.textBaseline='middle';
  for(let g=0;g<=5;g++){const p=lo+(hi-lo)*g/5;x.strokeStyle=C.grid;x.beginPath();x.moveTo(0,Y(p));x.lineTo(cw,Y(p));x.stroke();x.fillStyle=C.muted;x.fillText(fmt(p,a.dp),cw+6,Y(p))}
  x.fillStyle=C.muted;x.globalAlpha=.07;x.fillRect(cEnd,0,cw-cEnd,H);x.globalAlpha=1;x.fillText('อนาคต (คาดการณ์)',cEnd+8,H-12);
  S.zones.forEach(z=>{const col=z.kind==='d'?C.buy:C.sell,y0=Y(z.top),h=Math.max(3,Y(z.bot)-y0);x.globalAlpha=.16;x.fillStyle=col;x.fillRect(0,y0,cw,h);x.globalAlpha=.75;x.strokeStyle=col;x.strokeRect(0,y0,cw,h);x.globalAlpha=1;
    x.fillStyle=col;x.font='600 12px "IBM Plex Sans Thai",system-ui';x.fillText(`${z.name} ${fmt(z.bot,a.dp)}–${fmt(z.top,a.dp)}`,8,y0+h/2);x.font='11px "IBM Plex Sans Thai",system-ui'});
  k.forEach((b,i)=>{const cx=i*bw+bw/2,up=b.c>=b.o;x.strokeStyle=x.fillStyle=up?C.up:C.dn;x.beginPath();x.moveTo(cx,Y(b.h));x.lineTo(cx,Y(b.l));x.stroke();const y0=Y(Math.max(b.o,b.c));x.fillRect(cx-bw*.33,y0,Math.max(1,bw*.66),Math.max(1,Y(Math.min(b.o,b.c))-y0))});
  const last=an.last,x0=cEnd,y0=Y(last),D=S.zones.filter(z=>z.kind==='d'),Su=S.zones.filter(z=>z.kind==='s');
  const arrow=(pts,col,dash)=>{x.strokeStyle=col;x.fillStyle=col;x.lineWidth=2.5;x.setLineDash(dash?[7,5]:[]);x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke();x.setLineDash([]);
    const [ax,ay]=pts[pts.length-1],[bx,by]=pts[pts.length-2],ang=Math.atan2(ay-by,ax-bx);x.beginPath();x.moveTo(ax,ay);x.lineTo(ax-12*Math.cos(ang-.45),ay-12*Math.sin(ang-.45));x.lineTo(ax-12*Math.cos(ang+.45),ay-12*Math.sin(ang+.45));x.closePath();x.fill();x.lineWidth=1};
  const fw=cw-cEnd,d1=D[0],s1=Su[0];
  if(S.bias!=='SELL'&&d1){const yd=Y((d1.top+d1.bot)/2),yt=s1?Y(s1.bot):Y(last+2*an.atrL);arrow([[x0,y0],[x0+fw*.35,yd],[x0+fw*.92,yt]],C.buy,S.bias!=='BUY');if(D[1])arrow([[x0+fw*.35,yd],[x0+fw*.7,Y(D[1].top)]],C.sell,true)}
  if(S.bias!=='BUY'&&s1){const ys=Y((s1.top+s1.bot)/2),yt=d1?Y(d1.top):Y(last-2*an.atrL);arrow([[x0,y0],[x0+fw*.35,ys],[x0+fw*.92,yt]],C.sell,S.bias!=='SELL');if(Su[1])arrow([[x0+fw*.35,ys],[x0+fw*.7,Y(Su[1].bot)]],C.buy,true)}
  x.fillStyle=C.gold;x.beginPath();x.arc(x0,y0,4,0,7);x.fill();x.fillText(fmt(last,a.dp),x0+8,y0-10);
  // ── เส้นราคาเต็มความกว้าง + ป้ายราคาบนแกนขวา (อ่านง่ายบนมือถือ) ──
  const p=an.plan,lv=[];
  S.zones.forEach(z=>{const c=z.kind==='d'?C.buy:C.sell;lv.push([z.top,c,`${z.name} บน`,[2,3]],[z.bot,c,`${z.name} ล่าง`,[2,3]])});
  if(p&&!p.wait)lv.push([p.entry,C.gold,'Entry',[]],[p.sl,C.sell,'SL',[]],[p.t1,C.buy,'TP1',[6,4]],[p.t2,C.buy,'TP2',[6,4]],[p.t3,C.buy,'TP3',[6,4]]);
  lv.push([last,'#1f2a44','ราคาตอนนี้',[1,0]]);
  const big=W>=1000,fs=big?15:11,tagH=big?24:17,used=[];
  lv.filter(([v])=>isFinite(v)&&Y(v)>=0&&Y(v)<=H).sort((a2,b2)=>Y(a2[0])-Y(b2[0])).forEach(([v,c,l,dash])=>{const y=Y(v);
    x.setLineDash(dash);x.strokeStyle=c;x.lineWidth=l==='Entry'||l==='SL'||l==='ราคาตอนนี้'?2:1.3;x.globalAlpha=.9;x.beginPath();x.moveTo(0,y);x.lineTo(cw,y);x.stroke();x.setLineDash([]);x.lineWidth=1;x.globalAlpha=1;
    let ty=y;for(const u of used){if(Math.abs(ty-u)<tagH)ty=u+tagH}used.push(ty);
    x.font=`600 ${fs}px "IBM Plex Sans Thai",system-ui`;const txt=`${l} ${fmt(v,a.dp)}`,tw=x.measureText(txt).width+14,tx=W-tw-2;
    x.fillStyle=c;x.beginPath();x.roundRect?x.roundRect(tx,ty-tagH/2,tw,tagH,5):x.rect(tx,ty-tagH/2,tw,tagH);x.fill();
    if(Math.abs(ty-y)>2){x.strokeStyle=c;x.beginPath();x.moveTo(cw,y);x.lineTo(tx,ty);x.stroke()}
    x.fillStyle='#fff';x.textBaseline='middle';x.fillText(txt,tx+7,ty+1)});
  x.font='11px "IBM Plex Sans Thai",system-ui'}

function scenarioText(S,plain){const an=S.an,a=S.a,dp=a.dp,f=v=>fmt(v,dp),last=an.last,D=S.zones.filter(z=>z.kind==='d'),Su=S.zones.filter(z=>z.kind==='s');
  const trend=an.checks[0].v>0?'ขาขึ้น (ราคาและ EMA50 อยู่เหนือ EMA200)':an.checks[0].v<0?'ขาลง (ราคาและ EMA50 อยู่ใต้ EMA200)':'ไซด์เวย์ ยังไม่มีเทรนด์ชัด';
  const L=[];L.push(`${a.name} H1 · ราคา ${f(last)} · มุมมอง ${S.bias==='BUY'?'ซื้อ':S.bias==='SELL'?'ขาย':'รอจังหวะ'} (คะแนน ${an.score}/10)`);
  L.push(`เทรนด์ H1: ${trend}`);
  S.zones.forEach(z=>L.push(`${z.name}: ${f(z.bot)} – ${f(z.top)}${z.lvl?' (จากแนวรับ/แนวต้าน)':''}`));
  const d1=D[0],s1=Su[0];
  if(S.bias!=='SELL'&&d1)L.push(`แผนหลัก${S.bias==='BUY'?'':' (ถ้าย่อ)'}: รอราคาย่อลงมาที่ ${d1.name} (${f(d1.bot)}–${f(d1.top)}) แล้วมีแท่ง H1 กลับตัวขึ้น เช่น Engulfing/Hammer → Buy · SL ใต้ ${f(d1.bot-.4*an.atrL)} · เป้า ${s1?`${s1.name} ${f(s1.bot)}`:f(last+2*an.atrL)}`);
  if(S.bias!=='BUY'&&s1)L.push(`แผน${S.bias==='SELL'?'หลัก':'สำรอง'}: ถ้าราคาเด้งขึ้นไปที่ ${s1.name} (${f(s1.bot)}–${f(s1.top)}) แล้วมีแท่ง H1 กลับตัวลง → Sell · SL เหนือ ${f(s1.top+.4*an.atrL)} · เป้า ${d1?`${d1.name} ${f(d1.top)}`:f(last-2*an.atrL)}`);
  if(d1)L.push(`ถ้าแท่ง H1 ปิดต่ำกว่า ${f(d1.bot)}: แผนซื้อยกเลิก โซนนี้ถูกทะลุ มีโอกาสลงต่อ${D[1]?` ไปหา ${D[1].name} ${f(D[1].top)}`:''}`);
  if(s1)L.push(`ถ้าแท่ง H1 ปิดเหนือ ${f(s1.top)}: แผนขายยกเลิก มีโอกาสขึ้นต่อ${Su[1]?` ไปหา ${Su[1].name} ${f(Su[1].bot)}`:''}`);
  const p=an.plan;if(p&&!p.wait)L.push(`แผนตัวเลข H1: ${p.dir} @ ${f(p.entry)} · SL ${f(p.sl)} · TP1 ${f(p.t1)} · TP2 ${f(p.t2)} · TP3 ${f(p.t3)}`);
  return plain?'🗺️ แผน H1 · '+L.join('\n'):L.map((t,i)=>i===0?`<p><b>${esc(t)}</b></p>`:`<p>• ${esc(t)}</p>`).join('')+'<p class="note">แผนจำลองนี้สร้างจากกฎของระบบ ไม่ใช่การรับประกันทิศทางราคา ใช้เป็นแนวทางประกอบการตัดสินใจ</p>'}
let scLW=null;
function pickZones(an){
  const last=an.last,atr=an.atrL;let zs=[...an.dem.map(z=>({...z,kind:'d'})),...an.spl.map(z=>({...z,kind:'s'}))];
  an.sup.forEach(l=>zs.push({kind:'d',top:l.p+.25*atr,bot:l.p-.25*atr,lvl:true}));an.res.forEach(l=>zs.push({kind:'s',top:l.p+.25*atr,bot:l.p-.25*atr,lvl:true}));
  const below=zs.filter(z=>z.kind==='d'&&z.top<=last+.2*atr).sort((x,y)=>y.top-x.top),above=zs.filter(z=>z.kind==='s'&&z.bot>=last-.2*atr).sort((x,y)=>x.bot-y.bot);
  const pickD=[],pickS=[];for(const z of below){if(pickD.length<2&&!pickD.some(q=>Math.abs(q.top-z.top)<.8*atr))pickD.push(z)}for(const z of above){if(pickS.length<2&&!pickS.some(q=>Math.abs(q.bot-z.bot)<.8*atr))pickS.push(z)}
  let chosen=[];const bias=an.bias;
  if(bias==='SELL')chosen=[pickS[0],pickD[0],pickD[1]||pickS[1]];else if(bias==='BUY')chosen=[pickD[0],pickS[0],pickS[1]||pickD[1]];else chosen=[pickD[0],pickS[0],pickD[1]||pickS[1]];
  chosen=chosen.filter(Boolean).slice(0,3);let nd=0,ns=0;chosen.forEach(z=>z.name=z.kind==='d'?`Demand ${++nd}`:`Supply ${++ns}`);
  
  return chosen;
}
module.exports={analyze,drawScenCanvas,scenarioText,pickZones,fmt};
