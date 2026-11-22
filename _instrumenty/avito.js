// Картинки для объявлений на Авито, 4:3 (1200×900).
// Запуск из корня репозитория: node _instrumenty/avito.js
// Стиль как у объявления Анастасии про сайты: светло-серый фон, синий акцент, рукописная строка, её фото без фона.
// Фото без фона лежат в avito/foto/*.png (вырезаны rembg из avito/foto/*.jpg).
// Главные экраны берутся из папок клиентов, названия, телефоны и адреса размываются
// (Авито не пропускает фото с контактами).
// Результат: avito/oblozhki/*.jpg
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');

const root=path.resolve(__dirname,'..');
const out=path.join(root,'avito','oblozhki');
const tmp=path.join(root,'avito','.shots');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(tmp,{recursive:true});
const fileUrl=f=>'file://'+f;

const works=[
  {dir:'mikahome',    niche:'Мебель на заказ'},
  {dir:'sputnikpdr',  niche:'Удаление вмятин без покраски'},
  {dir:'unity-elbrus',niche:'Гостевые дома'},
  {dir:'avtokids',    niche:'Магазин детских электромобилей'},
  {dir:'adaya',       niche:'Мастерская ручной работы'},
];

// цвета сняты с её обложки
const C={bg:'#E2E1DC',ink:'#0A0A0C',muted:'#5C5A55',blue:'#2C4BDA',card:'#FFFFFF',line:'#CFCCC4'};

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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800;900&family=Marck+Script&display=swap">
<style>
*{box-sizing:border-box}html,body{margin:0}
.c{width:1200px;height:900px;position:relative;overflow:hidden;background:${C.bg};font-family:Onest,sans-serif;color:${C.ink}}
.eb{font-size:19px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${C.blue}}
.scr{font-family:'Marck Script',cursive;font-weight:400;color:${C.blue}}
h1,h2{margin:0;font-weight:900;letter-spacing:-.035em}
.lap{position:absolute}
.lap .sc{background:#111;border-radius:18px 18px 0 0;padding:12px 12px 14px;box-shadow:0 40px 70px -30px rgb(0 0 0 / .45)}
.lap .sc img{display:block;width:100%;border-radius:6px}
.lap .base{height:18px;margin:0 -34px;background:linear-gradient(#CFCBC3,#A8A297);border-radius:0 0 18px 18px}
.tel{position:absolute;background:#111;border-radius:40px;padding:10px;box-shadow:0 40px 70px -25px rgb(0 0 0 / .5)}
.tel img{display:block;width:100%;border-radius:31px}
.brand{position:absolute;font-size:18px;font-weight:800;letter-spacing:.16em;color:${C.ink}}
</style>`;

const exampleHtml=w=>`<!doctype html><html lang="ru"><head>${head}</head><body><div class="c">
<div style="position:absolute;left:64px;top:60px;display:grid;gap:8px">
  <div class="eb">Пример главного экрана</div>
  <h2 style="font-size:52px;line-height:1.05">${w.niche}</h2>
</div>
<div class="lap" style="left:64px;top:214px;width:820px"><div class="sc"><img src="${fileUrl(w.lap)}"></div><div class="base"></div></div>
<div class="tel" style="right:70px;top:250px;width:262px"><img src="${fileUrl(w.tel)}"></div>
<div style="position:absolute;left:64px;bottom:40px;font-size:19px;color:${C.muted};font-weight:500">Набросок · ноутбук и телефон · названия и контакты скрыты</div>
<div class="brand" style="right:64px;bottom:40px">FOR.MI</div>
</div></body></html>`;

const stepsHtml=()=>`<!doctype html><html lang="ru"><head>${head}
<style>.st{display:grid;grid-template-columns:84px 1fr;gap:24px;align-items:center;padding:24px 0;border-top:1px solid ${C.line}}
.st b{width:70px;height:70px;border-radius:50%;background:${C.blue};color:#fff;display:grid;place-items:center;font-size:32px;font-weight:800}
.st h3{margin:0 0 6px;font-size:34px;font-weight:800;letter-spacing:-.02em}.st p{margin:0;font-size:24px;color:${C.muted};line-height:1.35}</style>
</head><body><div class="c" style="padding:60px 72px">
<div class="eb">Как работаем</div>
<h2 style="font-size:60px;line-height:1.05;margin:12px 0 30px">Вы видите свой сайт <span class="scr" style="font-size:72px;letter-spacing:0;word-spacing:-.25em">до оплаты</span></h2>
<div class="st"><b>1</b><div><h3>Пишете, чем занимаетесь</h3><p>Задам 2–3 вопроса о клиентах и услугах</p></div></div>
<div class="st"><b>2</b><div><h3>Через 1–2 дня показываю набросок</h3><p>Структура, первый экран с вашим названием и фото, разбор конкурентов</p></div></div>
<div class="st"><b>3</b><div><h3>Нравится: делаем сайт целиком</h3><p>Цену считаем по блокам, оплата по этапам</p></div></div>
<div class="st"><b>4</b><div><h3>Сайт полностью ваш</h3><p>Домен и доступы оформляем на вас</p></div></div>
<div class="brand" style="right:72px;top:66px">FOR.MI</div>
</div></body></html>`;

const pin=`<svg width="30" height="30" viewBox="0 0 24 24"><path fill="${C.blue}" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>`;
const tick=t=>`<div style="display:flex;gap:12px;align-items:center"><span style="flex:none;width:26px;height:26px;border-radius:50%;background:${C.blue};color:#fff;display:grid;place-items:center;font-size:15px;font-weight:800">✓</span>${t}</div>`;

const kartyHtml=()=>`<!doctype html><html lang="ru"><head>${head}</head><body><div class="c">
<img src="${fileUrl(path.join(root,'avito','foto','foto-2-kub.png'))}" style="position:absolute;right:-235px;top:34px;height:1000px">
<div style="position:absolute;left:72px;top:140px;width:600px">
  <div class="eb">Яндекс Карты и 2ГИС · работаю удалённо</div>
  <h1 style="font-size:82px;line-height:.98;margin-top:26px">Клиенты рядом выберут вас</h1>
  <div class="scr" style="font-size:100px;line-height:1;margin-top:6px;word-spacing:-.25em">на картах</div>
  <div style="margin-top:46px;display:inline-grid;gap:4px;background:${C.blue};color:#fff;border-radius:18px;padding:20px 30px">
    <div style="font-size:30px;font-weight:800">Напишите «КАРТЫ»</div>
    <div style="font-size:19px;font-weight:500;opacity:.92">покажу, что поправить в вашей карточке</div>
  </div>
</div>
<div style="position:absolute;right:56px;bottom:60px;width:330px;background:${C.card};border-radius:22px;padding:22px 24px;box-shadow:0 30px 60px -20px rgb(0 0 0 / .35);display:grid;gap:14px;font-size:21px;font-weight:600">
  <div style="display:flex;gap:10px;align-items:center;font-size:22px;font-weight:800">${pin}Ваша карточка</div>
  ${tick('фото и описание')}${tick('услуги с ценами')}${tick('ответы на отзывы')}
</div>
<div class="brand" style="left:72px;bottom:48px">FOR.MI</div>
</div></body></html>`;


const kartyVhoditHtml=()=>`<!doctype html><html lang="ru"><head>${head}
<style>.it{display:grid;grid-template-columns:64px 1fr;gap:24px;align-items:center;padding:30px 0;border-top:1px solid ${C.line}}
.it b{width:58px;height:58px;border-radius:50%;background:${C.blue};color:#fff;display:grid;place-items:center;font-size:28px;font-weight:800}
.it h3{margin:0 0 6px;font-size:38px;font-weight:800;letter-spacing:-.02em}.it p{margin:0;font-size:27px;color:${C.muted};line-height:1.3}</style>
</head><body><div class="c" style="padding:64px 72px">
<div class="eb">Яндекс Карты и 2ГИС</div>
<h2 style="font-size:66px;line-height:1.05;margin:14px 0 26px">Что сделаю <span class="scr" style="font-size:80px;letter-spacing:0;word-spacing:-.25em">в карточке</span></h2>
<div class="it"><b>✓</b><div><h3>Категории и описание</h3><p>Словами, которыми вас ищут: «маникюр рядом», «шиномонтаж 24 часа»</p></div></div>
<div class="it"><b>✓</b><div><h3>Фото и обложка</h3><p>Отберу лучшие, уберу старые и тёмные</p></div></div>
<div class="it"><b>✓</b><div><h3>Услуги и цены</h3><p>Чтобы человек видел цену до звонка</p></div></div>
<div class="it"><b>✓</b><div><h3>Ответы на отзывы</h3><p>Разные, с именем и деталями, без «Спасибо за отзыв!»</p></div></div>
<div class="brand" style="right:72px;top:62px">FOR.MI</div>
</div></body></html>`;

const kartyKakHtml=()=>`<!doctype html><html lang="ru"><head>${head}
<style>.st{display:grid;grid-template-columns:92px 1fr;gap:28px;align-items:center;padding:40px 0;border-top:1px solid ${C.line}}
.st b{width:80px;height:80px;border-radius:50%;background:${C.blue};color:#fff;display:grid;place-items:center;font-size:36px;font-weight:800}
.st h3{margin:0 0 8px;font-size:40px;font-weight:800;letter-spacing:-.02em}.st p{margin:0;font-size:28px;color:${C.muted};line-height:1.35}</style>
</head><body><div class="c" style="padding:60px 72px">
<div class="eb">Как работаем</div>
<h2 style="font-size:64px;line-height:1.05;margin:14px 0 34px">Сначала покажу, <span class="scr" style="font-size:78px;letter-spacing:0;word-spacing:-.25em">что поправить</span></h2>
<div class="st"><b>1</b><div><h3>Пишете «КАРТЫ» и название компании</h3><p>Нахожу вашу карточку в Яндекс Картах и 2ГИС</p></div></div>
<div class="st"><b>2</b><div><h3>Присылаю, что в ней мешает</h3><p>Например: нет цен, фото трёхлетней давности, отзывы без ответов</p></div></div>
<div class="st"><b>3</b><div><h3>Нравится: оформляю</h3><p>Карточка и все доступы остаются у вас</p></div></div>
<div class="brand" style="right:72px;top:66px">FOR.MI</div>
</div></body></html>`;

const xmark=t=>`<div style="display:flex;gap:14px;align-items:flex-start"><span style="flex:none;width:30px;height:30px;border-radius:50%;background:#C9C6BE;color:#fff;display:grid;place-items:center;font-size:17px;font-weight:800;margin-top:2px">✕</span><span>${t}</span></div>`;
const vmark=t=>`<div style="display:flex;gap:14px;align-items:flex-start"><span style="flex:none;width:30px;height:30px;border-radius:50%;background:${C.blue};color:#fff;display:grid;place-items:center;font-size:17px;font-weight:800;margin-top:2px">✓</span><span>${t}</span></div>`;
const kartyDoPosleHtml=()=>`<!doctype html><html lang="ru"><head>${head}
<style>.row{position:absolute;left:72px;right:72px;top:236px;bottom:96px;display:grid;grid-template-columns:1fr 1fr;gap:36px}
.cd{border-radius:26px;padding:34px 36px;display:grid;align-content:start;gap:24px;font-size:29px;line-height:1.25}
.cd h3{margin:0 0 4px;font-size:22px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}</style>
</head><body><div class="c">
<div style="position:absolute;left:72px;top:62px;display:grid;gap:10px">
  <div class="eb">Пример: студия маникюра</div>
  <h2 style="font-size:62px;line-height:1.02">Та же карточка, <span class="scr" style="font-size:76px;letter-spacing:0;word-spacing:-.25em">до и после</span></h2>
</div>
<div class="row"><div class="cd" style="background:#D6D3CC;color:#57544E">
  <h3 style="color:#7C786F">Было</h3>
  ${xmark('2 тёмных фото трёхлетней давности')}${xmark('Описание из одного слова')}${xmark('Цен нет')}${xmark('Часы работы не указаны')}${xmark('3 отзыва без ответа')}
</div>
<div class="cd" style="background:#fff;color:${C.ink};box-shadow:0 30px 60px -25px rgb(0 0 0 / .3)">
  <h3 style="color:${C.blue}">Стало</h3>
  ${vmark('Обложка и 12 светлых фото работ')}${vmark('Описание словами, которыми ищут')}${vmark('Прайс из 8 услуг')}${vmark('Часы и кнопка «Записаться»')}${vmark('Свой ответ на каждый отзыв')}
</div></div>
<div style="position:absolute;left:72px;bottom:40px;font-size:19px;color:${C.muted};font-weight:500">Пример для наглядности</div>
<div class="brand" style="right:72px;bottom:40px">FOR.MI</div>
</div></body></html>`;

const oboMneHtml=()=>`<!doctype html><html lang="ru"><head>${head}</head><body><div class="c">
<img src="${fileUrl(path.join(root,'avito','foto','foto-1-sidit.png'))}" style="position:absolute;right:-160px;top:24px;height:980px;-webkit-mask-image:linear-gradient(90deg,transparent 0,transparent 8%,#000 38%);mask-image:linear-gradient(90deg,transparent 0,transparent 8%,#000 38%)">
<div style="position:absolute;left:72px;top:120px;width:520px">
  <div class="eb">Кто будет работать с вами</div>
  <h1 style="font-size:96px;line-height:1;margin-top:22px">Анастасия</h1>
  <div style="font-size:28px;line-height:1.35;color:${C.muted};margin-top:20px">Делаю сайты и карточки на картах для малого бизнеса. Работаю удалённо, на связи в чате каждый день.</div>
  <div style="display:grid;gap:14px;margin-top:34px;font-size:25px;font-weight:600">
    ${vmark('Самозанятая, чек на каждую оплату')}${vmark('Договор и оплата по этапам')}${vmark('Все доступы оформляю на вас')}
  </div>
</div>
<div class="brand" style="left:72px;bottom:48px">FOR.MI</div>
</div></body></html>`;

(async()=>{
  const b=await chromium.launch();
  for(const w of works)await shoot(b,w);
  const render=async(html,name,dsf=2)=>{
    const f=path.join(tmp,name+'.html');fs.writeFileSync(f,html);
    const p=await b.newPage({viewport:{width:1200,height:900},deviceScaleFactor:dsf});
    await p.goto(fileUrl(f));await p.waitForLoadState('networkidle').catch(()=>{});
    await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
    await p.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:90});
    await p.close();
  };
  await render(kartyHtml(),'karty-oblozhka',1.25);
  await render(stepsHtml(),'kak-rabotaem');
  await render(kartyVhoditHtml(),'karty-chto-vhodit');
  await render(kartyKakHtml(),'karty-kak-rabotaem');
  await render(kartyDoPosleHtml(),'karty-do-posle');
  await render(oboMneHtml(),'obo-mne',1.25);
  for(const w of works)await render(exampleHtml(w),'primer-'+w.dir);
  await b.close();
  console.log('готово:',fs.readdirSync(out).join(', '));
})();
