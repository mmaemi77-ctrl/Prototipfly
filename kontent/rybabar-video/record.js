// Видео 9:16 для Threads/Reels: живой сайт Рыба Бара на ноутбуке и трёх телефонах.
// Время в браузере идёт покадрово (виртуальные часы), поэтому анимация плавная, сколько бы ни длился снимок кадра.
// node record.js            — все кадры в kadry/
// node record.js test 0,4,9 — только кадры на этих секундах (проверка)
// Нужен клон сайта: git clone https://github.com/mmaemi77-ctrl/territoriya <папка>/territoriya, путь к <папка> в SITES.
// Видео: ffmpeg -framerate 30 -i kadry/f%04d.jpg -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart rybabar-video.mp4
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(process.env.SITES||path.join(__dirname,'../repos')),HERE=__dirname;
const FPS=30,DUR=+(process.env.DUR||14),DSF=+(process.env.DSF||1);
const test=process.argv[2]==='test'?process.argv[3].split(',').map(Number):null;
const OUT=path.join(HERE,process.env.OUT||(test?'frames':'kadry'));fs.mkdirSync(OUT,{recursive:true});

// ---------- виртуальное время в каждом окне ----------
const VT=`(()=>{if(window.__vt)return;
const T0=Date.parse('2026-11-28T09:40:00+03:00');let now=0;const RD=Date;
class FD extends RD{constructor(...a){a.length?super(...a):super(T0+now)}static now(){return T0+now}}
FD.parse=RD.parse;FD.UTC=RD.UTC;window.Date=FD;
performance.now=()=>now;
let rid=0;const rafs=new Map();
window.requestAnimationFrame=cb=>{rafs.set(++rid,cb);return rid};window.cancelAnimationFrame=id=>rafs.delete(id);
let tid=0;const tm=new Map();
window.setTimeout=(fn,ms,...a)=>{tm.set(++tid,{at:now+(+ms||0),fn,a});return tid};
window.setInterval=(fn,ms,...a)=>{tm.set(++tid,{at:now+(+ms||0),fn,a,ev:Math.max(1,+ms||0)});return tid};
window.clearTimeout=window.clearInterval=id=>tm.delete(id);
Element.prototype.scrollIntoView=function(){};
const am=new WeakMap();
window.__vt={now:()=>now,advance(ms){const end=now+ms;
 for(;;){let b=null,bi;for(const[i,t]of tm)if(t.at<=end&&(!b||t.at<b.at)){b=t;bi=i}
  if(!b)break;now=Math.max(now,b.at);if(b.ev)b.at+=b.ev;else tm.delete(bi);try{typeof b.fn==='function'?b.fn(...b.a):0}catch(e){console.error(e)}}
 now=end;const cbs=[...rafs.values()];rafs.clear();for(const cb of cbs){try{cb(now)}catch(e){console.error(e)}}
 for(const an of document.getAnimations()){let t0=am.get(an);
  if(t0===undefined){const c=an.currentTime||0;t0=c<400?now:now-c;am.set(an,t0);an.pause()}
  an.currentTime=now-t0}
}};})();`;

// ---------- помощники для сценария ----------
const ease=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
// ключевые кадры [[t,y],...] → значение с плавным разгоном и торможением
const keys=(ks,t)=>{if(t<=ks[0][0])return ks[0][1];for(let i=1;i<ks.length;i++)if(t<=ks[i][0]){const[a,va]=ks[i-1],[b,vb]=ks[i];return va+(vb-va)*ease((t-a)/(b-a))}return ks[ks.length-1][1]};
// путь курсора: сплайн Катмулла — Рома через точки [[t,x,y],...]
const spline=(ps,t)=>{if(t<=ps[0][0])return ps[0].slice(1);if(t>=ps[ps.length-1][0])return ps[ps.length-1].slice(1);
 let i=1;while(ps[i][0]<t)i++;const p0=ps[Math.max(0,i-2)],p1=ps[i-1],p2=ps[i],p3=ps[Math.min(ps.length-1,i+1)];
 const u=ease((t-p1[0])/(p2[0]-p1[0])),u2=u*u,u3=u2*u;
 return[1,2].map(j=>.5*(2*p1[j]+(-p0[j]+p2[j])*u+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*u2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*u3))};

