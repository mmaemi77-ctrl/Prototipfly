// Главный экран одной картинкой 4:5 (1080×1350): ноутбук и телефон вместе.
// Запуск из корня репозитория: node _instrumenty/maket.js <папка клиента>
// Настройки берутся из <папка клиента>/maket.json (пример: oknovprirody/maket.json).
// Второй вариант экрана: node _instrumenty/maket.js <папка> maket-v2.json, в нём page и out (имя картинки).
// Если телефон закрывает важное на ноутбуке справа, уменьшите lapWidth (например 352) и phoneWidth (150): тогда они не пересекаются.
// Результат: glavnyi-maket.png, а также glavnyi-noutbuk.png и glavnyi-telefon.png в папке клиента.
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),os=require('os');

const dir=path.resolve(process.argv[2]||'.');
const cfgPath=path.join(dir,process.argv[3]||'maket.json');
const cfg=Object.assign({
  page:'index.html',
  eyebrow:'Главный экран',
  title:'Так сайт встретит ваших клиентов',
  chips:[],
  bg:'#12241A',
  ink:'#F4EEE3',
  label:'#E9C9A8',
  accent:'#B8693A',
  accentText:'#F0B482',
  photo:'',
  logo:'',
  phoneWait:0,
  lapWidth:430,
  lapTop:150,
  phoneWidth:156,
  phoneTop:262,
  out:'glavnyi-maket.png'
},fs.existsSync(cfgPath)?JSON.parse(fs.readFileSync(cfgPath,'utf8')):{});

const url=f=>'file://'+path.join(dir,f);
const esc=s=>String(s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));

(async()=>{
  const b=await chromium.launch();
  const errs=[];
  const open=async(vp,o={})=>{
    const p=await b.newPage({viewport:vp,deviceScaleFactor:o.dsf||1,isMobile:!!o.m,hasTouch:!!o.m});
    p.on('pageerror',e=>errs.push(e.message));
    await p.goto(url(cfg.page));await p.waitForLoadState('networkidle');await p.evaluate(()=>document.fonts.ready);
    if(cfg.phoneWait)await p.waitForTimeout(cfg.phoneWait);
    return p;
  };
  // ноутбук 1440×900 и телефон 390×844, только первый экран
  let p=await open({width:1440,height:900},{dsf:2});
  await p.screenshot({path:path.join(dir,'glavnyi-noutbuk.png')});
  p=await open({width:390,height:844},{dsf:2,m:true});
  await p.screenshot({path:path.join(dir,'glavnyi-telefon.png')});

  const bgPhoto=cfg.photo?`background:url("${url(cfg.photo)}") center 40%/cover;`:'';
  const logo=cfg.logo?`<img src="${url(cfg.logo)}" alt="">`:'';
  const chips=cfg.chips.map((c,i)=>`<span class="${i===0?'c':''}">${esc(c)}</span>`).join('');
  const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,700&family=Onest:wght@600;700;800&display=swap">
<style>
*{box-sizing:border-box}body{margin:0}
.s{width:540px;height:675px;position:relative;overflow:hidden;background:${cfg.bg};font-family:Onest,sans-serif;color:${cfg.ink};isolation:isolate}
.s::before{content:"";position:absolute;inset:0;z-index:-2;${bgPhoto}opacity:.35}
.s::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,color-mix(in srgb,${cfg.bg} 96%,transparent) 0%,color-mix(in srgb,${cfg.bg} 70%,transparent) 40%,color-mix(in srgb,${cfg.bg} 92%,transparent) 100%)}
.top{padding:26px 26px 0;display:grid;gap:8px}
.br{display:flex;align-items:center;gap:9px;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${cfg.label}}
.br img{width:28px;height:28px;border-radius:50%;background:#fff;object-fit:cover}
h1{margin:0;font-family:Lora,serif;font-weight:700;font-size:25px;line-height:1.15}
h1 em{color:${cfg.accentText}}
.lap{position:absolute;left:22px;top:${cfg.lapTop}px;width:${cfg.lapWidth}px}
.scr{background:#0B0F0C;border-radius:14px 14px 0 0;padding:9px 9px 10px;box-shadow:0 30px 60px -20px rgb(0 0 0 / .8)}
.scr img{display:block;width:100%;border-radius:3px}
.base{height:12px;margin:0 -26px;background:linear-gradient(#C9CCC9,#8E928F);border-radius:0 0 14px 14px;position:relative}
.base::before{content:"";position:absolute;left:50%;top:0;width:70px;height:5px;transform:translateX(-50%);background:#7A7E7B;border-radius:0 0 6px 6px}
.ph{position:absolute;right:22px;top:${cfg.phoneTop}px;width:${cfg.phoneWidth}px;background:#0B0F0C;border-radius:26px;padding:6px;box-shadow:0 30px 60px -16px rgb(0 0 0 / .85),0 0 0 1.5px rgb(255 255 255 / .12)}
.ph img{display:block;width:100%;border-radius:20px}
.chips{position:absolute;left:26px;right:26px;bottom:24px;display:flex;flex-wrap:wrap;gap:6px}
.chips span{font-size:11.5px;font-weight:700;background:rgb(255 255 255 / .1);border:1px solid rgb(255 255 255 / .2);border-radius:999px;padding:5px 11px}
.chips span.c{background:${cfg.accent};border-color:${cfg.accent};color:#fff}
</style></head><body>
<div class="s" id="m">
  <div class="top"><div class="br">${logo}${esc(cfg.eyebrow)}</div><h1>${cfg.title}</h1></div>
  <div class="lap"><div class="scr"><img src="${url('glavnyi-noutbuk.png')}" alt=""></div><div class="base"></div></div>
  <div class="ph"><img src="${url('glavnyi-telefon.png')}" alt=""></div>
  <div class="chips">${chips}</div>
</div></body></html>`;
  const tmp=path.join(os.tmpdir(),'maket-'+process.pid+'.html');
  fs.writeFileSync(tmp,html);
  p=await b.newPage({viewport:{width:540,height:675},deviceScaleFactor:2});
  await p.goto('file://'+tmp);await p.waitForLoadState('networkidle');await p.evaluate(()=>document.fonts.ready);
  await p.locator('#m').screenshot({path:path.join(dir,cfg.out)});
  fs.unlinkSync(tmp);
  await b.close();
  console.log(errs.length?'ошибки на странице:\n'+errs.join('\n'):'готово: '+path.join(dir,cfg.out));
})();
