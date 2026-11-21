// Картинки для объявлений на Авито, 4:3 (1200×900, сохраняются в 2400×1800).
// Запуск из корня репозитория: node _instrumenty/avito.js
// Берёт главные экраны из папок клиентов, размывает названия, телефоны и адреса
// (Авито не пропускает фото с контактами), собирает примеры работ, слайд «как работаю»
// и обложки. Фото Анастасии кладётся в avito/foto.jpg; пока его нет, на обложке заглушка.
// Результат: avito/oblozhki/*.jpg
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');

const root=path.resolve(__dirname,'..');
const out=path.join(root,'avito','oblozhki');
const tmp=path.join(root,'avito','.shots');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(tmp,{recursive:true});

const works=[
  {dir:'mikahome',  niche:'Мебель на заказ'},
  {dir:'sputnikpdr',niche:'Удаление вмятин без покраски'},
  {dir:'unity-elbrus',niche:'Гостевые дома'},
  {dir:'avtokids',  niche:'Магазин детских электромобилей'},
  {dir:'adaya',     niche:'Мастерская ручной работы'},
];

const fotoPath=path.join(root,'avito','foto.jpg');
const hasFoto=fs.existsSync(fotoPath);
const fileUrl=f=>'file://'+f;
const C={bg:'#F4F0E9',ink:'#1D1A17',muted:'#6B635A',accent:'#E0602A',card:'#FFFFFF',line:'#E4DDD2',dark:'#1D1A17'};