// ноутбук: координаты в окне 1440×900
const LAP=[[0,1400,890],[.9,1180,640],[1.9,960,440],[2.9,1150,230],[3.7,1270,420],[4.3,1080,380],[4.7,1080,380],[5.3,1340,610],[6.6,1300,640],[7.3,860,730],[7.6,860,730],[8.3,560,820],[9.6,292,556],[11,286,550],[11.9,720,262],[12.3,720,262],[13,1000,120],[14.5,1120,170]];
const CLICKS=[4.5,7.45,12.1];

(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1080,height:1920},deviceScaleFactor:DSF,locale:'ru-RU',timezoneId:'Europe/Simferopol'});
  await ctx.route('**/*',r=>{const u=new URL(r.request().url());
    if(u.hostname==='site.local'){let p=decodeURIComponent(u.pathname);if(p.endsWith('/'))p+='index.html';
      const f=p.startsWith('/_video/')?path.join(HERE,p.slice(8)):path.join(ROOT,p);
      return fs.existsSync(f)?r.fulfill({path:f}):r.fulfill({status:404,body:''})}
    if(/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname))return r.continue();
    return r.abort()});
  await ctx.addInitScript(VT);
  const page=await ctx.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>m.type()==='error'&&!/Failed to load resource/.test(m.text())&&errs.push(m.text()));
  await page.goto('http://site.local/_video/compose.html',{waitUntil:'load'});
  await page.evaluate(()=>document.fonts.ready);
  const fr=[];for(let i=0;i<4;i++)fr[i]=await (await page.$('#f'+i)).contentFrame();
  for(const f of fr)await f.evaluate(()=>document.fonts.ready);
  const box={};for(let i=0;i<4;i++)box[i]=await page.$eval('#v'+i,e=>{const r=e.getBoundingClientRect();return{x:r.left,y:r.top}});
  const SC=[2/3,.717949,.717949,.717949];
  const toPage=(i,x,y)=>[box[i].x+x*SC[i],box[i].y+y*SC[i]];
  const all=[page,...fr];
  const advance=async ms=>{for(const f of all)await f.evaluate(ms=>window.__vt.advance(ms),ms)};
  const scroll=(i,y)=>fr[i].evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),y);
  const pos=(i,sel,dy=0)=>fr[i].evaluate(([s,dy])=>{const e=document.querySelector(s);return Math.round(e.getBoundingClientRect().top+scrollY+dy)},[sel,dy]);
  // касание пальцем: точка на экране + событие на странице
  const tap=async(i,x,y,act='point')=>{
    const [px,py]=toPage(i,x,y);const now=await page.evaluate(()=>__vt.now());await page.evaluate(([x,y,t])=>__ui.mark('tap',x,y,t),[px,py,now]);
    await fr[i].evaluate(([x,y,act])=>{const el=document.elementFromPoint(x,y);
      el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,clientX:x,clientY:y,pointerType:'touch',isPrimary:true}));
      if(act==='click')(el.closest('button,input,label,a')||el).click();
      if(act==='focus')el.focus({preventScroll:true})},[x,y,act]);
  };
  const tapSel=async(i,sel,act='click')=>{const r=await fr[i].evaluate(s=>{const e=[...document.querySelectorAll(s)].find(e=>e.offsetParent);const b=e.getBoundingClientRect();return[b.left+b.width/2,b.top+b.height/2]},sel);await tap(i,r[0],r[1],act)};
  const type=(i,sel,v)=>fr[i].evaluate(([s,v])=>{const e=document.querySelector(s);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},[sel,v]);

  // стартовые позиции телефонов
  const menuY=await pos(2,'#menu',8);
  await scroll(2,menuY);
  const bookY=await pos(3,'#book',8);
  await scroll(3,bookY);
  for(let k=0;k<45;k++){await advance(1000/30);await page.waitForTimeout(15)}   // прогрев: рыбки расплылись, появились блоки
  const slotsY=await pos(3,'#slots',-250),nameY=await pos(3,'#name',-330),subY=await pos(3,'#form button[type=submit]',-480);

  // ---------- сценарий телефонов ----------
  let okY=null;
  const ACT=[
    // телефон 1: первый экран, касания кормят рыбок
    [2.2,()=>tap(1,300,470)],[6.0,()=>tap(1,90,725)],[10.2,()=>tap(1,320,190)],
    // телефон 2: поиск по меню
    [1.0,()=>tapSel(2,'#q','focus')],
    ...'мидии'.split('').map((c,k)=>[1.35+k*.28,()=>type(2,'#q','мидии'.slice(0,k+1))]),
    [8.2,()=>type(2,'#q','')],[8.25,()=>fr[2].evaluate(()=>document.activeElement.blur())],
    // телефон 3: бронь столика
    [3.3,()=>tapSel(3,'#slots .slot:nth-child(17)')],
    [5.0,()=>tapSel(3,'#name','focus')],
    ...'Анна'.split('').map((c,k)=>[5.25+k*.2,()=>type(3,'#name','Анна'.slice(0,k+1))]),
    [6.3,()=>tapSel(3,'#tel','focus')],
    ...'9781234567'.split('').map((c,k)=>[6.5+k*.13,()=>type(3,'#tel','9781234567'.slice(0,k+1))]),
    [7.9,()=>fr[3].evaluate(()=>document.activeElement.blur())],
    [8.9,()=>tapSel(3,'#agree')],
    [9.5,()=>tapSel(3,'#form button[type=submit]')],
    [9.55,async()=>{okY=await pos(3,'#ok',-170)}],
  ];
  const P2=()=>[[0,menuY],[3.4,menuY],[6.6,menuY+760],[8.0,menuY+760],[8.9,menuY],[9.3,menuY],[13.8,menuY+1500]];
  const P3=()=>[[0,bookY],[1.2,bookY],[2.7,slotsY],[4.1,slotsY],[4.8,nameY],[8.1,nameY],[8.7,subY],[9.6,subY],...(okY?[[10.9,okY]]:[])];

  let done=0;const t0=Date.now();
  const N=Math.round(DUR*FPS);
  for(let n=0;n<N;n++){
    const t=n/FPS,tn=(n+1)/FPS;
    for(const a of ACT)if(!a.done&&a[0]<tn){a.done=1;await a[1]()}
    // курсор ноутбука: настоящая мышь (наведение на кнопку работает) + нарисованная стрелка
    const [lx,ly]=spline(LAP,t),[cx,cy]=toPage(0,lx,ly);
    await page.mouse.move(cx,cy);
    for(const c of CLICKS)if(c>=t&&c<tn){await page.mouse.down();await page.mouse.up();const now=await page.evaluate(()=>__vt.now());await page.evaluate(([x,y,t])=>__ui.mark('click',x,y,t),[cx,cy,now])}
    const press=CLICKS.some(c=>t>=c&&t<c+.12);
    await page.evaluate(([x,y,p])=>__ui.cursor(x,y,p),[cx,cy,press]);
    await scroll(2,Math.round(keys(P2(),t)));
    await scroll(3,Math.round(keys(P3(),t)));
    await advance(Math.round(tn*1000)-Math.round(t*1000));
    await page.evaluate(()=>__ui.render(__vt.now()));
    if(!test||test.some(s=>Math.round(s*FPS)===n)){
      await page.waitForTimeout(test?60:8);
      await page.screenshot({path:path.join(OUT,test?`t${t.toFixed(1)}.png`:`f${String(n).padStart(4,'0')}.jpg`),type:test?'png':'jpeg',...(test?{}:{quality:94})});
      done++;
    }
  }
  console.log('кадров:',done,'за',((Date.now()-t0)/1000).toFixed(0),'с');
  if(errs.length)console.log('ошибки:\n'+[...new Set(errs)].join('\n'));
  await b.close();
})();
