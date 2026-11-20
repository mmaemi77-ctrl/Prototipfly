// Картинки наброска одним запуском: слайды структуры 4:5 и превью ссылок.
// Запуск из корня репозитория: node _instrumenty/kartinki.js <папка клиента>
// Слайды: каждый элемент .slide в <папка>/struktura.html → struktura-1.png, struktura-2.png… (540×675 CSS, снимок 2x = 1080×1350).
//   Класс слайда именно .slide: короткий класс вроде .s совпадает с классами внутри макетов и ломает вёрстку.
// Превью: og-analiz.jpg из analiz.html и og-glavnyi.jpg из index.html, 1200×630.
// В конце проверка: нет ли ошибок на страницах и горизонтальной прокрутки на ширине телефона.
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const dir=path.resolve(process.argv[2]||'.');
const url=f=>'file://'+path.join(dir,f);

(async()=>{
  const b=await chromium.launch();
  const errs=[];
  const open=async(f,vp,o={})=>{
    const p=await b.newPage({viewport:vp,deviceScaleFactor:o.dsf||1,isMobile:!!o.m,hasTouch:!!o.m});
    p.on('pageerror',e=>errs.push(f+': '+e.message));
    p.on('console',m=>{if(m.type()==='error')errs.push(f+': '+m.text())});
    await p.goto(url(f));await p.waitForLoadState('networkidle');await p.evaluate(()=>document.fonts.ready);
    return p;
  };

  if(fs.existsSync(path.join(dir,'struktura.html'))){
    const p=await open('struktura.html',{width:600,height:800},{dsf:2});
    const n=await p.locator('.slide').count();
    for(let i=0;i<n;i++)await p.locator('.slide').nth(i).screenshot({path:path.join(dir,`struktura-${i+1}.png`)});
    const over=await p.evaluate(()=>[...document.querySelectorAll('.slide')].map((s,i)=>{
      const r=s.getBoundingClientRect();
      const out=[...s.querySelectorAll('*')].some(e=>{const q=e.getBoundingClientRect();return q.width&&q.height&&(q.bottom>r.bottom+1||q.right>r.right+1)&&getComputedStyle(e).position!=='absolute'});
      return out?i+1:0}).filter(Boolean));
    if(over.length)errs.push('слайды с вылезающим содержимым: '+over.join(', '));
    console.log('слайдов: '+n);
    await p.close();
  }

  for(const [f,o] of [['analiz.html','og-analiz.jpg'],['index.html','og-glavnyi.jpg']]){
    if(!fs.existsSync(path.join(dir,f)))continue;
    const p=await open(f,{width:1200,height:630});
    if(f==='analiz.html')await p.addStyleTag({content:'.top{min-height:630px;display:grid;align-items:center}'});
    await p.screenshot({path:path.join(dir,o),type:'jpeg',quality:85});
    await p.close();
    const m=await open(f,{width:390,height:844},{m:true});
    const sw=await m.evaluate(()=>document.documentElement.scrollWidth);
    if(sw>390)errs.push(f+': на телефоне есть горизонтальная прокрутка ('+sw+'px)');
    await m.close();
  }

  await b.close();
  console.log(errs.length?'проблемы:\n'+errs.join('\n'):'готово, ошибок нет');
})();