// размываем всё, что выдаёт бренд или контакты
async function hideBrand(p){
  await p.evaluate(()=>{
    const brand=/(adaya|адая|auto\s?kids|mika\s*home|\bmika\b|pdr|спутник|unity|vaycar)/i;
    const phone=/(\+7|\b8)\s*\(?\d{3}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/;
    const addr=/(ул\.|улица|шоссе|проспект|пр-т)/i;
    const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const blur=new Set(),hide=new Set();
    while(w.nextNode()){
      const t=w.currentNode.nodeValue,el=w.currentNode.parentElement;
      if(!el)continue;
      if(/наброс|вашего\s+instagram|ничего\s+не\s+отправля|уточняются|условн/i.test(t))hide.add(el);
      else if(brand.test(t)||phone.test(t)||addr.test(t))blur.add(el);
    }
    hide.forEach(el=>el.style.visibility='hidden');
    blur.forEach(el=>{el.style.filter='blur(11px)';});
    document.querySelectorAll('img').forEach(i=>{
      const s=(i.getAttribute('src')||'')+(i.getAttribute('alt')||'');
      if(/logo|лого/i.test(s))i.style.filter='blur(11px)';
    });
  });
}

async function shoot(b,w){
  const page=path.join(root,w.dir,'index.html');
  const mk=async(vp,o)=>{
    const p=await b.newPage({viewport:vp,deviceScaleFactor:2,isMobile:!!o.m,hasTouch:!!o.m});
    await p.goto(fileUrl(page));
    await p.waitForLoadState('networkidle').catch(()=>{});
    await p.evaluate(()=>document.fonts.ready);
    await p.waitForTimeout(600);
    await hideBrand(p);
    await p.waitForTimeout(100);
    const f=path.join(tmp,`${w.dir}-${o.name}.png`);
    await p.screenshot({path:f});
    await p.close();
    return f;
  };
  w.lap=await mk({width:1440,height:900},{name:'lap'});
  w.tel=await mk({width:390,height:844},{name:'tel',m:true});
}

const head=`<meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800&display=swap">
<style>
*{box-sizing:border-box}html,body{margin:0}
.c{width:1200px;height:900px;position:relative;overflow:hidden;background:${C.bg};font-family:Onest,sans-serif;color:${C.ink}}
.eb{font-size:20px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.accent}}
h1,h2{margin:0;font-weight:800;letter-spacing:-.02em}
.lap{position:absolute}
.lap .scr{background:#111;border-radius:18px 18px 0 0;padding:12px 12px 14px;box-shadow:0 40px 70px -30px rgb(0 0 0 / .45)}
.lap .scr img{display:block;width:100%;border-radius:6px}
.lap .base{height:18px;margin:0 -34px;background:linear-gradient(#CFC8BD,#A89F92);border-radius:0 0 18px 18px}
.tel{position:absolute;background:#111;border-radius:40px;padding:10px;box-shadow:0 40px 70px -25px rgb(0 0 0 / .5)}
.tel img{display:block;width:100%;border-radius:31px}
.chips{display:flex;flex-wrap:wrap;gap:12px}
.chips span{font-size:22px;font-weight:600;padding:12px 20px;border-radius:999px;background:${C.card};border:1px solid ${C.line}}
.chips span.a{background:${C.accent};border-color:${C.accent};color:#fff}
.who{font-size:20px;color:${C.muted};font-weight:500}
</style>`;

const exampleHtml=w=>`<!doctype html><html lang="ru"><head>${head}</head><body><div class="c">
<div style="position:absolute;left:64px;top:56px;display:grid;gap:10px">
  <div class="eb">Пример главного экрана</div>
  <h2 style="font-size:50px;line-height:1.05">${w.niche}</h2>
</div>
<div class="lap" style="left:64px;top:214px;width:820px"><div class="scr"><img src="${fileUrl(w.lap)}"></div><div class="base"></div></div>
<div class="tel" style="right:70px;top:250px;width:262px"><img src="${fileUrl(w.tel)}"></div>
<div style="position:absolute;left:64px;bottom:40px" class="who">Ноутбук и телефон · названия и контакты скрыты</div>
</div></body></html>`;

const stepsHtml=()=>`<!doctype html><html lang="ru"><head>${head}
<style>.st{display:grid;grid-template-columns:84px 1fr;gap:24px;align-items:center;padding:26px 0;border-top:1px solid ${C.line}}
.st b{width:70px;height:70px;border-radius:50%;background:${C.accent};color:#fff;display:grid;place-items:center;font-size:32px;font-weight:800}
.st h3{margin:0 0 6px;font-size:34px;font-weight:700;letter-spacing:-.01em}.st p{margin:0;font-size:24px;color:${C.muted};line-height:1.35}</style>
</head><body><div class="c" style="padding:64px 72px">
<div class="eb">Как работаем</div>
<h2 style="font-size:58px;line-height:1.05;margin:14px 0 34px">Вы видите свой сайт до оплаты</h2>
<div class="st"><b>1</b><div><h3>Пишете, чем занимаетесь</h3><p>Задам 2–3 вопроса о клиентах и услугах</p></div></div>
<div class="st"><b>2</b><div><h3>Через 1–2 дня показываю набросок</h3><p>Структура, первый экран с вашим названием и фото, разбор конкурентов</p></div></div>
<div class="st"><b>3</b><div><h3>Нравится: делаем сайт целиком</h3><p>Цену считаем по блокам, оплата по этапам</p></div></div>
<div class="st"><b>4</b><div><h3>Сайт полностью ваш</h3><p>Домен и доступы оформляем на вас</p></div></div>
</div></body></html>`;

const fotoBlock=(st)=>hasFoto
  ? `<div style="${st};border-radius:260px 260px 28px 28px;overflow:hidden;background:#ddd"><img src="${fileUrl(fotoPath)}" style="width:100%;height:100%;object-fit:cover;object-position:center 20%"></div>`
  : `<div style="${st};border-radius:260px 260px 28px 28px;background:#D9D1C5;display:grid;place-items:center;color:#8A8074;font-size:26px;font-weight:600">ваше фото</div>`;

const coverHtml=o=>`<!doctype html><html lang="ru"><head>${head}</head><body><div class="c">
<div style="position:absolute;left:64px;top:64px;width:600px;display:grid;gap:22px">
  <div class="eb">${o.eyebrow}</div>
  <h1 style="font-size:${o.size||66}px;line-height:1.02">${o.title}</h1>
  <div style="font-size:27px;line-height:1.35;color:${C.muted}">${o.sub}</div>
  <div class="chips" style="margin-top:8px">${o.chips.map((c,i)=>`<span class="${i===0?'a':''}">${c}</span>`).join('')}</div>
</div>
${fotoBlock('position:absolute;right:64px;top:64px;width:430px;height:640px')}
${o.tel?`<div class="tel" style="right:400px;top:430px;width:200px;border-radius:32px;padding:8px"><img src="${fileUrl(o.tel)}" style="border-radius:25px"></div>`:''}
${o.extra||''}
<div style="position:absolute;left:64px;bottom:48px" class="who">Анастасия · сайты для малого бизнеса</div>
</div></body></html>`;

const mapsExtra=`<div style="position:absolute;right:300px;top:440px;width:330px;background:#fff;border-radius:22px;padding:22px 24px;box-shadow:0 30px 60px -25px rgb(0 0 0 / .35);display:grid;gap:12px;font-size:21px">
  <div style="height:96px;border-radius:12px;background:linear-gradient(135deg,#EADFD0,#D7C6B0);display:grid;place-items:center;color:#7A6B58;font-weight:600">фото и обложка</div>
  ${['описание и категории','цены и услуги','часы и кнопки связи','ответы на отзывы'].map(t=>`<div style="display:flex;gap:10px;align-items:center"><span style="width:22px;height:22px;border-radius:50%;background:${C.accent};color:#fff;display:grid;place-items:center;font-size:14px;font-weight:800">✓</span>${t}</div>`).join('')}
</div>`;

(async()=>{
  const b=await chromium.launch();
  for(const w of works)await shoot(b,w);
  const render=async(html,name)=>{
    const f=path.join(tmp,name+'.html');fs.writeFileSync(f,html);
    const p=await b.newPage({viewport:{width:1200,height:900},deviceScaleFactor:2});
    await p.goto(fileUrl(f));await p.waitForLoadState('networkidle').catch(()=>{});
    await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
    await p.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:88});
    await p.close();
  };
  const byDir=d=>works.find(w=>w.dir===d);
  await render(coverHtml({
    eyebrow:'Сайт под ключ для бизнеса',
    title:'Покажу ваш сайт до оплаты',
    sub:'Первый экран с вашим названием и фото через 1–2 дня',
    chips:['от 15 000 ₽','домен на вас','оплата по этапам'],
    tel:byDir('mikahome').tel}),'1-sait-oblozhka');
  await render(coverHtml({
    eyebrow:'Лендинг для мастера и салона',
    title:'Сайт сам ответит на «сколько стоит?»',
    size:58,
    sub:'Цены, работы до и после, запись в пару касаний',
    chips:['от 15 000 ₽','первый экран до оплаты'],
    tel:byDir('sputnikpdr').tel}),'2-lending-oblozhka');
  await render(coverHtml({
    eyebrow:'Яндекс Карты и 2ГИС',
    title:'Оформлю карточку, чтобы рядом выбирали вас',
    size:56,
    sub:'Фото, цены, описание и ответы на отзывы',
    chips:['от 10 000 ₽'],
    extra:mapsExtra}),'3-karty-oblozhka');
  await render(stepsHtml(),'0-kak-rabotaem');
  for(const w of works)await render(exampleHtml(w),'primer-'+w.dir);
  await b.close();
  console.log('готово:',fs.readdirSync(out).join(', '),hasFoto?'':'(фото пока заглушка)');
})();
