/* ===== link-policy.js ===== */

(() => {
  const dailyPages=new Set(['/daily-quiz/','/games/brain-mix/','/games/connections/','/games/math-rush/','/games/brainiword/','/games/number-route/','/games/order-up/','/games/odd-one-out/','/games/topic-rush/','/games/sequence/','/games/higher-lower/']);
  const embedded=window.top!==window;
  function update(root){
    const links=root.matches?.('a[href]')?[root]:[];
    links.push(...(root.querySelectorAll?.('a[href]')||[]));
    for(const a of links){
      let newTab=false;
      try{const url=new URL(a.getAttribute('href'),document.baseURI),host=url.hostname.replace(/^www\./,'');const external=/^https?:$/.test(url.protocol)&&host!==location.hostname.replace(/^www\./,'')&&host!=='brainilabgames.com';const page=url.pathname.replace(/\/index\.html$/,'/').replace(/\/?$/,'/');newTab=external||(embedded&&/^https?:$/.test(url.protocol)&&!dailyPages.has(page));}catch{}
      if(newTab){a.target='_blank';a.relList.add('noopener','noreferrer');}
      else{a.removeAttribute('target');a.relList.remove('noopener','noreferrer');if(!a.rel)a.removeAttribute('rel');}
    }
  }
  update(document);
  new MutationObserver(records=>records.forEach(r=>r.type==='attributes'?update(r.target):r.addedNodes.forEach(update)))
    .observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});
})();

/* ===== icon-system.js ===== */

/*
  BrainiLab Visual Icon System — V41.8.0
  Uses the approved SVG library in /assets/icons.
  Asset URLs resolve from the executing script so the same static build works
  on production hosting and when opened directly with file:// for QA.
*/
window.BrainiIcons=(function(){
  const SCRIPT_SRC=document.currentScript?.src||"";
  const ASSET_ROOT=SCRIPT_SRC
    ? new URL("../",SCRIPT_SRC).href.replace(/\/$/,"")
    : "/assets";
  const ROOT=`${ASSET_ROOT}/icons`;

  function asset(path=""){
    return `${ASSET_ROOT}/${String(path).replace(/^\/+/,"")}`;
  }

  function flagEmojiAsset(code){
    return asset(`flags/emoji/${String(code||"").toLowerCase()}.png`);
  }

  const GROUP_SYMBOLS={
    "⚡":"bolt",
    "🧠":"braini-burst",
    "🌍":"globe",
    "🚩":"target",
    "🏆":"trophy",
    "💡":"star",
    "🧩":"gamepad",
    "⭐":"academic-cap"
  };

  const CATEGORY_BY_GAME={
    generalknowledge:"mixed-general-knowledge",
    worldflags:"world-flags",
    europeflags:"world-flags",
    worldcapitals:"world-capitals",
    science:"science",
    history:"history",
    sports:"sports"
  };

  const GAME_FILES={
    brainmix:"brain-mix",
    "brain-mix":"brain-mix",
    orderup:"order-up",
    "order-up":"order-up",
    topicrush:"topic-rush",
    "topic-rush":"topic-rush",
    brainiword:"brainiword",
    mathrush:"math-rush",
    "math-rush":"math-rush",
    numberroute:"number-route",
    "number-route":"number-route",
    oddoneout:"odd-one-out",
    higherlower:"higher-lower",
    flagdash:"world-flags",
    maphunt:"geography",
    sequence:"sequence"
  };

  const ILLUSTRATIONS=new Set(["world-flags","connections","math-rush","mixed-general-knowledge","brain-mix","brainiword","number-route","sequence","order-up","topic-rush","odd-one-out","higher-lower","survival","science","history","sports","world-capitals","geography"]);
  function artPath(file,fallback){return ILLUSTRATIONS.has(file)?`${ASSET_ROOT}/illustrations/games/${file}.svg`:fallback;}

  function esc(value){
    return String(value??"")
      .replaceAll("&","&amp;")
      .replaceAll('"',"&quot;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

  function img(src,className="",alt=""){
    return `<img class="${esc(className)}" src="${esc(src)}" alt="${esc(alt)}" aria-hidden="${alt?"false":"true"}">`;
  }

  function product(name,className="braini-ui-icon",alt=""){
    return img(`${ROOT}/product/${name}.svg`,className,alt);
  }

  function game(id,variant="standard",className="braini-game-icon",alt=""){
    return img(gamePath(id,variant),className,alt);
  }

  function category(id,className="braini-category-icon",alt=""){
    const file=CATEGORY_BY_GAME[id]||id;
    return img(artPath(file,`${ROOT}/categories/${file}.svg`),className,alt);
  }

  // Keep stored crest identifiers compatible, with one consistent vector family.
  const GROUP_ART={
    bolt:'<path d="m28 3-17 23h12l-3 19 17-25H25Z"/>',
    'braini-burst':'<path d="M24 10c-3-7-12-4-12 2-7 0-10 10-5 14-4 6 1 13 7 12 3 7 10 4 10-1V10Zm0 0c3-7 12-4 12 2 7 0 10 10 5 14 4 6-1 13-7 12-3 7-10 4-10-1"/><path d="M12 12v7m-5 7h9m-2 12v-7m22-19v7m5 7h-9m2 12v-7"/>',
    globe:'<circle cx="24" cy="24" r="19"/><ellipse cx="24" cy="24" rx="8" ry="19"/><path d="M5 24h38M8 14h32M8 34h32"/>',
    target:'<path d="M11 44V6m1 1c11-9 15 9 28 0v22c-13 9-17-9-28 0"/>',
    trophy:'<path d="M14 5h20v15c0 14-20 14-20 0V5Zm0 5H5v6c0 7 5 11 12 11m17-17h9v6c0 7-5 11-12 11M24 31v10m-10 3h20m-18-3h16"/>',
    star:'<path d="M15 29c-10-10-3-25 9-25s19 15 9 25c-3 3-4 5-4 8H19c0-3-1-5-4-8ZM19 42h10m-8 4h6M24 31V19m-5 0 5 5 5-5"/>',
    gamepad:'<path d="M7 8h12c-5 10 15 10 10 0h12v12c-10-5-10 15 0 10v11H29c5-10-15-10-10 0H7V29c10 5 10-15 0-10Z"/>',
    'academic-cap':'<path d="m24 3 6 13 14 2-10 10 3 15-13-7-13 7 3-15L4 18l14-2Z"/>'
  };
  function groupArt(value){
    const key=GROUP_SYMBOLS[value]||value;
    return GROUP_ART[key]||GROUP_ART.bolt;
  }
  function groupSymbol(value,className="braini-group-symbol",alt=""){
    return `<svg class="${esc(className)}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" ${alt?`role="img" aria-label="${esc(alt)}"`:'aria-hidden="true"'}>${groupArt(value)}</svg>`;
  }
  function groupCrest(crest={},className=""){
    const color=/^#[0-9a-f]{6}$/i.test(crest.color||'')?crest.color:'#FFD813';
    const hex=color.slice(1),channels=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
    const dark=(channels[0]*299+channels[1]*587+channels[2]*114)/1000<100;
    const ink=dark?'#fffdf4':'#2D296E';
    return `<span class="braini-group-crest ${esc(className)}" aria-hidden="true"><svg class="group-crest-art" viewBox="0 0 100 116" fill="none">
      <path d="M50 3 93 17v37c0 27-19 45-43 59C26 99 7 81 7 54V17Z" fill="${color}" stroke="#2D296E" stroke-width="3" stroke-linejoin="round"/>
      <path d="m50 10 36 12v32c0 23-16 39-36 52-20-13-36-29-36-52V22Z" stroke="${ink}" stroke-opacity=".55" stroke-width="1.5"/>
      <path d="M12 23 50 10l38 13v10L50 20 12 33Z" fill="white" fill-opacity=".16"/>
      <path d="m34 89 16 11 16-11" stroke="${ink}" stroke-opacity=".55" stroke-width="2.5" stroke-linecap="round"/>
      <g transform="translate(26 31)" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${groupArt(crest.icon||'⚡')}</g>
    </svg></span>`;
  }

  function rankHalo(name,className="brain-rank-halo",alt=""){
    return img(`${ROOT}/rank-halos/${name}.svg`,className,alt);
  }

  function gamePath(id,variant="standard"){
    const file=GAME_FILES[id]||CATEGORY_BY_GAME[id]||id;
    return artPath(file,`${ROOT}/games/${variant}/${file}.svg`);
  }

  function categoryPath(id){
    const file=CATEGORY_BY_GAME[id]||id;
    return artPath(file,`${ROOT}/categories/${file}.svg`);
  }

  return {
    ROOT,
    ASSET_ROOT,
    asset,
    flagEmojiAsset,
    GROUP_SYMBOLS,
    CATEGORY_BY_GAME,
    GAME_FILES,
    img,
    product,
    game,
    category,
    groupSymbol,
    groupCrest,
    rankHalo,
    gamePath,
    categoryPath
  };
})();

/* ===== build.js ===== */

/* BrainiLab build identity — V41 Stable V1. */
window.BRAINI_BUILD="41.11.0";
window.BRAINI_ENABLE_SW=
  window.BRAINI_ENABLE_SW===true;

/* ===== daily-rules.js ===== */

/* Shared Daily contract. Configuration is generated from content/daily-rules.json. */
window.BrainiDailyRules=(()=>{
 const config={version:'daily-choice-v1',startsOn:'2026-10-01',primaryMax:2500,bonusMax:1000,completionXP:250,rotation:['brainmix','connections','mathrush','brainiword','numberroute','orderup','oddoneout','topicrush','sequence','higherlower']};
 const date=()=>new Date().toISOString().slice(0,10);
 function active(day=date()){return /^\d{4}-\d{2}-\d{2}$/.test(day)&&day>=config.startsOn;}
 function lineup(day=date()){
  if(!active(day))return null;
  const offset=Math.floor((Date.parse(day+'T00:00:00Z')-Date.parse(config.startsOn+'T00:00:00Z'))/86400000);
  if(!Number.isFinite(offset))return null;
  const rotation=config.rotation,n=rotation.length,index=offset%n;
  // Coprime day steps rotate each role; offsets always produce three distinct games.
  return [rotation[index],rotation[(index+3+Math.floor(offset/n)%3)%n],rotation[(index+7+Math.floor(offset/n)%2)%n]];
 }
 function max(game,day=date()){const ids=lineup(day);return ids?(game===ids[0]?config.primaryMax:ids.slice(1).includes(game)?config.bonusMax:0):2500;}
 function points(raw,game,day=date()){return Math.round(Math.min(2500,Math.max(0,Number(raw)||0))*max(game,day)/2500);}
 function model(day=date()){const ids=lineup(day);return ids?{version:config.version,primary:ids[0],choices:ids.slice(1),maxScore:config.primaryMax+config.bonusMax,maxGames:2,completionXP:config.completionXP}:{version:'legacy',primary:'brainmix',choices:[],maxScore:10000,maxGames:4,completionXP:250};}
 return {config,active,lineup,max,points,model};
})();

/* ===== player-personalities.js ===== */

/* Original BrainiLab knowledge portraits. Assignment is a game nickname, not a real identity. */
window.BrainiPeople=(function(){
 const PEOPLE=[{"id":"socrates","name":"Socrates","short":"Socrates","symbol":"scroll","avatar":"/assets/avatars/knowledge/socrates.svg"},{"id":"plato","name":"Plato","short":"Plato","symbol":"scroll","avatar":"/assets/avatars/knowledge/plato.svg"},{"id":"aristotle","name":"Aristotle","short":"Aristotle","symbol":"scroll","avatar":"/assets/avatars/knowledge/aristotle.svg"},{"id":"hypatia","name":"Hypatia","short":"Hypatia","symbol":"compass","avatar":"/assets/avatars/knowledge/hypatia.svg"},{"id":"confucius","name":"Confucius","short":"Confucius","symbol":"scroll","avatar":"/assets/avatars/knowledge/confucius.svg"},{"id":"al-khwarizmi","name":"Al-Khwarizmi","short":"Al-Khwarizmi","symbol":"compass","avatar":"/assets/avatars/knowledge/al-khwarizmi.svg"},{"id":"avicenna","name":"Avicenna","short":"Avicenna","symbol":"book","avatar":"/assets/avatars/knowledge/avicenna.svg"},{"id":"maimonides","name":"Maimonides","short":"Maimonides","symbol":"scroll","avatar":"/assets/avatars/knowledge/maimonides.svg"},{"id":"fibonacci","name":"Leonardo Fibonacci","short":"Fibonacci","symbol":"compass","avatar":"/assets/avatars/knowledge/fibonacci.svg"},{"id":"leonardo","name":"Leonardo da Vinci","short":"Leonardo","symbol":"gear","avatar":"/assets/avatars/knowledge/leonardo.svg"},{"id":"galileo","name":"Galileo Galilei","short":"Galileo","symbol":"telescope","avatar":"/assets/avatars/knowledge/galileo.svg"},{"id":"kepler","name":"Johannes Kepler","short":"Kepler","symbol":"compass","avatar":"/assets/avatars/knowledge/kepler.svg"},{"id":"newton","name":"Isaac Newton","short":"Newton","symbol":"prism","avatar":"/assets/avatars/knowledge/newton.svg"},{"id":"leibniz","name":"Gottfried Leibniz","short":"Leibniz","symbol":"compass","avatar":"/assets/avatars/knowledge/leibniz.svg"},{"id":"descartes","name":"René Descartes","short":"Descartes","symbol":"compass","avatar":"/assets/avatars/knowledge/descartes.svg"},{"id":"pascal","name":"Blaise Pascal","short":"Pascal","symbol":"gear","avatar":"/assets/avatars/knowledge/pascal.svg"},{"id":"euler","name":"Leonhard Euler","short":"Euler","symbol":"compass","avatar":"/assets/avatars/knowledge/euler.svg"},{"id":"gauss","name":"Carl Friedrich Gauss","short":"Gauss","symbol":"compass","avatar":"/assets/avatars/knowledge/gauss.svg"},{"id":"faraday","name":"Michael Faraday","short":"Faraday","symbol":"magnet","avatar":"/assets/avatars/knowledge/faraday.svg"},{"id":"darwin","name":"Charles Darwin","short":"Darwin","symbol":"leaf","avatar":"/assets/avatars/knowledge/darwin.svg"},{"id":"maxwell","name":"James Clerk Maxwell","short":"Maxwell","symbol":"atom","avatar":"/assets/avatars/knowledge/maxwell.svg"},{"id":"tesla","name":"Nikola Tesla","short":"Tesla","symbol":"bolt","avatar":"/assets/avatars/knowledge/tesla.svg"},{"id":"einstein","name":"Albert Einstein","short":"Einstein","symbol":"atom","avatar":"/assets/avatars/knowledge/einstein.svg"},{"id":"curie","name":"Marie Curie","short":"Curie","symbol":"flask","avatar":"/assets/avatars/knowledge/curie.svg"},{"id":"bohr","name":"Niels Bohr","short":"Bohr","symbol":"atom","avatar":"/assets/avatars/knowledge/bohr.svg"},{"id":"planck","name":"Max Planck","short":"Planck","symbol":"atom","avatar":"/assets/avatars/knowledge/planck.svg"},{"id":"schrodinger","name":"Erwin Schrödinger","short":"Schrödinger","symbol":"atom","avatar":"/assets/avatars/knowledge/schrodinger.svg"},{"id":"heisenberg","name":"Werner Heisenberg","short":"Heisenberg","symbol":"atom","avatar":"/assets/avatars/knowledge/heisenberg.svg"},{"id":"dirac","name":"Paul Dirac","short":"Dirac","symbol":"atom","avatar":"/assets/avatars/knowledge/dirac.svg"},{"id":"feynman","name":"Richard Feynman","short":"Feynman","symbol":"atom","avatar":"/assets/avatars/knowledge/feynman.svg"},{"id":"cajal","name":"Santiago Ramón y Cajal","short":"Ramón y Cajal","symbol":"neuron","avatar":"/assets/avatars/knowledge/cajal.svg"},{"id":"pavlov","name":"Ivan Pavlov","short":"Pavlov","symbol":"neuron","avatar":"/assets/avatars/knowledge/pavlov.svg"},{"id":"franklin","name":"Rosalind Franklin","short":"Franklin","symbol":"helix","avatar":"/assets/avatars/knowledge/franklin.svg"},{"id":"lovelace","name":"Ada Lovelace","short":"Lovelace","symbol":"gear","avatar":"/assets/avatars/knowledge/lovelace.svg"},{"id":"turing","name":"Alan Turing","short":"Turing","symbol":"chip","avatar":"/assets/avatars/knowledge/turing.svg"},{"id":"noether","name":"Emmy Noether","short":"Noether","symbol":"compass","avatar":"/assets/avatars/knowledge/noether.svg"},{"id":"ramanujan","name":"Srinivasa Ramanujan","short":"Ramanujan","symbol":"compass","avatar":"/assets/avatars/knowledge/ramanujan.svg"},{"id":"johnson","name":"Katherine Johnson","short":"Johnson","symbol":"orbit","avatar":"/assets/avatars/knowledge/johnson.svg"},{"id":"hopper","name":"Grace Hopper","short":"Hopper","symbol":"chip","avatar":"/assets/avatars/knowledge/hopper.svg"},{"id":"lamarr","name":"Hedy Lamarr","short":"Lamarr","symbol":"signal","avatar":"/assets/avatars/knowledge/lamarr.svg"},{"id":"wu","name":"Chien-Shiung Wu","short":"Wu","symbol":"atom","avatar":"/assets/avatars/knowledge/wu.svg"},{"id":"rubin","name":"Vera Rubin","short":"Rubin","symbol":"orbit","avatar":"/assets/avatars/knowledge/rubin.svg"},{"id":"mcclintock","name":"Barbara McClintock","short":"McClintock","symbol":"leaf","avatar":"/assets/avatars/knowledge/mcclintock.svg"},{"id":"hodgkin","name":"Dorothy Hodgkin","short":"Hodgkin","symbol":"helix","avatar":"/assets/avatars/knowledge/hodgkin.svg"},{"id":"tu-youyou","name":"Tu Youyou","short":"Tu Youyou","symbol":"flask","avatar":"/assets/avatars/knowledge/tu-youyou.svg"},{"id":"maathai","name":"Wangari Maathai","short":"Maathai","symbol":"leaf","avatar":"/assets/avatars/knowledge/maathai.svg"},{"id":"tagore","name":"Rabindranath Tagore","short":"Tagore","symbol":"pen","avatar":"/assets/avatars/knowledge/tagore.svg"},{"id":"mistral","name":"Gabriela Mistral","short":"Mistral","symbol":"pen","avatar":"/assets/avatars/knowledge/mistral.svg"},{"id":"ochoa","name":"Severo Ochoa","short":"Ochoa","symbol":"helix","avatar":"/assets/avatars/knowledge/ochoa.svg"},{"id":"salam","name":"Abdus Salam","short":"Salam","symbol":"atom","avatar":"/assets/avatars/knowledge/salam.svg"}];
 const PREFIXES=['Curious','Bright','Clever','Cosmic','Bold','Keen','Merry','Witty'];
 const hash=value=>{let n=2166136261;for(const c of String(value||'brainilab')){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
 const legacy=value=>/^(?:Guest|Player) [0-9a-f]{10}$/i.test(String(value||'').trim());
 function preset(value){const name=String(value||'').trim();return PEOPLE.find(p=>PREFIXES.some(a=>name===a+' '+p.short))||null;}
 function identity(key){const n=hash(key),person=PEOPLE[n%PEOPLE.length];return {...person,nickname:PREFIXES[(n>>>8)%PREFIXES.length]+' '+person.short};}
 function resolve(value={},fallback='brainilab'){
   if(typeof value==='string')value={name:value};
   const raw=String(value.identityName||value.name||value.displayName||'').trim();
   const person=preset(raw),result=person?{...person,nickname:raw}:identity(raw&&!['You','Braini Player','Player'].includes(raw)?raw:(value.defaultSeed||fallback));
   return {...result,displayName:!raw||legacy(raw)||['You','Braini Player','Player'].includes(raw)?result.nickname:raw};
 }
 return {PEOPLE,PREFIXES,identity,resolve,isLegacy:legacy,isPreset:value=>!!preset(value)};
})();

/* ===== avatar-design.js ===== */

/* Original BrainiLab character artwork. Local SVG, no remote avatar service. */
window.BrainiAvatarDesign=(function(){
  const choices={
    mode:[['picture','Your picture'],['built','My avatar']],
    skin:[['sand','Sand','#f3c4a0'],['peach','Peach','#ffdbc4'],['honey','Honey','#d79d6b'],['cocoa','Cocoa','#a96b47'],['umber','Umber','#744630'],['ebony','Ebony','#4c3028']],
    hair:[['sweep','Side sweep'],['curls','Curls'],['bob','Soft bob'],['crop','Short crop'],['bald','No hair'],['ponytail','Ponytail'],['waves','Long waves'],['braids','Braids']],
    hairColor:[['brown','Brown','#644130'],['black','Black','#302c36'],['blond','Blond','#e6bd63'],['auburn','Auburn','#a34e30'],['silver','Silver','#b5b6c2']],
    shirt:[['navy','Navy','#2d296e'],['green','Green','#397e39'],['orange','Orange','#d86725'],['blue','Blue','#3d86b0'],['berry','Berry','#aa4b77']],
    background:[['lilac','Lilac','#eae6fa'],['sky','Sky','#dceef8'],['sage','Sage','#e1efdf'],['sunshine','Sunshine','#fff0b3'],['coral','Coral','#fce1d6']],
    glasses:[['none','No glasses'],['round','Fresh eyes',null,150,'Round glasses. A fresh way to look at things.'],['square','Square roots',null,600,'Square frames with a soft spot for math.'],['sun','Bright mind',null,1000,'Sunglasses for a bright mind.'],['monocle','Eye spy',null,2250,'A little monocle for spotting the smallest clues.'],['heart','Specs appeal',null,2750,'Heart-shaped specs. Love at first sight.'],['star','Star pupil',null,3500,'Star-shaped glasses. A little brilliance.'],['visor','Eye-Q',null,5000,'A futuristic visor with an eye for good ideas.'],['doughnut','Dough-eyed',null,6500,'Doughnut glasses. A sweet way to see the world.'],['camera','Focus mode',null,8250,'Camera glasses. Keep your next idea in focus.']],
    hat:[['none','No hat'],['beanie','Warm thoughts',null,500,'A cozy beanie for your best ideas.'],['egg','Egghead',null,1200,'A sunny-side-up hat for a well-rounded thinker.'],['cap','Thinking cap',null,1500,'Put your thinking cap on.'],['corn','A-maize-ing',null,2200,'A corn hat for ideas that really pop.'],['toast','Food for thought',null,2800,'A slice of toast. A little food for thought.'],['cloud','Brainstorm',null,4000,'A little cloud with a bright idea brewing.'],['coffee','Cap-puccino',null,4750,'A foamy coffee cap. A cappuccino for your thinking cap.'],['wave','Brain waves',null,5500,'A breaking wave. Go with the flow of a good idea.'],['wizard','Quiz wizard',null,6000,'A starry hat for a little quiz magic.'],['graduate','Top of the class',null,8000,'A graduation cap. Your head is in a class of its own.']],
    prop:[['none','No extra'],['cookie','Smart cookie',null,300,'A chocolate chip cookie. One clever little snack.'],['icepop','Brain freeze',null,800,'An ice pop to cool off a busy brain.'],['peas','Peas of mind',null,1800,'Peace of mind, one little pea at a time.'],['bulb','Bright idea',null,2500,'A light bulb for your next bright idea.'],['train','Train of thought',null,3200,'A tiny steam engine. All aboard for your next idea.'],['owl','Hoo knew?',null,3800,'A curious little owl. Hoo knew you were so wise?'],['pencil','Sharp thinker',null,4500,'A well-sharpened pencil, ready for a sharp thinker.'],['nacho','Nacho average',null,5750,'A cheesy little chip. Nacho average thinker.'],['rocket','Rocket science',null,7000,'A tiny rocket for ideas that are ready to take off.'],['roll','On a roll',null,7500,'A cinnamon roll for when the ideas keep coming.'],['book','Bookworm',null,9000,'A little worm who always has time for one more page.']]
  };
  const options=Object.freeze(Object.fromEntries(Object.entries(choices).map(([key,list])=>[key,Object.freeze(list.map(([id,name,color,xp=0,description=''])=>Object.freeze({id,name,color,xp,description})))])));
  const metadataKeys=Object.freeze(Object.fromEntries(Object.keys(options).map(key=>[key,'brainilab_avatar_'+key.replace(/[A-Z]/g,c=>'_'+c.toLowerCase())+'_v1'])));
  function clean(value={}){
    return Object.fromEntries(Object.entries(options).map(([key,list])=>[key,list.some(item=>item.id===value?.[key])?value[key]:list[0].id]));
  }
  function available(value,xp=0){
    const result=clean(value),total=Number.isFinite(Number(xp))?Math.max(0,Number(xp)):0;
    for(const [key,list] of Object.entries(options))if(list.find(item=>item.id===result[key]).xp>total)result[key]=list[0].id;
    return result;
  }
  function fromMetadata(meta={}){return clean(Object.fromEntries(Object.entries(metadataKeys).map(([key,name])=>[key,meta?.[name]])));}
  // Public RPCs supply only sanitized cosmetics and their minimum render threshold,
  // never another player's auth metadata or total XP. Legacy payloads stay valid.
  const frameXp=Object.freeze({level:0,blue:100,green:500,copper:1500,gold:3000,orbit:6000});
  const profileTitles=Object.freeze({explorer:'Explorer',curious:'Curious Mind',detective:'Puzzle Detective',thinker:'Deep Thinker',sage:'BrainiLab Sage'});
  function fromPublicStyle(style){
    if(!style||typeof style!=='object'||Array.isArray(style))return {};
    const value=Number(style.render_xp),renderXp=Number.isFinite(value)?Math.max(0,Math.min(9000,value)):0;
    const frame=Object.hasOwn(frameXp,style.frame)&&renderXp>=frameXp[style.frame]?style.frame:'level';
    return {avatarDesign:style.design?.mode==='built'?available(style.design,renderXp):null,
      avatarRenderXp:renderXp,avatarFrame:frame,
      profileTitle:typeof style.title==='string'&&Object.hasOwn(profileTitles,style.title)?style.title:'none'};
  }
  const color=(kind,id)=>options[kind].find(item=>item.id===id).color;
  function star(cx,cy,r=13){
    return Array.from({length:10},(_,i)=>{const a=(i*36-90)*Math.PI/180,n=i%2?r*.46:r;return `${(cx+Math.cos(a)*n).toFixed(2)},${(cy+Math.sin(a)*n).toFixed(2)}`;}).join(' ');
  }
  function accessory(kind,id){
    if(kind==='glasses'){
      const arms='<path d="M65 94 53 89M135 94 147 89" fill="none" stroke="#302c46" stroke-width="4" stroke-linecap="round"/>';
      if(id==='round')return `${arms}<g fill="#fff" fill-opacity=".17" stroke="#302c46" stroke-width="4"><circle cx="80" cy="96" r="14"/><circle cx="120" cy="96" r="14"/><path d="M94 95Q100 91 106 95" fill="none"/></g>`;
      if(id==='square')return `${arms}<g fill="#fff" fill-opacity=".18" stroke="#286756" stroke-width="4"><rect x="65" y="84" width="29" height="25" rx="5"/><rect x="106" y="84" width="29" height="25" rx="5"/><path d="M94 94Q100 90 106 94" fill="none"/></g><path d="M139 87 143 91 148 79H156" fill="none" stroke="#286756" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      if(id==='sun')return `${arms}<g stroke="#302c46" stroke-width="4" stroke-linejoin="round"><path d="M63 88H95L92 105Q80 115 67 104ZM105 88H137L133 104Q120 115 108 105Z" fill="#302c46"/><path d="M95 94Q100 91 105 94" fill="none"/></g><path d="M69 93H82M111 93H122" stroke="#fff" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"/>`;
      if(id==='star')return `${arms}<g fill="#f6cc4a" fill-opacity=".65" stroke="#7b6022" stroke-width="3" stroke-linejoin="round"><polygon points="${star(80,96)}"/><polygon points="${star(120,96)}"/><path d="M94 96H106"/></g>`;
      if(id==='visor')return '<path d="M55 89Q100 77 145 89L138 110Q100 119 62 110Z" fill="#347f8a" stroke="#263f60" stroke-width="4" stroke-linejoin="round"/><path d="M65 91Q100 84 135 91L131 104Q100 110 69 104Z" fill="#a7e6de"/><path d="M75 91 82 105M87 89 94 107" stroke="#fff" stroke-opacity=".6" stroke-width="4"/><path d="M52 90H61M139 90H148" stroke="#263f60" stroke-width="4" stroke-linecap="round"/>';
      if(id==='monocle')return '<circle cx="119" cy="97" r="17" fill="#eff9ff" fill-opacity=".14" stroke="#997025" stroke-width="4"/><path d="M109 89 116 85" stroke="#fff7d5" stroke-width="3" stroke-linecap="round"/><path d="M132 109Q151 122 142 140Q137 149 149 155" fill="none" stroke="#997025" stroke-width="2.5" stroke-linecap="round"/><circle cx="149" cy="156" r="3" fill="#e5bf5c"/>';
      if(id==='doughnut')return `${arms}<g fill="#fff" fill-opacity=".12" stroke="#c58c54" stroke-width="10"><circle cx="80" cy="96" r="13"/><circle cx="120" cy="96" r="13"/></g><path d="M63 92Q66 76 80 78Q94 77 97 92M103 92Q106 76 120 78Q134 77 137 92" fill="none" stroke="#e88fa7" stroke-width="6" stroke-linecap="round"/><path d="M71 80 73 84M85 81 88 78M111 80 114 83M125 80 128 77" stroke="#fff0bd" stroke-width="2.5" stroke-linecap="round"/><path d="M97 95H103" stroke="#6b4a39" stroke-width="4"/>`;
      if(id==='heart')return `${arms}<g fill="#f1a3b9" fill-opacity=".18" stroke="#a94068" stroke-width="3.5" stroke-linejoin="round"><path d="M80 112 64 97C53 86 68 75 80 86C92 75 107 86 96 97ZM120 112 104 97C93 86 108 75 120 86C132 75 147 86 136 97Z"/><path d="M98 94Q100 92 102 94" fill="none"/></g><path d="M66 87Q70 82 74 86M106 87Q110 82 114 86" fill="none" stroke="#fff4ed" stroke-width="2.5" stroke-linecap="round"/>`;
      if(id==='camera')return `${arms}<g fill="#579588" fill-opacity=".25" stroke="#285d59" stroke-width="3.5" stroke-linejoin="round"><rect x="61" y="83" width="37" height="29" rx="7"/><rect x="102" y="83" width="37" height="29" rx="7"/><path d="M98 95Q100 93 102 95" fill="none"/></g><path d="M67 82V78H77V82M125 82V78H135V82" fill="#d49a55" stroke="#285d59" stroke-width="2.5" stroke-linejoin="round"/><g fill="#fff" fill-opacity=".12" stroke="#285d59" stroke-width="3"><circle cx="80" cy="97" r="10"/><circle cx="120" cy="97" r="10"/></g><path d="M73 91 77 88M113 91 117 88" stroke="#fff4df" stroke-width="2" stroke-linecap="round"/><circle cx="94" cy="87" r="1.5" fill="#f2c969"/><circle cx="135" cy="87" r="1.5" fill="#f2c969"/>`;
    }
    if(kind==='hat'){
      if(id==='beanie')return '<path d="M54 48Q53 12 100 12T146 48" fill="#d66c3e"/><path d="M64 42Q67 21 82 19M84 42 87 16M103 42 103 14M123 42 118 17M138 42 132 25" fill="none" stroke="#bc5331" stroke-width="3"/><rect x="49" y="39" width="102" height="21" rx="8" fill="#e8844e"/><rect x="92" y="43" width="18" height="12" rx="3" fill="#ffdc86"/>';
      if(id==='cap')return '<path d="M55 48Q52 15 99 15Q137 15 145 48Z" fill="#3e856c"/><path d="M100 18Q116 26 116 46M60 46H145" fill="none" stroke="#286a56" stroke-width="3"/><path d="M103 43Q145 37 164 51Q152 62 109 55Z" fill="#286a56"/><circle cx="94" cy="30" r="5" fill="#ffdd75"/>';
      if(id==='wizard')return `<path d="M56 52 105 5 144 53Z" fill="#4b4288"/><path d="M46 52Q98 39 156 53Q154 67 101 65Q47 65 46 52Z" fill="#342e6b"/><polygon points="${star(105,32,8)}" fill="#ffdb66"/><circle cx="86" cy="45" r="3" fill="#ffdb66"/>`;
      if(id==='egg')return '<path d="M49 48Q39 32 58 27Q66 8 83 20Q104 6 117 20Q142 13 146 31Q166 39 148 53Q142 65 123 58Q105 67 89 58Q64 67 55 54Z" fill="#fff7e8" stroke="#dfcbaa" stroke-width="2"/><ellipse cx="102" cy="38" rx="20" ry="16" fill="#f4bf41"/><path d="M91 32Q96 26 104 28" fill="none" stroke="#ffe48a" stroke-width="4" stroke-linecap="round"/>';
      if(id==='cloud')return '<path d="M52 51Q42 28 65 27Q73 9 94 21Q116 7 130 27Q154 25 153 45Q163 62 139 63H62Q45 63 52 51Z" fill="#eff7ff" stroke="#a7b8d0" stroke-width="2"/><path d="M98 50 86 67H99L94 80 114 59H101L110 50Z" fill="#f5c94e" stroke="#b58a28" stroke-width="1.5" stroke-linejoin="round"/><path d="M61 69 57 76M139 69 135 76" stroke="#669fc4" stroke-width="3" stroke-linecap="round"/>';
      if(id==='graduate')return '<path d="M75 34H129V57Q102 69 75 57Z" fill="#423d70"/><path d="M38 30 101 9 165 30 101 52Z" fill="#302b58" stroke="#6e659d" stroke-width="2" stroke-linejoin="round"/><path d="M101 30 146 39V65" fill="none" stroke="#efc653" stroke-width="3" stroke-linecap="round"/><path d="M142 64H150L153 77H139Z" fill="#efc653"/><circle cx="101" cy="30" r="4" fill="#efc653"/>';
      if(id==='corn')return '<ellipse cx="101" cy="30" rx="22" ry="27" fill="#f5c34a" stroke="#c28d2e" stroke-width="2"/><path d="M83 17H119M80 28H122M81 39H121M93 5V52M104 4V54M114 9V48" stroke="#d39a30" stroke-width="2" fill="none"/><path d="M101 61Q68 64 53 31Q82 31 101 61Z" fill="#548b48" stroke="#376b3b" stroke-width="2"/><path d="M100 61Q121 25 150 29Q139 65 100 61Z" fill="#77a956" stroke="#376b3b" stroke-width="2"/><path d="M63 39Q84 43 100 59M138 37Q117 45 101 59" fill="none" stroke="#abc978" stroke-width="2.5" stroke-linecap="round"/>';
      if(id==='wave')return '<path d="M48 58Q63 51 70 31Q78 5 109 9Q141 12 137 34Q133 46 118 42Q132 27 115 25Q96 25 106 43Q118 58 154 53L153 65Q96 72 48 65Z" fill="#5caec1" stroke="#327a98" stroke-width="2" stroke-linejoin="round"/><path d="M64 44Q71 13 100 10Q129 7 137 25Q128 13 112 17Q91 22 99 40Q106 52 128 55" fill="none" stroke="#e7f7f8" stroke-width="6" stroke-linecap="round"/><path d="M57 59Q82 65 103 58M115 63Q133 67 146 60" fill="none" stroke="#b6e1e3" stroke-width="3" stroke-linecap="round"/>';
      if(id==='toast')return '<path d="M71 29Q62 20 71 12Q83 1 100 7Q117 1 129 12Q138 20 129 29V58Q100 65 71 58Z" fill="#bf834d" stroke="#8b5737" stroke-width="2.5" stroke-linejoin="round"/><path d="M77 29Q69 21 77 16Q87 9 100 14Q113 9 123 16Q131 21 123 29V53Q100 58 77 53Z" fill="#ffe0a0"/><path d="M87 27Q94 20 103 23" fill="none" stroke="#fff2c6" stroke-width="3" stroke-linecap="round"/><g fill="#6b4b38"><circle cx="90" cy="36" r="2.5"/><circle cx="111" cy="36" r="2.5"/></g><path d="M94 44Q100 49 107 44" fill="none" stroke="#6b4b38" stroke-width="2" stroke-linecap="round"/><ellipse cx="84" cy="42" rx="4" ry="2" fill="#e3a16d"/><ellipse cx="117" cy="42" rx="4" ry="2" fill="#e3a16d"/>';
      if(id==='coffee')return '<path d="M93 16Q86 11 92 5M108 16Q115 11 109 5" fill="none" stroke="#a7a9b8" stroke-width="2.5" stroke-linecap="round"/><path d="M128 29H135Q148 29 145 41Q143 50 128 48" fill="none" stroke="#a3523a" stroke-width="6" stroke-linecap="round"/><path d="M72 27H130L126 52Q101 64 77 52Z" fill="#e58a62" stroke="#a3523a" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="101" cy="27" rx="29" ry="9" fill="#fff5de" stroke="#a3523a" stroke-width="2.5"/><ellipse cx="101" cy="27" rx="22" ry="5.5" fill="#c38b57"/><path d="M101 30Q88 24 94 22Q98 20 101 24Q105 20 109 22Q115 24 101 30Z" fill="#fff5de"/><path d="M79 35 82 47" stroke="#fbb794" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="101" cy="60" rx="40" ry="4" fill="#f2c796" stroke="#a3523a" stroke-width="2"/>';
    }
    if(kind==='prop'){
      if(id==='icepop')return '<g transform="rotate(14 158 151)"><rect x="153" y="148" width="10" height="31" rx="5" fill="#c18d56"/><path d="M139 119Q139 104 158 104T177 119V151Q158 162 139 151Z" fill="#ef7095"/><path d="M139 130H177V144H139Z" fill="#fff4d6"/><path d="M139 144H177V151Q158 162 139 151Z" fill="#6ab9d5"/><path d="M147 116V128" stroke="#fff" stroke-opacity=".6" stroke-width="4" stroke-linecap="round"/></g><path d="M27 65V79M20 72H34M22 67 32 77M22 77 32 67" stroke="#78b8cb" stroke-width="2" stroke-linecap="round"/>';
      if(id==='bulb')return '<g transform="rotate(12 160 135)"><path d="M147 137Q146 130 141 124Q129 103 147 94Q164 84 176 102Q183 116 171 128Q168 132 168 137Z" fill="#ffda6d" stroke="#b88b23" stroke-width="3"/><path d="M150 139H166M151 146H165M154 152H162M154 135 150 113 162 116 161 135" fill="none" stroke="#896b2d" stroke-width="3" stroke-linecap="round"/><path d="M135 86 130 80M158 78V70M180 86 185 80" stroke="#d6a72c" stroke-width="3" stroke-linecap="round"/></g>';
      if(id==='pencil')return '<g transform="rotate(18 158 144)"><path d="M148 119H168V163L158 183 148 163Z" fill="#f5c75c" stroke="#8d6a31" stroke-width="2"/><path d="M149 163H167L158 183Z" fill="#e7bf94"/><path d="M154 175 158 183 162 175Z" fill="#41384c"/><rect x="147" y="106" width="22" height="14" rx="5" fill="#e98c9e"/><path d="M148 124H168M158 128V160" stroke="#b48b32" stroke-width="3"/></g>';
      if(id==='cookie')return '<g transform="rotate(12 158 137)"><path d="M174 115Q179 116 181 122Q171 126 182 133Q184 150 170 158Q150 168 138 150Q126 132 140 118Q155 104 174 115Z" fill="#d7a15f" stroke="#a77342" stroke-width="2"/><g fill="#825133"><circle cx="147" cy="119" r="3"/><circle cx="171" cy="144" r="3"/><circle cx="147" cy="148" r="3"/><circle cx="160" cy="155" r="2.5"/></g><g fill="none" stroke="#45394b" stroke-width="2"><circle cx="148" cy="132" r="6"/><circle cx="165" cy="132" r="6"/><path d="M154 132H159M153 143Q158 147 163 143" stroke-linecap="round"/></g><circle cx="148" cy="132" r="1.5" fill="#45394b"/><circle cx="165" cy="132" r="1.5" fill="#45394b"/></g>';
      if(id==='peas')return '<g transform="rotate(16 158 138)"><path d="M160 102Q185 125 169 159L156 177Q136 151 140 128Q142 110 160 102Z" fill="#568b45" stroke="#366b39" stroke-width="2"/><path d="M158 108Q148 138 158 168" fill="none" stroke="#a5ce70" stroke-width="3"/><g fill="#a5cd72" stroke="#42733b" stroke-width="1.5"><circle cx="158" cy="122" r="9"/><circle cx="158" cy="141" r="9"/><circle cx="159" cy="159" r="8"/></g><path d="M153 121 155 122 157 121M160 121 162 122 164 121M155 140 157 141M161 140 163 141M156 145Q159 148 162 145" fill="none" stroke="#365d36" stroke-width="1.4" stroke-linecap="round"/><path d="M160 103Q157 94 165 94" fill="none" stroke="#366b39" stroke-width="3" stroke-linecap="round"/></g>';
      if(id==='rocket')return '<g transform="rotate(12 159 139)"><path d="M149 153 144 170 154 165M168 153 175 169 164 166" fill="#d87742" stroke="#9d4b30" stroke-width="2" stroke-linejoin="round"/><path d="M153 161Q146 174 159 182Q172 175 165 161Z" fill="#f2bc51"/><path d="M156 164Q152 174 159 177Q166 174 162 164Z" fill="#fff0b0"/><path d="M149 154Q139 122 158 98Q179 120 168 154L166 163H152Z" fill="#f8f0df" stroke="#85879f" stroke-width="2"/><path d="M147 117Q151 104 158 98Q168 108 171 118Z" fill="#d87742"/><circle cx="159" cy="134" r="8" fill="#79bfd1" stroke="#435673" stroke-width="3"/><path d="M153 154H166" stroke="#435673" stroke-width="3"/></g>';
      if(id==='book')return '<path d="M135 142Q148 137 160 145Q171 135 184 139L181 175Q170 171 160 180Q149 173 136 177Z" fill="#51477e"/><path d="M138 139Q149 136 160 142Q172 132 181 136L179 170Q169 166 160 176Q150 169 139 173Z" fill="#fff5dc" stroke="#cbbba0" stroke-width="1.5"/><path d="M160 143V174M143 147 153 150M143 154 153 157M167 145 176 141M167 152 176 148" stroke="#c8b796" stroke-width="1.5" stroke-linecap="round"/><path d="M145 148Q132 143 139 132Q148 122 147 114" fill="none" stroke="#578945" stroke-width="10" stroke-linecap="round"/><circle cx="147" cy="113" r="10" fill="#99c970" stroke="#578945" stroke-width="2"/><circle cx="144" cy="111" r="2" fill="#354437"/><circle cx="151" cy="111" r="2" fill="#354437"/><path d="M144 117Q148 121 152 116" fill="none" stroke="#354437" stroke-width="1.5" stroke-linecap="round"/>';
      if(id==='train')return '<g transform="rotate(10 160 145)"><path d="M136 145H172V163H136Z" fill="#4b8d7d" stroke="#315e5e" stroke-width="2"/><path d="M157 123H174V151H157Z" fill="#d37a48" stroke="#8a5237" stroke-width="2"/><path d="M155 121H178" stroke="#51465c" stroke-width="5" stroke-linecap="round"/><rect x="160" y="127" width="10" height="12" rx="2" fill="#c9e7e9"/><path d="M139 144V131H147V144" fill="#51465c"/><path d="M134 162H179L183 167H134Z" fill="#51465c"/><g fill="#51465c" stroke="#e8bf60" stroke-width="2.5"><circle cx="143" cy="164" r="7"/><circle cx="165" cy="164" r="8"/></g><path d="M143 123Q137 115 145 110Q151 107 146 101" fill="none" stroke="#c6d8e1" stroke-width="6" stroke-linecap="round"/><circle cx="140" cy="92" r="5" fill="#dbe7ec"/></g>';
      if(id==='roll')return '<g transform="rotate(12 159 145)"><ellipse cx="159" cy="153" rx="26" ry="23" fill="#c68d55" stroke="#95623d" stroke-width="2"/><ellipse cx="159" cy="143" rx="26" ry="22" fill="#ebbb7d" stroke="#a47041" stroke-width="2"/><path d="M139 147Q133 128 151 125Q173 119 179 137Q185 154 166 160Q145 165 142 148Q140 134 154 131Q167 128 171 139Q175 150 164 152Q154 154 151 146Q148 139 157 138Q163 137 163 143" fill="none" stroke="#a36b3d" stroke-width="4" stroke-linecap="round"/><path d="M140 133 147 158M152 124 162 160M168 124 177 149" stroke="#fff0d8" stroke-width="4" stroke-linecap="round" opacity=".85"/></g>';
      if(id==='owl')return '<path d="M147 164H153M164 164H170" stroke="#b57a36" stroke-width="3.5" stroke-linecap="round"/><path d="M139 125 138 108 150 115Q159 110 168 115L179 108 177 125Q186 153 168 162Q150 169 139 153Q132 140 139 125Z" fill="#9d7558" stroke="#6c513f" stroke-width="2.5" stroke-linejoin="round"/><path d="M146 140Q157 132 171 140L170 156Q158 166 146 156Z" fill="#e8cda4"/><path d="M140 139Q142 153 148 155M176 137Q177 151 170 156" fill="none" stroke="#74553f" stroke-width="3" stroke-linecap="round"/><g fill="#fff5dc" stroke="#74553f" stroke-width="2"><circle cx="150" cy="129" r="9"/><circle cx="168" cy="129" r="9"/></g><g fill="#323047"><circle cx="151" cy="130" r="3.5"/><circle cx="167" cy="130" r="3.5"/></g><g fill="#fff"><circle cx="152" cy="129" r="1"/><circle cx="168" cy="129" r="1"/></g><path d="M155 138H163L159 144Z" fill="#dfaa48" stroke="#9f6c30" stroke-width="1.5" stroke-linejoin="round"/><path d="M152 149 155 152 158 149M161 153 164 156 167 153" fill="none" stroke="#b08c65" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
      if(id==='nacho')return '<g transform="rotate(10 158 142)"><path d="M158 109Q159 107 161 110L180 157Q181 161 178 161L137 161Q133 161 135 157Z" fill="#dfa447" stroke="#a7712e" stroke-width="2.5" stroke-linejoin="round"/><path d="M159 115 177 151Q169 148 169 156Q169 162 164 159L162 150Q160 146 156 151Q151 157 151 149Q150 144 141 151Z" fill="#f7cc55"/><path d="M159 120 165 132" stroke="#ffe78c" stroke-width="3" stroke-linecap="round"/><g fill="#ba7c30"><circle cx="141" cy="157" r="1.5"/><circle cx="153" cy="156" r="1.5"/><circle cx="176" cy="155" r="1.5"/><circle cx="167" cy="143" r="1.5"/></g><path d="M151 139 153 141 155 139M164 138 166 140 168 138M155 146Q159 150 163 146" fill="none" stroke="#765232" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>';
    }
    return '';
  }
  function markup(value,xp=0){
    const v=available(value,xp),skin=color('skin',v.skin),hair=color('hairColor',v.hairColor),shirt=color('shirt',v.shirt),bg=color('background',v.background);
    const dark=v.skin==='umber'||v.skin==='ebony',mouth=dark?'#efbdab':'#673d3c',nose=dark?'#f4d0b0':'#302c46';
    const back={bob:`<path d="M53 87Q46 39 101 38Q154 36 148 98L150 139Q99 158 49 138Z" fill="${hair}"/>`,
      ponytail:`<ellipse cx="145" cy="108" rx="22" ry="42" fill="${hair}"/><path d="M131 75Q144 65 157 77" fill="none" stroke="#e9bd5e" stroke-width="5"/>`,
      waves:`<path d="M52 81Q46 36 101 35Q155 35 148 84Q167 105 152 122Q171 144 151 159Q142 173 126 159H75Q57 175 44 157Q29 143 47 121Q31 101 52 81Z" fill="${hair}"/>`}[v.hair]||'';
    const hairFront={
      sweep:`<path d="M58 91Q45 36 104 36Q150 35 143 86L131 71Q97 84 77 62Q67 78 58 91Z" fill="${hair}"/>`,
      curls:`<g fill="${hair}"><circle cx="68" cy="64" r="18"/><circle cx="82" cy="48" r="18"/><circle cx="105" cy="46" r="19"/><circle cx="126" cy="53" r="18"/><circle cx="139" cy="69" r="15"/></g>`,
      bob:`<path d="M57 85Q53 38 101 38Q151 39 144 89L130 69Q114 79 94 64Q80 81 57 85Z" fill="${hair}"/>`,
      crop:`<path d="M59 75Q61 37 101 39Q140 40 142 77Q101 58 59 75Z" fill="${hair}"/>`,bald:'',
      ponytail:`<path d="M57 88Q47 38 101 36Q150 37 143 87L132 71Q104 80 81 62Q71 79 57 88Z" fill="${hair}"/>`,
      waves:`<path d="M54 89Q49 37 101 35Q152 37 147 88Q133 93 131 70Q112 82 92 61Q80 83 65 79L62 115Q48 111 54 89Z" fill="${hair}"/>`,
      braids:`<path d="M57 86Q49 37 100 36Q152 37 143 86L131 69Q100 78 76 65L66 84Z" fill="${hair}"/><g fill="${hair}"><path d="M57 78Q44 89 52 99Q42 108 51 118Q42 130 50 139Q44 149 55 154Q68 149 61 138Q70 127 61 117Q70 107 61 98Q70 87 57 78Z"/><path d="M57 78Q44 89 52 99Q42 108 51 118Q42 130 50 139Q44 149 55 154Q68 149 61 138Q70 127 61 117Q70 107 61 98Q70 87 57 78Z" transform="translate(200 0) scale(-1 1)"/></g><path d="M50 147H61M139 147H150" stroke="#e9bd5e" stroke-width="4" stroke-linecap="round"/>`
    }[v.hair];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Your illustrated BrainiLab avatar" class="braini-built-avatar"><rect width="200" height="200" rx="100" fill="${bg}"/>${back}<path d="M29 201Q30 153 71 151H129Q169 153 171 201Z" fill="${shirt}"/><path d="M81 130H119V159Q100 176 81 159Z" fill="${skin}"/><path d="M81 136Q100 149 119 136V148Q100 161 81 148Z" fill="#302c46" opacity=".1"/><g fill="${skin}"><ellipse cx="59" cy="101" rx="9" ry="12"/><ellipse cx="141" cy="101" rx="9" ry="12"/><path d="M59 78Q60 48 100 48Q140 48 141 78V108Q139 141 100 147Q62 141 59 108Z"/></g>${hairFront}<path d="M73 84Q81 80 89 84M111 84Q119 80 127 84" fill="none" stroke="${hair}" stroke-width="3.5" stroke-linecap="round"/><g fill="#fff8ed"><ellipse cx="81" cy="97" rx="5.4" ry="6.5"/><ellipse cx="119" cy="97" rx="5.4" ry="6.5"/></g><g fill="#302c46"><ellipse cx="81" cy="97" rx="3.7" ry="5"/><ellipse cx="119" cy="97" rx="3.7" ry="5"/></g><path d="M100 100 96 113H103" fill="none" stroke="${nose}" stroke-opacity=".35" stroke-width="2.5" stroke-linecap="round"/><path d="M87 123Q100 136 113 123" fill="none" stroke="${mouth}" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="74" cy="114" rx="7" ry="3" fill="#d77971" opacity=".24"/><ellipse cx="126" cy="114" rx="7" ry="3" fill="#d77971" opacity=".24"/>${accessory('glasses',v.glasses)}${accessory('hat',v.hat)}${accessory('prop',v.prop)}</svg>`;
  }
  return Object.freeze({options,metadataKeys,clean,available,fromMetadata,fromPublicStyle,frameXp,profileTitles,markup});
})();

/* ===== data.js ===== */


/*
  BrainiLab Data Layer — local-first player state
  --------------------------------------------------------
  Purpose:
  - Keep game UI independent from backend implementation.
  - Provide stable local-first contracts for player data, sessions,
    sharing and analytics.
  - Cloud-backed public data is supplied by Supabase adapters.
  - Never seed public-facing player or leaderboard statistics.
*/
window.BrainiData = (function(){
  const STORAGE_KEY = "brainilab.mock.v1"; // retained for backwards-compatible local progress

  const GAME_DEFS = {
    brainmix: {
      id:"brainmix", name:"Brain Mix", route:"/daily-quiz/", icon:"🧠",
      metric:"score", maxScore:10000, daily:true
    },
    flagdash: {
      id:"flagdash", name:"Flag Dash", route:"/geography/world-flags-quiz/", icon:"🚩",
      metric:"correct", maxScore:null, daily:false, legacy:true
    },
    orderup: {
      id:"orderup", name:"Order Up", route:"/games/order-up/", icon:"↕️",
      metric:"score", maxScore:2500, daily:true
    },
    maphunt: {
      id:"maphunt", name:"Map Hunt", route:"/games/topic-rush/", icon:"🗺️",
      metric:"score", maxScore:6000, daily:false, legacy:true
    },
    topicrush: {
      id:"topicrush", name:"Topic Rush", route:"/games/topic-rush/", icon:"⚡",
      metric:"score", maxScore:2500, daily:true
    },
    brainiword: {
      id:"brainiword", name:"BrainiWord", route:"/games/brainiword/", icon:"🔤",
      metric:"attempts", maxScore:5, daily:true
    },
    worldflags: {
      id:"worldflags", name:"World Flags Quiz", route:"/geography/world-flags-quiz/", icon:"🚩",
      metric:"score", maxScore:20, daily:false
    },
    worldcapitals: {
      id:"worldcapitals", name:"World Capitals Quiz", route:"/geography/world-capitals-quiz/", icon:"🌍",
      metric:"score", maxScore:20, daily:false
    },
    science: {
      id:"science", name:"Science Quiz", route:"/science/science-quiz/", icon:"🔬",
      metric:"score", maxScore:20, daily:false
    },
    history: {
      id:"history", name:"History Quiz", route:"/history/history-quiz/", icon:"📜",
      metric:"score", maxScore:20, daily:false
    },
    sports: {
      id:"sports", name:"Sports Quiz", route:"/sports/sports-quiz/", icon:"⚽",
      metric:"score", maxScore:20, daily:false
    },
    generalknowledge: {
      id:"generalknowledge", name:"General Knowledge Quiz", route:"/general-knowledge/general-knowledge-quiz/", icon:"🧠",
      metric:"score", maxScore:20, daily:false
    },
    connections: {
      id:"connections", name:"Connections", route:"/games/connections/", icon:"🔗",
      metric:"score", maxScore:3000, daily:false
    },
    survival: {
      id:"survival", name:"Survival", route:"/games/survival/", icon:"🛡️",
      metric:"score", maxScore:null, daily:false
    },
    oddoneout: {
      id:"oddoneout", name:"Odd One Out", route:"/games/odd-one-out/", icon:"◉",
      metric:"score", maxScore:1000, daily:false
    },
    higherlower: {
      id:"higherlower", name:"Higher or Lower", route:"/games/higher-lower/", icon:"↕️",
      metric:"score", maxScore:1700, daily:false
    },
    mathrush: {
      id:"mathrush", name:"Math Rush", route:"/games/math-rush/", icon:"⚡",
      metric:"score", maxScore:null, daily:false
    },
    numberroute: {
      id:"numberroute", name:"Number Route", route:"/games/number-route/", icon:"➗",
      metric:"score", maxScore:2500, daily:false
    },
    sequence: {
      id:"sequence", name:"Sequence", route:"/games/sequence/", icon:"🔢",
      metric:"score", maxScore:2500, daily:false
    }
  };

  const DAILY_NUMBER_BASE = 1;
  const DAILY_EPOCH = Date.UTC(2026,7,29); // official public Daily #1

  function todayKey(){
    return new Date().toISOString().slice(0,10);
  }

  function dailyNumberForDate(dateValue){
    const raw=String(dateValue||"").slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const parts=raw.split("-").map(Number);
    const utc=Date.UTC(parts[0],parts[1]-1,parts[2]);
    const check=new Date(utc).toISOString().slice(0,10);
    if(check!==raw) return null;
    return DAILY_NUMBER_BASE + Math.floor((utc-DAILY_EPOCH)/86400000);
  }

  function dailyNumber(){
    return dailyNumberForDate(todayKey());
  }

  const DAILY_ROTATION_START="2026-08-31";
  const DAILY_VARIABLE_PAIRS=[
    ["orderup","sequence"],
    ["topicrush","numberroute"],
    ["connections","mathrush"],
    ["oddoneout","higherlower"],
    ["orderup","numberroute"],
    ["sequence","mathrush"],
    ["topicrush","higherlower"],
    ["connections","oddoneout"],
    ["orderup","mathrush"],
    ["numberroute","higherlower"],
    ["sequence","oddoneout"],
    ["topicrush","connections"],
    ["orderup","higherlower"],
    ["mathrush","oddoneout"],
    ["numberroute","connections"],
    ["sequence","topicrush"],
    ["orderup","oddoneout"],
    ["higherlower","connections"],
    ["mathrush","topicrush"],
    ["numberroute","sequence"],
    ["orderup","connections"],
    ["oddoneout","topicrush"],
    ["higherlower","sequence"],
    ["mathrush","numberroute"],
    ["orderup","topicrush"],
    ["connections","sequence"],
    ["oddoneout","numberroute"],
    ["higherlower","mathrush"]
  ];

  function dateForDailyNumber(number){
    const n=Number(number);
    if(!Number.isFinite(n)) return todayKey();
    return new Date(DAILY_EPOCH+(n-DAILY_NUMBER_BASE)*86400000).toISOString().slice(0,10);
  }

  function dailyGameIdsForDate(dateValue=todayKey()){
    const next=window.BrainiDailyRules?.lineup(dateValue);if(next)return next;
    const date=String(dateValue||todayKey()).slice(0,10);
    if(date<DAILY_ROTATION_START){
      return ["brainmix","orderup","topicrush","brainiword"];
    }
    const number=dailyNumberForDate(date)||DAILY_NUMBER_BASE;
    const pairIndex=((number-3)%DAILY_VARIABLE_PAIRS.length+DAILY_VARIABLE_PAIRS.length)%DAILY_VARIABLE_PAIRS.length;
    const pair=DAILY_VARIABLE_PAIRS[pairIndex];
    return ["brainmix",pair[0],pair[1],"brainiword"];
  }

  function dailyGameIdsForNumber(number){
    return dailyGameIdsForDate(dateForDailyNumber(number));
  }

  function emptyDailyBreakdown(dateValue=todayKey()){
    const out={};
    dailyGameIdsForDate(dateValue).forEach(id=>{
      out[id]={points:0,max:window.BrainiDailyRules?.max(id,dateValue)??2500,label:"Not played yet"};
    });
    return out;
  }

  function pastDailyDate(dateValue){
    const raw=String(dateValue||"").slice(0,10);
    const number=dailyNumberForDate(raw);
    return Number.isFinite(number) && number>=DAILY_NUMBER_BASE && raw<todayKey()
      ? raw
      : null;
  }

  function makeAnonId(){
    return "anon_"+Math.random().toString(36).slice(2,10)+Date.now().toString(36);
  }

  const defaultState = {
    version:11,
    auth:{
      status:"guest",
      anonymousPlayerId:makeAnonId(),
      user:null,
      provider:null,
      cloudSync:false,
      leaderboard:{
        enabled:false,
        displayName:null
      }
    },
    social:{
      friendCode:"BRN-LOCAL",
      friends:[],
      pendingFriendRequests:[],
      outgoingFriendRequests:[],
      groups:[],
      groupInvites:[]
    },
    player:{
      id:"local-player-001",
      displayName:"You",
      avatarInitial:"B",
      countryCode:"",
      createdAt:null,
      currentStreak:0,
      bestStreak:0,
      xp:0,
      level:1,
      totalQuestions:0,
      totalGames:0,
      totalShares:0,
      fullDailyCount:0,
      favoriteCategory:null,
      categoryAccuracy:{}
    },
    daily:{
      key:todayKey(),
      number:dailyNumber(),
      completedGames:[],
      brainScore:0,
      brainScorePercentile:null,
dailyBreakdown:emptyDailyBreakdown()
    },
    personalBests:{},
    anytimeHistory:{},
    recentResults:[],
    shareEvents:[],
    analytics:[]
  };

  const collective = {
    generatedAt:null,
    today:{
      activePlayers:null,
      gamesPlayed:null,
      totalAnswers:null,
      shares:null,
      avgGamesPerPlayer:null
    },
    games:{},
    leaderboards:{}
  };

  function clone(x){ return JSON.parse(JSON.stringify(x)); }

  function loadState(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw) return clone(defaultState);
      const parsed=JSON.parse(raw);
      if(!parsed.auth){
        parsed.auth=clone(defaultState.auth);
      }else{
        parsed.auth=Object.assign(clone(defaultState.auth),parsed.auth);
        parsed.auth.leaderboard=Object.assign(clone(defaultState.auth.leaderboard),parsed.auth.leaderboard||{});
      }
      if(!parsed.player) parsed.player=clone(defaultState.player);
      if(!parsed.anytimeHistory || typeof parsed.anytimeHistory!=="object") parsed.anytimeHistory={};
      if(!parsed.social){
        parsed.social=clone(defaultState.social);
      }else{
        parsed.social=Object.assign(clone(defaultState.social),parsed.social);
        parsed.social.friends=Array.isArray(parsed.social.friends)?parsed.social.friends:clone(defaultState.social.friends);
        parsed.social.pendingFriendRequests=Array.isArray(parsed.social.pendingFriendRequests)?parsed.social.pendingFriendRequests:[];
        parsed.social.outgoingFriendRequests=Array.isArray(parsed.social.outgoingFriendRequests)?parsed.social.outgoingFriendRequests:[];
        parsed.social.groups=Array.isArray(parsed.social.groups)?parsed.social.groups:clone(defaultState.social.groups);
        parsed.social.groupInvites=Array.isArray(parsed.social.groupInvites)?parsed.social.groupInvites:[];
      }
      if(parsed.daily?.key!==todayKey()){
        parsed.daily={
key:todayKey(),number:dailyNumber(),completedGames:[],brainScore:0,brainScorePercentile:null,
          dailyBreakdown:emptyDailyBreakdown()
        };
      }else if(Number(parsed.daily?.number)!==dailyNumber()){
        // V31 official-launch migration: development Daily #143 becomes public Daily #1
        // without erasing same-day guest progress already stored in this browser.
        const oldNumber=Number(parsed.daily?.number||0);
        const newNumber=dailyNumber();
        parsed.daily.number=newNumber;

        if(Array.isArray(parsed.recentResults)){
          parsed.recentResults.forEach(result=>{
            const playedDate=String(result.playedAt||"").slice(0,10);
            if(
              playedDate===todayKey() &&
              ["brainmix","orderup","flagdash","topicrush","brainiword","maphunt"].includes(result.gameId) &&
              Number(result.dailyNumber)===oldNumber
            ){
              result.dailyNumber=newNumber;
            }
          });
        }
      }

      // V34: Order Up replaces Flag Dash in the Daily lineup.
      // Preserve the historical Flag Dash result, but do not let it occupy
      // today's new Order Up slot.
      if(parsed.daily?.key===todayKey()){
        parsed.daily.dailyBreakdown=parsed.daily.dailyBreakdown||{};

        if(!parsed.daily.dailyBreakdown.orderup){
          parsed.daily.dailyBreakdown.orderup={
            points:0,
            max:2500,
            label:"Not played yet"
          };
        }

        const oldFlagPoints=Number(
          parsed.daily.dailyBreakdown.flagdash?.points||0
        );

        if(Array.isArray(parsed.daily.completedGames)){
          parsed.daily.completedGames=parsed.daily.completedGames
            .filter(id=>id!=="flagdash");
        }

        if(oldFlagPoints>0){
          parsed.daily.brainScore=Math.max(
            0,
            Number(parsed.daily.brainScore||0)-oldFlagPoints
          );
        }

        delete parsed.daily.dailyBreakdown.flagdash;
      }

      const resultOwner=parsed.auth?.user?.id||parsed.auth?.guestUserId||null;
      (parsed.recentResults||[]).forEach(r=>{if(r.ownerUserId===undefined)r.ownerUserId=resultOwner;});
      return Object.assign(clone(defaultState),parsed);
    }catch(e){
      return clone(defaultState);
    }
  }

  let state=loadState();
  // Persist the browser identity before the first navigation or game.
  save();

  function save(){
    try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }catch(e){}
  }

  function game(gameId){ return clone(GAME_DEFS[gameId]||null); }
  function player(){
    const p=clone(state.player),today=todayKey();
    const yesterday=new Date(Date.parse(today+'T12:00:00Z')-86400000).toISOString().slice(0,10);
    const last=p.lastStreakDate;
    p.currentStreak=last && last>=yesterday && last<=today?Math.max(0,Number(p.currentStreak)||0):0;
    p.streakSecuredToday=last===today && p.currentStreak>0;
    p.identityName=state.auth.leaderboard?.displayName||p.displayName;
    p.defaultSeed=state.auth.anonymousPlayerId;
    const identity=window.BrainiPeople?.resolve(p);
    if(identity){
      p.defaultAvatarUrl=identity.avatar;
      // The private display name can differ from the public ranking alias.
      p.displayName=BrainiPeople.resolve({name:p.displayName,defaultSeed:p.defaultSeed}).displayName;
    }
    return p;
  }
  function daily(){
    if(state.daily.key!==todayKey()){state.daily={key:todayKey(),number:dailyNumber(),completedGames:[],brainScore:0,brainScorePercentile:null,bonusChoice:null,dailyBreakdown:emptyDailyBreakdown()};save();}
    return clone(state.daily);
  }
  function personalBest(gameId){ return clone(state.personalBests[gameId]||null); }
  function anytimeHistory(scope){
    const key=String(scope||"").trim();
    if(!key) return {};
    return clone(state.anytimeHistory?.[key]||{});
  }

  function recordAnytimeHistory(scope,ids){
    const key=String(scope||"").trim();
    if(!key || !Array.isArray(ids) || !ids.length) return anytimeHistory(key);
    if(!state.anytimeHistory || typeof state.anytimeHistory!=="object") state.anytimeHistory={};
    const bucket=(state.anytimeHistory[key] && typeof state.anytimeHistory[key]==="object")
      ? state.anytimeHistory[key]
      : {};
    const now=new Date().toISOString();
    [...new Set(ids.map(id=>String(id||"").trim()).filter(Boolean))].forEach(id=>{
      const previous=bucket[id]||{};
      bucket[id]={
        timesPlayed:Math.max(0,Number(previous.timesPlayed||0))+1,
        lastPlayedAt:now
      };
    });
    state.anytimeHistory[key]=bucket;
    save();
    return clone(bucket);
  }

  function anytimePlayedIds(scope){
    return Object.keys(anytimeHistory(scope));
  }

  function recentResults(gameId){
    return clone(gameId ? state.recentResults.filter(x=>x.gameId===gameId) : state.recentResults);
  }
  function collectiveStats(gameId){
    return clone(gameId ? collective.games[gameId]||null : collective);
  }
  function leaderboard(gameId){ return clone(collective.leaderboards[gameId]||[]); }

  function computePercentile(){
    // Percentiles are authoritative only when returned by the backend.
    return null;
  }

  function scoreForDaily(gameId,payload){
    const raw=rawScoreForDaily(gameId,payload);
    return window.BrainiDailyRules?.points(raw,gameId,dateForDailyNumber(payload.dailyNumber||state.daily.number))??raw;
  }
  function rawScoreForDaily(gameId,payload){
    if(gameId==="brainmix") return Math.min(2500,Math.round((payload.score||0)*.25));
    if(gameId==="flagdash") return Math.min(2500,Math.round((payload.correct||0)*70 + (payload.bestCombo||0)*15));
    if(gameId==="orderup") return Math.min(2500,Math.max(0,Math.round(payload.score||0)));
    if(gameId==="topicrush") return Math.min(2500,Math.max(0,Math.round(payload.score||0)));
    if(gameId==="maphunt") return Math.min(2500,Math.round((payload.score||0)*.42));
    if(gameId==="brainiword"){
      if(!payload.won) return 250;
      return {1:2500,2:2250,3:2000,4:1750,5:1500}[payload.attempts]||1000;
    }
    if(gameId==="connections") return Math.min(2500,Math.max(0,Math.round(Number(payload.score||0)/3000*2500)));
    if(gameId==="oddoneout") return Math.min(2500,Math.max(0,Math.round(Number(payload.score||0)/1000*2500)));
    if(gameId==="higherlower") return Math.min(2500,Math.max(0,Math.round(Number(payload.score||0)/1700*2500)));
    if(gameId==="mathrush") return Math.min(2500,Math.max(0,Math.round(Number(payload.score||0)*(payload.scoringVersion==='mathrush-v2'||String(payload.seed||'').startsWith('v2:')?2500/6000:1))));
    if(gameId==="numberroute") return Math.min(2500,Math.max(0,Math.round(Number(payload.score||0))));
    if(gameId==="sequence") return Math.min(2500,Math.max(0,Math.round(Number(payload.score||0))));
    return 0;
  }

  function recomputeDailyBrainScore(){
    const today=state.daily.number;
    const todayDate=dateForDailyNumber(today);
    const dailyIds=dailyGameIdsForDate(todayDate);
    const acceptedIds=todayDate<DAILY_ROTATION_START?[...dailyIds,"maphunt"]:[...dailyIds];
    const bestByGame={};
    const rules=window.BrainiDailyRules?.model(todayDate);
    const chosen=state.daily.bonusChoice;

    // V26 migration bridge: a Map Hunt result already completed today occupies
    // the new Topic Rush Daily slot instead of disappearing from 4/4 progress.
    state.recentResults
      .filter(r=>!r.practice && r.dailyNumber===today && acceptedIds.includes(r.gameId) && (rules?.version!=="daily-choice-v1" || r.gameId===rules.primary || r.gameId===chosen))
      .forEach(r=>{
        const sourceGameId=r.gameId;
        const slotGameId=sourceGameId==="maphunt" && todayDate<DAILY_ROTATION_START ? "topicrush" : sourceGameId;
        const points=scoreForDaily(sourceGameId,r);
        const previous=bestByGame[slotGameId];
        const previousPoints=previous?._dailyPoints ?? 0;

        if(!previous || points>previousPoints){
          bestByGame[slotGameId]={
            ...r,
            gameId:slotGameId,
            _dailySourceGameId:sourceGameId,
            _dailyPoints:points
          };
        }
      });

    state.daily.brainScore = Object.values(bestByGame)
      .reduce((sum,r)=>sum+(r._dailyPoints ?? scoreForDaily(r.gameId,r)),0);
    const completion=Object.keys(bestByGame).length;
    state.daily.brainScorePercentile = null; // Percentiles require a measured server cohort.
    state.daily.completedGames=Object.keys(bestByGame);
    const breakdown={};
    dailyIds.forEach(gameId=>{
      const res=bestByGame[gameId];
      if(!res){
        breakdown[gameId]={points:0,max:window.BrainiDailyRules?.max(gameId,todayDate)??2500,label:"Not played yet"};
        return;
      }
      const pts=res._dailyPoints ?? scoreForDaily(gameId,res);
      let label="Completed";
      if(gameId==="brainmix") label=`${res.correct||0}/${res.total||10} correct`;
      else if(gameId==="orderup") label=`${res.accuracy||0}% order accuracy`;
      else if(gameId==="topicrush"){
        label=res._dailySourceGameId==="maphunt"
          ? "Completed before Topic Rush update"
          : `${res.correct||0} answers`;
      }
      else if(gameId==="brainiword") label=res.won ? `${res.attempts}/5 tries` : "Not solved";
      else if(gameId==="connections") label=`${Number(res.correct||0)} / ${Number(res.total||0)} correct`;
      else if(gameId==="oddoneout") label=`${Number(res.correct||0)}/${Number(res.total||10)} correct`;
      else if(gameId==="higherlower") label=`${Number(res.correct||0)}/${Number(res.total||10)} correct`;
      else if(gameId==="mathrush") label=`${Number(res.correct||0)} correct · ${Number(res.bestCombo||0)} best combo`;
      else if(gameId==="numberroute") label=`${Number(res.correct||0)}/${Number(res.total||10)} routes solved`;
      else if(gameId==="sequence") label=`${Number(res.correct||0)}/${Number(res.total||10)} correct`;
      breakdown[gameId]={points:pts,max:window.BrainiDailyRules?.max(gameId,todayDate)??2500,label};
    });
    state.daily.dailyBreakdown=breakdown;
  }



  function pendingAnswerVerifications(){
    return clone(
      state.recentResults.filter(r=>
        !r.practice &&
        (r.quizPackId || r.contentSource==="supabase") &&
        Array.isArray(r.answerDetails) &&
        r.answerDetails.length>0 &&
        r.answerDetails.every(a=>!!a.questionVersionId) &&
        r.cloudSyncStatus==="synced" &&
        r.answerVerificationStatus!=="verified"
      )
    );
  }

  function markResultAnswerVerified(clientResultId,verification={}){
    const result=state.recentResults.find(r=>r.clientResultId===clientResultId);
    if(!result) return null;

    result.answerVerificationStatus="verified";
    result.answersVerifiedAt=new Date().toISOString();
    result.verifiedCorrect=verification.correct_answers ?? result.correct ?? null;
    result.verifiedTotal=verification.total_questions ?? result.total ?? null;
    result.verifiedAccuracy=verification.accuracy ?? result.accuracy ?? null;

    if(Number.isFinite(verification.score) && verification.score>=0) result.score=verification.score;

    // Make verified correctness the local canonical correctness too.
    if(result.verifiedCorrect!==null) result.correct=result.verifiedCorrect;
    if(result.verifiedTotal!==null) result.total=result.verifiedTotal;
    if(result.verifiedAccuracy!==null) result.accuracy=result.verifiedAccuracy;

    track("quiz_answers_server_verified",{
      gameId:result.gameId,
      clientResultId,
      correct:result.verifiedCorrect,
      total:result.verifiedTotal
    });

    save();
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{
      detail:{type:"answer_verification",gameId:result.gameId,result:clone(result)}
    }));

    return clone(result);
  }


  function syncDailyChallengeMeta(daily){
    if(!daily) return clone(state.daily);

    if(Number.isFinite(Number(daily.dailyNumber))){
      state.daily.number=Number(daily.dailyNumber);
    }

    if(daily.challengeDate){
      state.daily.challengeDate=daily.challengeDate;
    }

    if(daily.dailyChallengeId){
      state.daily.dailyChallengeId=daily.dailyChallengeId;
    }

    save();
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{
      detail:{type:"daily_meta",daily:clone(state.daily)}
    }));
    return clone(state.daily);
  }

  function pendingDailyVerifications(){
    return clone(
      state.recentResults.filter(r=>
        !r.practice &&
        r.dailyChallengeId &&
        Array.isArray(r.answerDetails) &&
        r.answerDetails.length===10 &&
        r.cloudSyncStatus==="synced" &&
        r.dailyAnswerVerificationStatus!=="verified"
      )
    );
  }

  function markResultDailyVerified(clientResultId,verification={}){
    const result=state.recentResults.find(r=>r.clientResultId===clientResultId);
    if(!result) return null;

    result.dailyAnswerVerificationStatus="verified";
    result.dailyAnswersVerifiedAt=new Date().toISOString();
    result.verifiedCorrect=verification.correct_answers ?? result.correct ?? null;
    result.verifiedTotal=verification.total_questions ?? result.total ?? null;
    result.verifiedAccuracy=verification.accuracy ?? result.accuracy ?? null;

    if(Number.isFinite(Number(verification.daily_number))){
      result.dailyNumber=Number(verification.daily_number);
    }
    if(result.verifiedCorrect!==null) result.correct=result.verifiedCorrect;
    if(result.verifiedTotal!==null) result.total=result.verifiedTotal;
    if(result.verifiedAccuracy!==null) result.accuracy=result.verifiedAccuracy;

    track("daily_answers_server_verified",{
      gameId:result.gameId,
      clientResultId,
      dailyNumber:result.dailyNumber,
      correct:result.verifiedCorrect,
      total:result.verifiedTotal
    });

    save();
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{
      detail:{type:"daily_answer_verification",result:clone(result)}
    }));

    return clone(result);
  }


  function pendingDailyGameVerifications(){
    const supported=new Set(["orderup","topicrush","brainiword"]);
    return clone(
      state.recentResults.filter(r=>
        !r.practice &&
        supported.has(r.gameId) &&
        r.dailyChallengeId &&
        r.cloudSyncStatus==="synced" &&
        r.dailyGameVerificationStatus!=="verified"
      )
    );
  }

  function markDailyGameVerified(clientResultId,verification={}){
    const result=state.recentResults.find(r=>r.clientResultId===clientResultId);
    if(!result) return null;

    result.dailyGameVerificationStatus="verified";
    result.dailyGameVerifiedAt=new Date().toISOString();

    if(Number.isFinite(Number(verification.daily_number))){
      result.dailyNumber=Number(verification.daily_number);
    }
    if(Number.isFinite(Number(verification.correct))){
      result.correct=Number(verification.correct);
    }
    if(Number.isFinite(Number(verification.total))){
      result.total=Number(verification.total);
    }
    if(Number.isFinite(Number(verification.accuracy))){
      result.accuracy=Number(verification.accuracy);
    }
    if(Number.isFinite(Number(verification.score))){
      result.score=Number(verification.score);
    }
    if(Number.isFinite(Number(verification.best_combo))){
      result.bestCombo=Number(verification.best_combo);
    }
    if(typeof verification.won==="boolean"){
      result.won=verification.won;
    }
    if(Number.isFinite(Number(verification.attempts))){
      result.attempts=Number(verification.attempts);
    }

    recomputeDailyBrainScore();

    track("daily_game_server_checked",{
      gameId:result.gameId,
      clientResultId,
      dailyNumber:result.dailyNumber
    });

    save();
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{
      detail:{type:"daily_game_verification",gameId:result.gameId,result:clone(result)}
    }));

    return clone(result);
  }

  function makeClientResultId(){
    if(window.crypto?.randomUUID){
      return "cr_"+window.crypto.randomUUID();
    }
    return "cr_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,12);
  }

  function pendingCloudResults(){
    return clone(
      state.recentResults.filter(r=>
        !r.practice &&
        r.recordedAtStep===3 &&
        r.clientResultId &&
        r.cloudSyncStatus!=="synced"
      )
    );
  }

  function bindResultOwner(clientResultId,userId){
    const result=state.recentResults.find(r=>r.clientResultId===clientResultId);
    const current=state.auth?.user?.id||state.auth?.guestUserId||null;
    if(!result||current!==userId||(result.ownerUserId&&result.ownerUserId!==userId))return null;
    result.ownerUserId=userId;save();return clone(result);
  }

  function markResultCloudSynced(clientResultId,cloud={}){
    const result=state.recentResults.find(r=>r.clientResultId===clientResultId);
    if(!result) return null;

    result.cloudSyncStatus="synced";
    result.cloudSessionId=cloud.sessionId||result.cloudSessionId||null;
    result.cloudResultId=cloud.resultId||result.cloudResultId||null;
    result.cloudSyncedAt=new Date().toISOString();

    track("game_result_cloud_synced",{
      gameId:result.gameId,
      clientResultId,
      cloudSessionId:result.cloudSessionId,
      alreadyExisted:!!cloud.alreadyExisted
    });

    save();
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{
      detail:{type:"cloud_result_synced",gameId:result.gameId,result:clone(result)}
    }));

    return clone(result);
  }

  async function submitGameResultHybrid(gameId,payload){
    // Try First runs the full real game engine but is deliberately invisible to results, XP and stats.
    if(new URLSearchParams(location.search).get("try")==="1"){
      return Object.assign({gameId,practice:true,tryFirst:true,cloudSyncStatus:"disabled",clientResultId:null},clone(payload));
    }
    // Map Hunt is retired. Do not add new local or cloud analytics/results.
    if(gameId==="maphunt"){
      return Object.assign({gameId,deprecated:true,practice:true,cloudSyncStatus:"disabled"},clone(payload));
    }
    const result=recordGameResult(gameId,payload);

    // Past Daily replays are deliberately local-only practice results.
    // They must never change today's Daily score, streak or cloud rankings.
    if(result.practice){
      const stored=state.recentResults.find(r=>r.clientResultId===result.clientResultId);
      if(stored){
        stored.cloudSyncStatus="local_only";
        stored.dailyAnswerVerificationStatus="practice";
        stored.dailyGameVerificationStatus="practice";
        save();
      }
      return clone(stored||result);
    }

    if(window.BrainiCloudGames){
      try{
        const sync=await BrainiCloudGames.saveCompletedResult(gameId,result);
        if(sync?.saved){
          return clone(
            state.recentResults.find(r=>r.clientResultId===result.clientResultId) || result
          );
        }
      }catch(err){
        // Local-first: never lose a completed game because cloud sync failed.
        console.warn("BrainiLab result saved locally; cloud sync pending:",err.message||err);
      }
    }

    return clone(result);
  }

  function recordGameResult(gameId,payload){
    const def=GAME_DEFS[gameId];
    if(!def) throw new Error("Unknown game: "+gameId);

    const requestedDaily=Number(payload?.dailyNumber);
    if(Number.isInteger(requestedDaily) && requestedDaily>0 && !payload?.practice){
      const existing=state.recentResults.find(r=>r.gameId===gameId && !r.practice && Number(r.dailyNumber)===requestedDaily);
      if(existing) return Object.assign(clone(existing),{dailyReplayBlocked:true});
    }

    if(requestedDaily>0 && dateForDailyNumber(requestedDaily)!==todayKey())payload={...payload,practice:true};
    const day=dateForDailyNumber(requestedDaily||state.daily.number),rules=window.BrainiDailyRules?.model(day);
    if(rules?.version==='daily-choice-v1' && requestedDaily>0 && !payload.practice){
      if(!dailyGameIdsForDate(day).includes(gameId) || (gameId!==rules.primary && state.daily.bonusChoice!==gameId)){
        payload={...payload,practice:true};
      }
    }
    const result=Object.assign({
      id:"r-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),
      clientResultId:makeClientResultId(),
      recordedAtStep:3,
      ownerUserId:state.auth?.user?.id||state.auth?.guestUserId||null,
      cloudSyncStatus:"pending",
      gameId,
      playedAt:new Date().toISOString(),
      dailyNumber:def.daily ? state.daily.number : null,
      percentile:null,
      streakAfter:state.player.currentStreak
    },clone(payload));

    result.percentile = payload.percentile ?? computePercentile(gameId,result);
    state.recentResults.unshift(result);
    state.recentResults=state.recentResults.slice(0,100);

    state.player.totalGames += 1;
    if(Number.isFinite(result.total)) state.player.totalQuestions += result.total;

    // Simplified personal best update
    const pb=state.personalBests[gameId]||{};
    if(gameId==="brainiword"){
      if(result.won && (!pb.attempts || result.attempts < pb.attempts)){
        state.personalBests[gameId]=Object.assign({},pb,{attempts:result.attempts});
      }
    }else if(gameId==="flagdash"){
      if((result.correct||0) > (pb.correct||0)) state.personalBests[gameId]=Object.assign({},pb,result);
    }else{
      if((result.score||0) > (pb.score||0)) state.personalBests[gameId]=Object.assign({},pb,result);
    }

    if(
      Number(result.dailyNumber)===Number(state.daily.number) &&
      dailyGameIdsForNumber(state.daily.number).includes(gameId) &&
      !result.practice
    ) recomputeDailyBrainScore();

    track("game_completed",{gameId,resultId:result.id,percentile:result.percentile});
    save();
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{detail:{type:"game_result",gameId,result:clone(result)}}));
    return clone(result);
  }

  function track(event,props={}){
    state.analytics.push({
      id:"e-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),
      event,
      at:new Date().toISOString(),
      props:clone(props)
    });
    state.analytics=state.analytics.slice(-500);
    save();
  }

  function recordShare(gameId,channel,context={}){
    const event={
      id:"s-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),
      gameId,channel,at:new Date().toISOString(),context:clone(context)
    };
    state.shareEvents.push(event);
    state.player.totalShares += 1;
    track("result_shared",{gameId,channel,...context});
    save();
    return clone(event);
  }

  function shareUrl(gameId,channel="native"){
    const route=GAME_DEFS[gameId]?.route || "/";
    const qs=new URLSearchParams({
      utm_source:channel,
      utm_medium:"organic_share",
      utm_campaign:gameId,
      ref:"share"
    });
    return location.origin + route + "?" + qs.toString();
  }


  function authState(){
    return clone(state.auth);
  }

  function isAuthenticated(){
    return state.auth?.status==="authenticated" && !!state.auth.user;
  }

  function accountSnapshot(){
    return {
      auth:authState(),
      player:player(),
      daily:daily(),
      personalBests:clone(state.personalBests),
      recentResults:recentResults()
    };
  }

  function completeMockSignIn(provider,profile={}){
    const now=new Date().toISOString();
    const oldAnonId=state.auth.anonymousPlayerId || makeAnonId();
    const email=(profile.email||(
      provider==="google" ? "player@gmail.com" :
      provider==="apple" ? "player@privaterelay.appleid.com" :
      "player@example.com"
    )).trim().toLowerCase();

    const suggestedName=(profile.displayName || (
      provider==="google" ? "Braini Player" :
      provider==="apple" ? "Brainiac" :
      (email.split("@")[0] || "Braini Player")
    )).trim();

    state.auth={
      status:"authenticated",
      anonymousPlayerId:oldAnonId,
      provider,
      cloudSync:true,
      user:{
        id:"usr_"+Math.random().toString(36).slice(2,9),
        email,
        emailVerified:true,
        createdAt:now,
        lastLoginAt:now
      },
      leaderboard:Object.assign(
        {enabled:false,displayName:null},
        state.auth?.leaderboard||{}
      )
    };

    // Guest progress is intentionally retained: this is the merge step.
    state.player.id="player_"+state.auth.user.id.slice(4);
    state.player.displayName=suggestedName || state.player.displayName || "Braini Player";
    state.player.avatarInitial=(state.player.displayName[0]||"B").toUpperCase();

    track("account_created",{
      provider,
      migratedAnonymousPlayerId:oldAnonId,
      retainedGames:state.player.totalGames,
      retainedQuestions:state.player.totalQuestions
    });
    save();
    window.dispatchEvent(new CustomEvent("brainilab:authchange",{detail:{status:"authenticated",provider}}));
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{detail:{type:"auth"}}));
    return accountSnapshot();
  }

  function requestMagicLink(email){
    const clean=(email||"").trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)){
      throw new Error("Enter a valid email address.");
    }
    track("magic_link_requested",{emailDomain:clean.split("@")[1]});
    save();
    return {ok:true,email:clean,expiresInMinutes:15};
  }

  function signOut(){
    const previousUser=state.auth?.user?.id || null;
    state.auth={
      status:"guest",
      anonymousPlayerId:makeAnonId(),
      user:null,
      provider:null,
      cloudSync:false,
      leaderboard:{enabled:false,displayName:null}
    };
    state.player.id="local-player-"+Math.random().toString(36).slice(2,7);
    state.player.displayName="You";
    state.player.avatarInitial="B";
    track("logout",{previousUser});
    save();
    window.dispatchEvent(new CustomEvent("brainilab:authchange",{detail:{status:"guest"}}));
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{detail:{type:"auth"}}));
    return authState();
  }

  function updatePlayerProfile(patch={}){
    if(!isAuthenticated()) throw new Error("Sign in to update your profile.");
    if(typeof patch.displayName==="string"){
      const clean=patch.displayName.trim().slice(0,30);
      if(clean){
        state.player.displayName=clean;
        state.player.avatarInitial=clean[0].toUpperCase();
      }
    }
    if(typeof patch.countryCode==="string" && patch.countryCode.trim()){
      state.player.countryCode=patch.countryCode.trim().slice(0,2).toUpperCase();
    }
    track("profile_updated",{fields:Object.keys(patch)});
    save();
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{detail:{type:"profile"}}));
    return player();
  }

  function joinLeaderboard(displayName){
    if(!isAuthenticated()) throw new Error("Sign in before joining leaderboards.");
    const clean=(displayName||state.player.displayName||"").trim().replace(/\s+/g," ").slice(0,24);
    if(clean.length<2) throw new Error("Choose a display name with at least 2 characters.");
    state.auth.leaderboard={enabled:true,displayName:clean};
    state.player.displayName=clean;
    state.player.avatarInitial=clean[0].toUpperCase();
    track("leaderboard_joined",{displayNameLength:clean.length});
    save();
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{detail:{type:"leaderboard"}}));
    return clone(state.auth.leaderboard);
  }

  function leaveLeaderboard(){
    if(!state.auth) return null;
    state.auth.leaderboard={enabled:false,displayName:null};
    track("leaderboard_left",{});
    save();
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{detail:{type:"leaderboard"}}));
    return clone(state.auth.leaderboard);
  }


  const RANKING_NAMES=[
    "MayaK","Atlas_7","LeoQ","GeoBee","QuizNinja","Nora","MapWizard","FlagFox","PixelBrain","Cortex",
    "TriviaCat","NovaMind","FactRunner","BlueOrbit","QuickThink","GlobeTrotter","Neuron","QuizPilot","DailyFox","BrainBolt",
    "EchoMind","KappaQuiz","WorldWise","AtlasBee","ThinkFast","MintBrain","QuizOtter","MangoMind","LogicLab","StarQuiz",
    "CleverCub","Factora","NimbleNerd","TopoFox","Quizzly","MindSprint","Brainwave","FactForge","GeoNova","PuzzleBee"
  ];
  const RANKING_COUNTRIES=["ES","US","GB","PT","DE","FR","IT","NL","CA","AU","BR","MX","JP","SE","NO"];
  const GROUP_NAMES=[
    "Brain Storm","Quiz Catalysts","Global Minds","Flag Hunters","Neuron Crew","Daily Thinkers","Atlas Club","Fast Facts",
    "Cortex Five","The Quizzards","Map Masters","Brain Sparks","Trivia Tribe","Knowledge Lab","Puzzle Union","Mind League",
    "Fact Pack","Bright Five","World Brains","Quiz Orbit","The Recall","Think Tank","Geo Gang","Daily League","Smart Squad",
    "Brain Fuel","Question Club","Mindset Five","Clever Collective","Quiz Forge"
  ];
  const GROUP_ICONS=["⚡","🧠","🌍","🚩","🏆","💡","🧩","⭐"];
  const GROUP_COLORS=["#FFD813","#40AB34","#E52720","#E6680C","#2D296E"];

  function hashString(str){
    let h=2166136261;
    for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); }
    return Math.abs(h>>>0);
  }

  function friends(){ return clone(state.social?.friends||[]); }
  function pendingFriendRequests(){ return clone(state.social?.pendingFriendRequests||[]); }
  function groups(){ return clone(state.social?.groups||[]); }
  function socialState(){ return clone(state.social); }


  function createFriendInvite(){
    if(!isAuthenticated()) throw new Error("Sign in to invite friends.");
    const code=state.social.friendCode;
    const invite={
      code,
      url:`https://brainilabgames.com/profile/?friend=${encodeURIComponent(code)}`,
      createdAt:new Date().toISOString()
    };
    track("friend_invite_created",{code});
    save();
    return clone(invite);
  }

  function sendFriendRequest(code){
    if(!isAuthenticated()) throw new Error("Sign in to connect with friends.");
    const clean=(code||"").trim().toUpperCase();
    if(clean.length<4) throw new Error("Enter a valid BrainiLab friend code.");
    if(clean===state.social.friendCode) throw new Error("That is your own friend code.");
    const seed=hashString(clean);
    const name=RANKING_NAMES[seed%RANKING_NAMES.length];
    if(state.social.friends.some(f=>f.name===name)) throw new Error("You are already connected with this player.");
    const friend={
      id:"fr-"+Date.now(),name,country:RANKING_COUNTRIES[(seed>>3)%RANKING_COUNTRIES.length],avatar:name[0].toUpperCase(),
      currentStreak:4+(seed%29),dailyScore:6400+(seed%3100),weeklyScore:42000+(seed%17000),
      monthlyScore:168000+(seed%69000),status:"accepted"
    };
    state.social.friends.push(friend);
    track("friend_connected",{friendId:friend.id,source:"friend_code"});
    save();
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{detail:{type:"friends"}}));
    return clone(friend);
  }

  function acceptFriendRequest(requestId){
    if(!isAuthenticated()) throw new Error("Sign in to manage friends.");
    const idx=state.social.pendingFriendRequests.findIndex(r=>r.id===requestId);
    if(idx<0) throw new Error("Friend request not found.");
    const req=state.social.pendingFriendRequests.splice(idx,1)[0];
    const seed=hashString(req.name);
    const friend={
      id:"fr-"+Date.now(),name:req.name,country:req.country||"ES",avatar:req.avatar||req.name[0],
      currentStreak:5+(seed%21),dailyScore:6800+(seed%2500),weeklyScore:45000+(seed%15000),
      monthlyScore:177000+(seed%62000),status:"accepted"
    };
    state.social.friends.push(friend);
    track("friend_request_accepted",{friendId:friend.id});
    save();
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{detail:{type:"friends"}}));
    return clone(friend);
  }

  function removeFriend(friendId){
    if(!isAuthenticated()) throw new Error("Sign in to manage friends.");
    const before=state.social.friends.length;
    state.social.friends=state.social.friends.filter(f=>f.id!==friendId);
    state.social.groups.forEach(g=>{ g.members=g.members.filter(m=>m.id!==friendId); });
    if(state.social.friends.length===before) throw new Error("Friend not found.");
    track("friend_removed",{friendId}); save();
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{detail:{type:"friends"}}));
    return friends();
  }

  function createGroup(payload={}){
    if(!isAuthenticated()) throw new Error("Sign in to create a group.");
    const name=(payload.name||"").trim().replace(/\s+/g," ").slice(0,28);
    if(name.length<2) throw new Error("Choose a group name with at least 2 characters.");
    const friendIds=Array.isArray(payload.friendIds)?payload.friendIds.slice(0,4):[];
    const selected=state.social.friends.filter(f=>friendIds.includes(f.id)).slice(0,4);
    const members=[
      {id:"self",name:state.player.displayName||"You",country:state.player.countryCode||"ES",avatar:state.player.avatarInitial||"B"},
      ...selected.map(f=>({id:f.id,name:f.name,country:f.country,avatar:f.avatar}))
    ];
    if(members.length>5) throw new Error("Groups can have a maximum of 5 members.");
    const color=GROUP_COLORS.includes(payload.color)?payload.color:GROUP_COLORS[0];
    const icon=GROUP_ICONS.includes(payload.icon)?payload.icon:GROUP_ICONS[0];
    const seed=hashString(name);
    const group={
      id:"grp-"+Date.now(),name,crest:{icon,color},country:state.player.countryCode||"ES",ownerId:"self",members,
      currentStreak:1+(seed%14),
      dailyScore:Math.round(members.reduce((sum,m,i)=>sum+(m.id==="self"?state.daily.brainScore:7100+((seed+i*997)%2200)),0)),
      weeklyScore:members.length*(42000+(seed%9000)),
      monthlyScore:members.length*(169000+(seed%32000))
    };
    state.social.groups.push(group);
    track("group_created",{groupId:group.id,memberCount:members.length}); save();
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{detail:{type:"groups"}}));
    return clone(group);
  }

  function updateGroup(groupId,patch={}){
    if(!isAuthenticated()) throw new Error("Sign in to manage groups.");
    const g=state.social.groups.find(x=>x.id===groupId);
    if(!g) throw new Error("Group not found.");
    if(g.ownerId!=="self") throw new Error("Only the group owner can edit this group.");
    if(typeof patch.name==="string"){
      const name=patch.name.trim().replace(/\s+/g," ").slice(0,28);
      if(name.length>=2) g.name=name;
    }
    if(GROUP_COLORS.includes(patch.color)) g.crest.color=patch.color;
    if(GROUP_ICONS.includes(patch.icon)) g.crest.icon=patch.icon;
    if(Array.isArray(patch.friendIds)){
      const selected=state.social.friends.filter(f=>patch.friendIds.includes(f.id)).slice(0,4);
      g.members=[
        {id:"self",name:state.player.displayName||"You",country:state.player.countryCode||"ES",avatar:state.player.avatarInitial||"B"},
        ...selected.map(f=>({id:f.id,name:f.name,country:f.country,avatar:f.avatar}))
      ];
    }
    if(g.members.length>5) throw new Error("Groups can have a maximum of 5 members.");
    track("group_updated",{groupId,memberCount:g.members.length}); save();
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{detail:{type:"groups"}}));
    return clone(g);
  }

  function leaveGroup(groupId){
    if(!isAuthenticated()) throw new Error("Sign in to manage groups.");
    const g=state.social.groups.find(x=>x.id===groupId);
    if(!g) throw new Error("Group not found.");
    state.social.groups=state.social.groups.filter(x=>x.id!==groupId);
    track(g.ownerId==="self"?"group_deleted":"group_left",{groupId}); save();
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{detail:{type:"groups"}}));
    return groups();
  }

  function rankingMetricLabel(filters={}){
    if(filters.metric==="streak") return filters.mode==="group"?"Group streak":"Streak";
    return filters.mode==="group"?"Group points":"Points";
  }

  function individualUserRank(filters={}){
    const key=[filters.region||"global",filters.period||"daily",filters.gameId||"all",filters.metric||"score"].join("|");
    const presets={
      "global|daily|all|score":185,"country|daily|all|score":43,"global|weekly|all|score":742,
      "global|monthly|all|score":1284,"country|weekly|all|score":67,"country|monthly|all|score":212,
      "global|daily|brainmix|score":96,"global|daily|brainiword|score":114,
      "global|daily|all|streak":638,"country|daily|all|streak":88
    };
    return presets[key] || (60+(hashString(key)%1080));
  }

  function groupUserRank(filters={}){
    if(!state.social.groups.length) return null;
    const key=[filters.region||"global",filters.period||"daily",filters.gameId||"all",filters.metric||"score"].join("|");
    const presets={
      "global|daily|all|score":72,"country|daily|all|score":9,"global|weekly|all|score":148,
      "global|monthly|all|score":1042,"country|weekly|all|score":21
    };
    return presets[key] || (8+(hashString("g|"+key)%1030));
  }

  function scoreForRank(seed,rank,filters={},mode="individual"){
    const period=filters.period||"daily";
    if(filters.metric==="streak") return Math.max(1,75-rank+(seed%11));
    const scale=period==="monthly"?28:period==="weekly"?7:1;
    const base=mode==="group"?31000:9900;
    const drop=mode==="group"?145:27;
    return Math.max(120,Math.round((base-rank*drop+(seed%190))*scale));
  }

  function buildIndividualRanking(filters={}){
    const region=filters.region||"global", country=state.player.countryCode||"ES";
    const key=[region,filters.period||"daily",filters.gameId||"all",filters.metric||"score"].join("|");
    const seedBase=hashString(key), rows=[];
    for(let rank=1;rank<=100;rank++){
      const seed=seedBase+rank*7919;
      const name=RANKING_NAMES[(seed+rank)%RANKING_NAMES.length]+(rank>40?String((seed%89)+1):"");
      const rowCountry=region==="country"?country:RANKING_COUNTRIES[(seed>>4)%RANKING_COUNTRIES.length];
      rows.push({rank,name,country:rowCountry,avatar:name[0].toUpperCase(),score:scoreForRank(seed,rank,filters,"individual"),streak:Math.max(1,54-Math.floor(rank/2)+(seed%13)),isMe:false});
    }
    const userRank=individualUserRank(filters);
    const user={rank:userRank,name:state.player.displayName||"You",country,avatar:state.player.avatarInitial||"B",score:scoreForRank(hashString("self|"+key),userRank,filters,"individual"),streak:state.player.currentStreak||0,isMe:true};
    if(userRank<=100) rows[userRank-1]=user;
    return {rows,user,metricLabel:rankingMetricLabel(filters),totalPlayers:28431+(seedBase%42000)};
  }

  function buildFriendRanking(filters={}){
    const period=filters.period||"daily", prop=period==="monthly"?"monthlyScore":period==="weekly"?"weeklyScore":"dailyScore";
    const all=[
      ...state.social.friends.map(f=>({id:f.id,name:f.name,country:f.country,avatar:f.avatar,score:f[prop]||0,streak:f.currentStreak||0,isMe:false})),
      {id:"self",name:state.player.displayName||"You",country:state.player.countryCode||"ES",avatar:state.player.avatarInitial||"B",score:period==="monthly"?186420:period==="weekly"?48620:state.daily.brainScore||0,streak:state.player.currentStreak||0,isMe:true}
    ];
    all.sort((a,b)=>filters.metric==="streak"?b.streak-a.streak:b.score-a.score);
    all.forEach((x,i)=>x.rank=i+1);
    return {rows:all,user:all.find(x=>x.isMe),metricLabel:filters.metric==="streak"?"Streak":"Points",totalPlayers:all.length};
  }

  function buildGroupRanking(filters={}){
    const region=filters.region||"global", country=state.player.countryCode||"ES";
    const key=[region,filters.period||"daily",filters.gameId||"all",filters.metric||"score"].join("|");
    const seedBase=hashString("groups|"+key), rows=[];
    for(let rank=1;rank<=100;rank++){
      const seed=seedBase+rank*6151;
      const name=GROUP_NAMES[(seed+rank)%GROUP_NAMES.length]+(rank>30?" "+((seed%19)+2):"");
      const rowCountry=region==="country"?country:RANKING_COUNTRIES[(seed>>5)%RANKING_COUNTRIES.length];
      rows.push({rank,name,country:rowCountry,crest:{icon:GROUP_ICONS[seed%GROUP_ICONS.length],color:GROUP_COLORS[(seed>>3)%GROUP_COLORS.length]},members:2+(seed%4),score:scoreForRank(seed,rank,filters,"group"),streak:Math.max(1,29-Math.floor(rank/5)+(seed%8)),isMe:false});
    }
    const userRank=groupUserRank(filters); let user=null;
    if(userRank && state.social.groups.length){
      const g=state.social.groups[0];
      user={rank:userRank,name:g.name,country:g.country||country,crest:clone(g.crest),members:g.members.length,score:scoreForRank(hashString("mygroup|"+key),userRank,filters,"group"),streak:g.currentStreak||0,isMe:true};
      if(userRank<=100) rows[userRank-1]=user;
    }
    return {rows,user,metricLabel:rankingMetricLabel({...filters,mode:"group"}),totalPlayers:6310+(seedBase%8400)};
  }

  function getRankings(filters={}){
    const mode=filters.mode||"individual";
    if(mode==="friends") return clone(buildFriendRanking(filters));
    if(mode==="group") return clone(buildGroupRanking(filters));
    return clone(buildIndividualRanking(filters));
  }


  function submitSuggestion(payload={}){
    const type=(payload.type||"general").trim().slice(0,32);
    const message=(payload.message||"").trim().slice(0,4000);
    const email=(payload.email||"").trim().slice(0,180);
    if(message.length<5) throw new Error("Tell us a little more about your suggestion.");

    const item={
      id:"suggestion_"+Date.now(),
      type,
      message,
      email:email||null,
      playerId:state.player?.id||null,
      authUserId:state.auth?.user?.id||null,
      createdAt:new Date().toISOString(),
      status:"received"
    };

    const key="brainilab_suggestions_v1";
    let items=[];
    try{ items=JSON.parse(localStorage.getItem(key)||"[]"); }catch(e){}
    items.unshift(item);
    localStorage.setItem(key,JSON.stringify(items.slice(0,50)));

    track("suggestion_submitted",{type,authenticated:isAuthenticated()});
    save();
    return clone(item);
  }


  function syncExternalAuthUser(user,provider="email"){
    if(!user?.id) throw new Error("Missing authenticated user.");
    if(state.auth?.user?.id && state.auth.user.id!==user.id){
      resetPlayerIdentity();
    }

    const previousAnon=state.auth?.anonymousPlayerId || makeAnonId();
    const existingLeaderboard=state.auth?.leaderboard || {enabled:false,displayName:null};
    const email=(user.email||"").trim().toLowerCase();
    const meta=user.user_metadata||{};
    // Cosmetic preferences only; never used to calculate XP, scores or access.
    state.player.avatarDesign=window.BrainiAvatarDesign?.fromMetadata?.(meta)||null;
    const suggestedName=(
      meta.full_name ||
      meta.name ||
      meta.display_name ||
      (email ? email.split("@")[0] : "") ||
      state.player.displayName ||
      "Braini Player"
    ).trim().slice(0,30);

    state.auth={
      status:"authenticated",
      anonymousPlayerId:previousAnon,
      provider,
      cloudSync:false,
      user:{
        id:user.id,
        email,
        emailVerified:!!user.email_confirmed_at,
        createdAt:user.created_at||null,
        lastLoginAt:new Date().toISOString(),
        source:"supabase"
      },
      leaderboard:existingLeaderboard
    };

    // Identity is real. Step 2 now syncs the public.profiles row separately.
    // Gameplay stats still remain local until the later results/statistics steps.
    state.player.id="local-linked-"+user.id.slice(0,8);
    if(!state.player.displayName || state.player.displayName==="You" || state.player.displayName==="Braini Player"){
      state.player.displayName=suggestedName;
      state.player.avatarInitial=(suggestedName[0]||"B").toUpperCase();
    }

    track("supabase_auth_synced",{provider,userId:user.id});
    save();
    window.dispatchEvent(new CustomEvent("brainilab:authchange",{detail:{status:"authenticated",provider,source:"supabase"}}));
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{detail:{type:"auth"}}));
    return accountSnapshot();
  }

  function setAvatarDesign(value){
    const design=window.BrainiAvatarDesign?.clean?.(value)||null;
    if(JSON.stringify(state.player.avatarDesign||null)===JSON.stringify(design))return;
    state.player.avatarDesign=design;
    save();
    window.dispatchEvent(new CustomEvent('brainilab:datachange',{detail:{type:'avatar_style'}}));
  }

  function resetPlayerIdentity(){
    state=clone(defaultState);
    state.daily.key=todayKey();
    state.daily.number=dailyNumber();
    state.auth.anonymousPlayerId=makeAnonId();
  }

  function syncExternalGuestUser(user){
    if(!user?.id || !user.is_anonymous) throw new Error("Invalid guest player.");
    if(state.auth?.status==="authenticated" || (state.auth?.guestUserId && state.auth.guestUserId!==user.id)) resetPlayerIdentity();
    if(state.auth?.guestUserId===user.id) return authState();
    state.auth={...state.auth,status:"guest",user:null,provider:null,
      guestUserId:user.id,cloudSync:true};
    save();
    window.dispatchEvent(new CustomEvent("brainilab:authchange",{detail:{status:"guest",source:"supabase"}}));
    return authState();
  }

  function completeGuestClaim(claim){
    const skipped=new Set(claim.skipped_client_result_ids||[]);
    state.recentResults=state.recentResults.filter(r=>!skipped.has(r.clientResultId));
    if(claim.claimed&&claim.fromUserId&&claim.toUserId){
      state.recentResults.forEach(r=>{if(r.ownerUserId===claim.fromUserId)r.ownerUserId=claim.toUserId;});
    }
    save();
  }



  function syncCloudProgression(summary){
    if(!summary?.progression) return accountSnapshot();

    const p=summary.progression;
    const today=summary.today||{};
    const week=summary.week||{};
    const month=summary.month||{};

    state.player.currentStreak=Number(p.current_streak||0);
    state.player.lastStreakDate=p.last_streak_date||null;
    state.player.bestStreak=Number(p.best_streak||0);
    state.player.xp=Number(p.xp||0);
    state.player.level=Number(p.level||1);
    state.player.totalGames=Number(p.total_games||0);
    state.player.totalQuestions=Number(p.total_questions||0);
    state.player.fullDailyCount=Number(p.full_daily_count||0);

    if(p.favorite_game_id){
      const favorite=GAME_DEFS[p.favorite_game_id];
      state.player.favoriteCategory=favorite?.name||p.favorite_game_id;
    }

    if(Number.isFinite(Number(today.daily_number))){
      state.daily.number=Number(today.daily_number);
    }

    state.daily.bonusChoice=today.bonus_choice||state.daily.bonusChoice||null;
    state.daily.brainScore=Number(today.daily_brain_score||0);
    state.daily.completedGames=[];

    const todayDate=String(today.stat_date||dateForDailyNumber(state.daily.number)||todayKey()).slice(0,10);
    const dailyIds=Array.isArray(today.daily_game_ids)&&today.daily_game_ids.length
      ? today.daily_game_ids.map(String)
      : dailyGameIdsForDate(todayDate);
    const completedIds=new Set(
      Array.isArray(today.completed_game_ids)
        ? today.completed_game_ids.map(String)
        : []
    );
    const fieldByGame={
      brainmix:"brainmix",
      flagdash:"flagdash",
      orderup:"orderup",
      maphunt:"maphunt",
      topicrush:"topicrush",
      brainiword:"brainiword",
      connections:"connections",
      oddoneout:"oddoneout",
      higherlower:"higherlower",
      mathrush:"mathrush",
      numberroute:"numberroute",
      sequence:"sequence"
    };

    const breakdown={};
    dailyIds.forEach(gameId=>{
      const field=fieldByGame[gameId]||gameId;
      const played=completedIds.size
        ? completedIds.has(gameId)
        : !!today[`${field}_played`];
      breakdown[gameId]={
        points:Number(today[`${field}_points`]||0),
        max:window.BrainiDailyRules?.max(gameId,todayDate)??2500,
        label:played?"Completed today":"Not played yet"
      };
      if(played) state.daily.completedGames.push(gameId);
    });

    state.daily.dailyBreakdown=breakdown;
    state.daily.fullDaily=!!today.full_daily;

    state.cloudProgression={
      synced:true,
      streakSnapshot:summary.continuity?{progression:clone(p),continuity:clone(summary.continuity)}:null,
      generatedAt:summary.generated_at||new Date().toISOString(),
      fullDailyCount:Number(p.full_daily_count||0),
      today:clone(today),
      week:clone(week),
      month:clone(month)
    };

    if(Array.isArray(summary.personal_bests)){
      summary.personal_bests.forEach(pb=>{
        const gameId=pb.game_id;
        if(!gameId) return;

        const payload=Object.assign({},pb.result_payload||{}, {
          score:pb.score,
          correct:pb.correct_answers,
          total:pb.total_questions,
          accuracy:pb.accuracy,
          timeSec:pb.duration_ms!=null
            ? Math.round(Number(pb.duration_ms)/1000)
            : undefined,
          achievedAt:pb.achieved_at,
          cloud:true
        });

        if(pb.metric_name==="attempts"){
          payload.attempts=Number(pb.metric_value);
          payload.won=true;
        }

        state.personalBests[gameId]=payload;
      });
    }

    state.auth.progressionSynced=true;

    save();

    window.dispatchEvent(new CustomEvent("brainilab:datachange",{
      detail:{type:"progression",summary:clone(summary)}
    }));

    return accountSnapshot();
  }

  function syncCloudProfile(profile){
    if(!profile?.user_id) throw new Error("Invalid BrainiLab profile.");

    const name=(profile.display_name||state.player.displayName||"Braini Player").trim().slice(0,30);
    state.player.displayName=name;
    state.player.avatarInitial=(name[0]||"B").toUpperCase();
    state.player.avatarUrl=profile.avatar_url||null;

    state.player.countryCode=profile.country_code
      ? profile.country_code.toUpperCase()
      : "";

    if(profile.friend_code){
      state.social.friendCode=profile.friend_code;
    }

    state.auth.cloudSync=true;
    state.auth.profileSynced=true;
    state.auth.profileUpdatedAt=profile.updated_at||null;
    state.auth.leaderboard={
      enabled:!!profile.leaderboard_enabled,
      displayName:profile.leaderboard_display_name||null
    };

    track("cloud_profile_synced",{userId:profile.user_id});
    save();

    window.dispatchEvent(new CustomEvent("brainilab:datachange",{detail:{type:"profile"}}));
    return accountSnapshot();
  }


  function syncCloudFriends(snapshot){
    if(!snapshot) return socialState();

    if(snapshot.friendCode){
      state.social.friendCode=snapshot.friendCode;
    }

    state.social.friends=Array.isArray(snapshot.friends)
      ? clone(snapshot.friends)
      : [];

    state.social.pendingFriendRequests=Array.isArray(snapshot.incoming)
      ? clone(snapshot.incoming)
      : [];

    state.social.outgoingFriendRequests=Array.isArray(snapshot.outgoing)
      ? clone(snapshot.outgoing)
      : [];

    state.social.cloudSynced=true;
    state.social.cloudSyncedAt=snapshot.generatedAt||new Date().toISOString();

    save();

    window.dispatchEvent(new CustomEvent("brainilab:datachange",{
      detail:{type:"friends_cloud",snapshot:clone(snapshot)}
    }));

    return socialState();
  }


  function syncCloudGroups(snapshot){
    if(!snapshot) return socialState();

    state.social.groups=Array.isArray(snapshot.groups)
      ? clone(snapshot.groups)
      : [];

    state.social.groupInvites=Array.isArray(snapshot.receivedInvites)
      ? clone(snapshot.receivedInvites)
      : [];

    state.social.cloudGroupsSynced=true;
    state.social.cloudGroupsSyncedAt=
      snapshot.generatedAt||new Date().toISOString();

    save();

    window.dispatchEvent(new CustomEvent("brainilab:datachange",{
      detail:{type:"groups_cloud",snapshot:clone(snapshot)}
    }));

    return socialState();
  }

  function clearExternalAuthUser(){
    const previous=state.auth?.user?.id||null;
    // Signing out must not upload the previous account's local history as a
    // fresh guest on a shared device. Its canonical results remain in Supabase.
    resetPlayerIdentity();
    state.auth={
      status:"guest",
      anonymousPlayerId:state.auth?.anonymousPlayerId || makeAnonId(),
      user:null,
      provider:null,
      cloudSync:false,
      leaderboard:{enabled:false,displayName:null}
    };
    state.player.id="local-player-"+Math.random().toString(36).slice(2,7);

    if(state.social?.cloudSynced || state.social?.cloudGroupsSynced){
      state.social.friendCode="BRN-LOCAL";
      state.social.friends=[];
      state.social.pendingFriendRequests=[];
      state.social.outgoingFriendRequests=[];
      state.social.groups=[];
      state.social.groupInvites=[];
      state.social.cloudSynced=false;
      state.social.cloudGroupsSynced=false;
    }

    track("supabase_auth_cleared",{previousUser:previous});
    save();
    window.dispatchEvent(new CustomEvent("brainilab:authchange",{detail:{status:"guest",source:"supabase"}}));
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{detail:{type:"auth"}}));
    return authState();
  }

  function resetMock(){
    state=clone(defaultState);
    state.daily.key=todayKey(); state.daily.number=dailyNumber();
    save();
    window.dispatchEvent(new CustomEvent("brainilab:datachange",{detail:{type:"reset"}}));
  }

  // Future-compatible async repository surface.
  const api = {
    syncExternalGuestUser:async user=>syncExternalGuestUser(user),
    completeGuestClaim:async claim=>completeGuestClaim(claim),
    getAnytimeHistory: async scope => anytimeHistory(scope),
    getAnytimePlayedIds: async scope => anytimePlayedIds(scope),
    recordAnytimeHistory: async (scope,ids) => recordAnytimeHistory(scope,ids),
    getGame: async gameId => game(gameId),
    getAuthState: async () => authState(),
    isAuthenticated: async () => isAuthenticated(),
    getPlayer: async () => player(),
    getDaily: async () => daily(),
    getPersonalBest: async gameId => personalBest(gameId),
    getRecentResults: async gameId => recentResults(gameId),
    bindResultOwner: async (id,userId) => bindResultOwner(id,userId),
    getPendingCloudResults: async () => pendingCloudResults(),
    syncDailyChallengeMeta: async daily => syncDailyChallengeMeta(daily),
    getPendingDailyVerifications: async () => pendingDailyVerifications(),
    getPendingDailyGameVerifications: async () => pendingDailyGameVerifications(),
    markDailyGameVerified: async (clientResultId,verification) => markDailyGameVerified(clientResultId,verification),
    markResultDailyVerified: async (clientResultId,verification) => markResultDailyVerified(clientResultId,verification),
    getPendingAnswerVerifications: async () => pendingAnswerVerifications(),
    markResultAnswerVerified: async (clientResultId,verification) => markResultAnswerVerified(clientResultId,verification),
    markResultCloudSynced: async (clientResultId,cloud) => markResultCloudSynced(clientResultId,cloud),
    getCollectiveStats: async gameId => collectiveStats(gameId),
    getLeaderboard: async gameId => leaderboard(gameId),
    getSocialState: async () => socialState(),
    getFriends: async () => friends(),
    getPendingFriendRequests: async () => pendingFriendRequests(),
    getGroups: async () => groups(),
    createFriendInvite: async () => createFriendInvite(),
    sendFriendRequest: async code => sendFriendRequest(code),
    acceptFriendRequest: async requestId => acceptFriendRequest(requestId),
    removeFriend: async friendId => removeFriend(friendId),
    createGroup: async payload => createGroup(payload),
    updateGroup: async (groupId,patch) => updateGroup(groupId,patch),
    leaveGroup: async groupId => leaveGroup(groupId),
    getRankings: async filters => getRankings(filters),
    submitGameResult: async (gameId,payload) => submitGameResultHybrid(gameId,payload),
    recordShare: async (gameId,channel,context) => recordShare(gameId,channel,context),
    track: async (event,props) => track(event,props),
    getShareUrl: async (gameId,channel) => shareUrl(gameId,channel),
    requestMagicLink: async email => requestMagicLink(email),
    completeMockSignIn: async (provider,profile) => completeMockSignIn(provider,profile),
    signOut: async () => signOut(),
    updatePlayerProfile: async patch => updatePlayerProfile(patch),
    setAvatarDesign: async value => setAvatarDesign(value),
    joinLeaderboard: async displayName => joinLeaderboard(displayName),
    leaveLeaderboard: async () => leaveLeaderboard(),
    submitSuggestion: async payload => submitSuggestion(payload),
    syncExternalAuthUser: async (user,provider) => syncExternalAuthUser(user,provider),
    syncCloudProfile: async profile => syncCloudProfile(profile),
    syncCloudProgression: async summary => syncCloudProgression(summary),
    syncCloudFriends: async snapshot => syncCloudFriends(snapshot),
    syncCloudGroups: async snapshot => syncCloudGroups(snapshot),
    clearExternalAuthUser: async () => clearExternalAuthUser()
  };

  return {
    api,
    game,player,daily,personalBest,recentResults,anytimeHistory,anytimePlayedIds,recordAnytimeHistory,collectiveStats,leaderboard,
    friends,pendingFriendRequests,groups,socialState,getRankings,createFriendInvite,
    authState,isAuthenticated,accountSnapshot,
    completeMockSignIn,requestMagicLink,signOut,updatePlayerProfile,joinLeaderboard,leaveLeaderboard,submitSuggestion,syncExternalAuthUser,syncCloudProfile,syncCloudProgression,syncCloudFriends,syncCloudGroups,clearExternalAuthUser,
    recordGameResult,submitGameResultHybrid,pendingCloudResults,markResultCloudSynced,pendingAnswerVerifications,markResultAnswerVerified,syncDailyChallengeMeta,pendingDailyVerifications,markResultDailyVerified,pendingDailyGameVerifications,markDailyGameVerified,recordShare,track,shareUrl,resetMock,
    getState:()=>clone(state),
    getCollective:()=>clone(collective),
    todayKey,dailyNumber,dailyNumberForDate,pastDailyDate,dateForDailyNumber,
    dailyGameIdsForDate,dailyGameIdsForNumber,DAILY_ROTATION_START,
    dailyPointsForResult:scoreForDaily,
    setDailyBonusChoice(id){state.daily.bonusChoice=id||null;save();},
    DAILY_GAME_IDS:dailyGameIdsForDate(todayKey())
  };
})();

/* ===== share.js ===== */


/*
 BrainiLab Share Layer
 ---------------------
 Shared modal + text/image generation for all game types.
 Depends on BrainiData.
*/
window.BrainiShare = (function(){
  let modal;

  function bindEscCloser(node){
    if(node.__escBound) return;
    node.__escBound = true;
    node.addEventListener("keydown", e=>{
      if(e.key === "Escape"){
        node.classList.remove("show");
      }
    });
  }

  function ensureModal(){
    if(modal) return modal;
    modal=document.createElement("div");
    modal.className="share-modal";
    modal.tabIndex=-1;
    modal.innerHTML=`
      <div class="share-sheet share-sheet-compact" role="dialog" aria-modal="true" aria-label="Share result">
        <button class="share-close" type="button" aria-label="Close share options">×</button>
        <div class="share-preview" data-share-preview></div>
        <div class="share-icon-actions" aria-label="Share result options">
          <button class="share-icon-btn whatsapp" data-channel="whatsapp" type="button" aria-label="Share on WhatsApp" title="WhatsApp">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L.2 24l6.5-1.7a11.8 11.8 0 0 0 5.4 1.4h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.1-1.2-6-3.5-8.4Zm-8.4 18.2h-.1a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.9 1 1-3.8-.2-.4a9.8 9.8 0 1 1 8.6 4.8Zm5.4-7.3c-.3-.1-1.8-.9-2.1-1-.3-.1-.5-.1-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5 0-.2-.7-1.8-1-2.4-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.3 3.4 1.5 3.6c.2.2 2.5 3.8 6 5.3.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.4Z"/></svg>
          </button>
          <button class="share-icon-btn telegram" data-channel="telegram" type="button" aria-label="Share on Telegram" title="Telegram">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22.9 2.3 19.5 21c-.3 1.3-1 1.6-2 1l-5.2-3.8-2.5 2.4c-.3.3-.5.5-1 .5l.4-5.3 9.6-8.7c.4-.4-.1-.6-.6-.2L6.3 14.4 1.2 12.8c-1.1-.3-1.1-1.1.2-1.6L21.3 1.5c.9-.3 1.8.2 1.6.8Z"/></svg>
          </button>
          <button class="share-icon-btn x" data-channel="x" type="button" aria-label="Share on X" title="X">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.2 2H22l-8.3 9.5L23.5 22h-7.7l-6-7.8L3 22H-.8l8.9-10.2L-1.3 2h7.9l5.4 7.1L18.2 2Zm-1.4 18h2.1L5.4 3.9H3.1L16.8 20Z"/></svg>
          </button>
          <button class="share-icon-btn facebook" data-channel="facebook" type="button" aria-label="Share on Facebook" title="Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1c0 6 4.4 11 10.1 11.9v-8.4H7.1v-3.5h3V9.5c0-3 1.8-4.7 4.6-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.2h3.4l-.5 3.5h-2.9V24C19.6 23.1 24 18.1 24 12.1Z"/></svg>
          </button>
          <button class="share-icon-btn copy" data-action="copy" type="button" aria-label="Copy result" title="Copy result">
            ${BrainiIcons.product("copy-result","share-system-icon")}
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector(".share-close").onclick=()=>modal.classList.remove("show");
    modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("show")});
    bindEscCloser(modal);
    return modal;
  }

  function emojiGrid(result){
    if(result.gameId==="topicrush") return "";
    if(result.gameId==="brainiword"){
      if(Array.isArray(result.evaluations)){
        return result.evaluations.map(row=>row.map(s=>s==="correct"?"🟩":s==="present"?"🟨":"⬛").join("")).join("\n");
      }
      if(Array.isArray(result.pattern)){
        const rows=[];
        for(let i=0;i<result.pattern.length;i+=5){
          rows.push(result.pattern.slice(i,i+5).map(s=>s==="correct"?"🟩":s==="present"?"🟨":"⬛").join(""));
        }
        return rows.join("\n");
      }
    }
    if(Number.isFinite(result.correct) && Number.isFinite(result.total) && result.total<=20){
      const cells=[];
      for(let i=0;i<result.total;i++) cells.push(i<result.correct?"🟩":"🟥");
      const rows=[];
      for(let i=0;i<cells.length;i+=5) rows.push(cells.slice(i,i+5).join(""));
      return rows.join("\n");
    }
    return "";
  }

  function resultHeadline(gameId,result){
    if(gameId==="brainiword") return result.won ? `${result.attempts}/5` : "X/5";
    if(gameId==="flagdash") return `${result.correct||0} flags`;
    if(gameId==="orderup") return `${Number(result.score||0).toLocaleString()} / 2,500`;
    if(gameId==="topicrush") return `${result.correct||0} answers`;
    if(gameId==="connections") return `${Number(result.score||0).toLocaleString()} / 3,000`;
    if(gameId==="maphunt") return `${(result.score||0).toLocaleString()} pts`;
    if(Number.isFinite(result.correct)&&Number.isFinite(result.total)) return `${result.correct}/${result.total}`;
    if(Number.isFinite(result.score)) return `${result.score.toLocaleString()} pts`;
    return "Completed";
  }

  function extraLines(gameId,result){
    const lines=[];
    if(gameId==="flagdash"){
      if(result.accuracy!=null) lines.push(`${result.accuracy}% accuracy`);
      if(result.bestCombo!=null) lines.push(`🔥 Best combo: ${result.bestCombo}`);
    } else if(gameId==="orderup"){
      if(result.accuracy!=null) lines.push(`${Math.round(Number(result.accuracy))}% order accuracy`);
      if(result.correct!=null) lines.push(`${Number(result.correct)} / 20 exact positions`);
    } else if(gameId==="topicrush"){
      if(result.topicTitle) lines.push(result.topicTitle);
      if(result.score!=null) lines.push(`${Number(result.score).toLocaleString()} Topic Rush points`);
    } else if(gameId==="connections"){
      if(result.attempts!=null) lines.push(`${Number(result.attempts)} total attempts`);
      if(result.score!=null) lines.push(`${Number(result.score).toLocaleString()} Connections points`);
    } else if(gameId==="maphunt"){
      if(result.avgDistanceKm!=null) lines.push(`Average distance: ${result.avgDistanceKm} km`);
      if(result.accuracy!=null) lines.push(`${result.accuracy}% accuracy`);
    } else if(gameId!=="brainiword"){
      if(result.accuracy!=null) lines.push(`${result.accuracy}% accuracy`);
      if(result.score!=null && Number.isFinite(result.correct)) lines.push(`${result.score.toLocaleString()} pts`);
    }
    if(result.percentile!=null) lines.push(`🏆 Top ${result.percentile}%`);
    if(result.streakAfter!=null) lines.push(`🔥 ${result.streakAfter} day streak`);
    return lines;
  }

  async function buildText(gameId,result,channel="native"){
    const def=BrainiData.game(gameId);
    const daily=result.dailyNumber ? ` #${result.dailyNumber}` : "";
    const url=await BrainiData.api.getShareUrl(gameId,channel);
    const grid=emojiGrid(result);
    const parts=[
      `${def?.name||"BrainiLab"}${daily} ${def?.icon||"🧠"}`,
      "",
      resultHeadline(gameId,result)
    ];
    const extras=extraLines(gameId,result);
    if(extras.length) parts.push(...extras);
    if(grid) parts.push("",grid);
    parts.push("","Can you beat me?",url);
    return parts.join("\n");
  }

  function previewHtml(gameId,result){
    const def=BrainiData.game(gameId);
    const daily=result.dailyNumber ? ` #${result.dailyNumber}` : "";
    const grid=emojiGrid(result);
    const extras=extraLines(gameId,result).map(x=>`<div>${x}</div>`).join("");
    return `
      <div class="share-card">
        <div class="share-card-brand">BrainiLab</div>
        <div class="share-card-game">${def?.icon||"🧠"} ${def?.name||"Game"}${daily}</div>
        <div class="share-card-score">${resultHeadline(gameId,result)}</div>
        <div class="share-card-extra">${extras}</div>
        ${grid?`<pre class="share-card-grid">${grid}</pre>`:""}
        <div class="share-card-cta">Can you beat me?</div>
      </div>`;
  }

  function canvasCard(gameId,result,format="square"){
    const w=1080;
    const h=format==="story"?1920:1080;
    const c=document.createElement("canvas");
    c.width=w;c.height=h;
    const ctx=c.getContext("2d");
    const navy="#2D296E", yellow="#FFD813", green="#40AB34", white="#FFFFFF", muted="#D9D7F4";
    ctx.fillStyle=navy;ctx.fillRect(0,0,w,h);

    const colors=["#E6680C","#FFD813","#E52720","#40AB34","#2D296E"];
    colors.forEach((col,i)=>{ctx.fillStyle=col;ctx.fillRect(i*w/5,0,w/5,18)});

    ctx.textAlign="center";
    ctx.fillStyle=white;ctx.font="900 54px Montserrat, Arial";
    ctx.fillText("BrainiLab",w/2,format==="story"?260:150);

    const def=BrainiData.game(gameId);
    ctx.font="800 42px Montserrat, Arial";ctx.fillStyle=muted;
    ctx.fillText(`${def?.name||"Game"}${result.dailyNumber?" #"+result.dailyNumber:""}`,w/2,format==="story"?365:250);

    ctx.fillStyle=yellow;ctx.font="900 118px Montserrat, Arial";
    ctx.fillText(resultHeadline(gameId,result),w/2,format==="story"?650:475);

    let y=format==="story"?770:585;
    ctx.fillStyle=white;ctx.font="800 35px Montserrat, Arial";
    extraLines(gameId,result).forEach(line=>{ctx.fillText(line.replace(/[🏆🔥]/g,""),w/2,y);y+=55});

    const grid=emojiGrid(result);
    if(grid){
      y+=35;
      ctx.font="44px Arial";
      grid.split("\n").forEach(row=>{ctx.fillText(row,w/2,y);y+=62});
    }

    ctx.fillStyle=white;ctx.font="900 38px Montserrat, Arial";
    ctx.fillText("CAN YOU BEAT ME?",w/2,format==="story"?1680:930);
    ctx.fillStyle=green;ctx.fillRect(w/2-190,(format==="story"?1735:965),380,8);
    return c;
  }

  async function nativeShare(gameId,result){
    const text=await buildText(gameId,result,"native");
    if(navigator.share){
      try{
        await navigator.share({title:"BrainiLab result",text});
        await BrainiData.api.recordShare(gameId,"native",{resultId:result.id});
        return true;
      }catch(e){}
    }
    return false;
  }

  async function copyResult(gameId,result){
    const text=await buildText(gameId,result,"copy");
    try{
      await navigator.clipboard.writeText(text);
      showToast("Result copied");
      await BrainiData.api.recordShare(gameId,"copy",{resultId:result.id});
      return true;
    }catch(e){
      showToast("Copy failed");
      return false;
    }
  }

  async function copyLink(gameId,result){
    const url=await BrainiData.api.getShareUrl(gameId,"copy_link");
    try{
      await navigator.clipboard.writeText(url);
      showToast("Link copied");
      await BrainiData.api.recordShare(gameId,"copy_link",{resultId:result?.id});
      return true;
    }catch(e){
      showToast("Copy failed");
      return false;
    }
  }

  async function shareImage(gameId,result){
    const c=canvasCard(gameId,result,window.innerHeight>window.innerWidth?"story":"square");
    const blob=await new Promise(r=>c.toBlob(r,"image/png",.95));
    const file=new File([blob],`brainilab-${gameId}-result.png`,{type:"image/png"});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      try{
        await navigator.share({files:[file],title:"BrainiLab result"});
        await BrainiData.api.recordShare(gameId,"image",{resultId:result.id});
        return true;
      }catch(e){}
    }
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=file.name;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),500);
    await BrainiData.api.recordShare(gameId,"image_download",{resultId:result.id});
    showToast("Image downloaded");
    return true;
  }

  async function channelShare(channel,gameId,result){
    const text=await buildText(gameId,result,channel);
    const url=await BrainiData.api.getShareUrl(gameId,channel);
    const encText=encodeURIComponent(text);
    const encUrl=encodeURIComponent(url);
    let href="";
    if(channel==="whatsapp") href=`https://wa.me/?text=${encText}`;
    if(channel==="telegram") href=`https://t.me/share/url?url=${encUrl}&text=${encodeURIComponent(text.replace(url,"").trim())}`;
    if(channel==="x") href=`https://twitter.com/intent/tweet?text=${encText}`;
    if(channel==="facebook") href=`https://www.facebook.com/sharer/sharer.php?u=${encUrl}`;
    if(href) window.open(href,"_blank","noopener,noreferrer");
    await BrainiData.api.recordShare(gameId,channel,{resultId:result.id});
    return true;
  }

  async function open(gameId,result){
    const m=ensureModal();
    m.querySelector("[data-share-preview]").innerHTML=previewHtml(gameId,result);
    m.classList.add("show");
    m.focus();

    const copy=m.querySelector("[data-action='copy']");

    copy.onclick=()=>copyResult(gameId,result);
    m.querySelectorAll("[data-channel]").forEach(
      b=>b.onclick=()=>channelShare(b.dataset.channel,gameId,result)
    );
  }

  return {
    open, buildText, canvasCard,
    nativeShare, copyResult, copyLink, shareImage, channelShare
  };
})();

/* ===== friend-challenge.js ===== */

/* Voluntary, spoiler-free invitations to the same UTC Daily. No contacts or player IDs. */
window.BrainiFriendChallenge=(()=>{
 const today=()=>new Date().toISOString().slice(0,10);
 const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
 const label=date=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));
 const dateFor=status=>window.BrainiData?.dateForDailyNumber?.(status?.dailyNumber);
 function buildInvite(status,day=today()){
  const date=dateFor(status);
  if(!validDate(date)||date!==day||!Number.isInteger(status?.dailyNumber)||status.dailyNumber<1)return null;
  const model=window.BrainiDailyRules?.model(date);
  if(model?.version==='daily-choice-v1'){
    const primary=status.games?.[model.primary],name=window.BrainiDailyJourney?.META?.[model.primary]?.name||'Daily',score=Math.max(0,Math.min(2500,Number(primary?.points)||0));
    const url='https://brainilabgames.com/daily-quiz/?friend='+date;
    const text=(primary?.completed?`I got ${score.toLocaleString('en-GB')} points in today’s ${name} 😄\nThink you can beat me? Your turn!`:'Fancy a quick challenge? 😄\nTry today’s BrainiLab Daily with me — let’s see who gets the higher score.')+'\n\n'+url;
    return {date,url,text,title:'Your turn! Try today’s Daily',gameId:model.primary,gameName:name,score:primary?.completed?score:null};
  }
  const completed=Math.max(0,Math.min(4,Math.floor(Number(status.completedCount)||0)));
  const score=Math.max(0,Math.min(completed*2500,Math.floor(Number(status.brainScore)||0)));
  const url='https://brainilabgames.com/daily-quiz/?friend='+date;
  const progress=completed===4?`Just finished today’s BrainiLab Daily — ${score.toLocaleString('en-GB')} points 😄\nYour turn! Think you can beat me?`:completed?`I’m trying today’s BrainiLab Daily — ${completed} ${completed===1?'game':'games'} down, ${4-completed} to go 😄\nFancy joining me? Let’s finish all four and compare scores.`:'Fancy a little challenge? 😄\nLet’s try today’s BrainiLab Daily and see who gets the higher score.';
  const text=`${progress}\n\n${url}`;
  return {date,url,text,title:'Try the BrainiLab Daily with me'};
 }
 function invitationState(search=location.search,day=today()){
  const params=new URLSearchParams(search);if(!params.has('friend'))return null;
  const date=params.get('friend');
  if(params.getAll('friend').length!==1||!validDate(date)||date>day)return {kind:'invalid',title:'Let’s play today’s Daily',text:'This invitation is not valid, but today’s challenge is ready below.'};
  if(date<day)return {kind:'expired',title:'A new Daily is ready',text:`That invitation was for ${label(date)}. Today has a different set of games, so compare results from the same day.`};
  return {kind:'current',title:'You’ve been challenged!',text:'Play the same main Daily as your friend, then compare your main-game points. No account needed. Today ends at 00:00 UTC.'};
 }
 function renderInvitation(){
  const root=document.querySelector('[data-friend-invitation]');if(!root)return;
  const state=invitationState();root.hidden=!state;
  if(!state){root.replaceChildren();return;}
  const title=document.createElement('strong'),copy=document.createElement('p');title.textContent=state.title;copy.textContent=state.text;
  root.replaceChildren(title,copy);root.dataset.invitationState=state.kind;
 }
 let modal,opener;
 function ensureModal(){
  if(modal)return modal;
  modal=document.createElement('dialog');modal.className='friend-dialog';modal.setAttribute('aria-labelledby','friend-dialog-title');
  modal.innerHTML='<div class="friend-dialog-head"><h2 id="friend-dialog-title">Challenge a friend</h2><button type="button" data-friend-close aria-label="Close invitation">×</button></div><div class="friend-preview" hidden></div><p>Add their name or a line of your own.</p><label for="friend-invitation-text">Your message</label><textarea id="friend-invitation-text" rows="7" maxlength="3000"></textarea><div class="friend-dialog-actions"><button type="button" data-friend-copy>Copy invitation</button><button type="button" data-friend-share hidden>Share…</button></div><p class="friend-dialog-status" role="status" aria-live="polite"></p><p class="friend-dialog-note">The same Daily is available until 00:00 UTC.</p>';
  document.body.append(modal);
  modal.querySelector('[data-friend-close]').onclick=()=>modal.close();
  modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
  modal.addEventListener('close',()=>{if(opener?.isConnected)opener.focus();});
  return modal;
 }
 function open(status,trigger=document.activeElement){
  const invite=buildInvite(status);if(!invite)return false;
  const dialog=ensureModal(),copy=dialog.querySelector('[data-friend-copy]'),share=dialog.querySelector('[data-friend-share]'),feedback=dialog.querySelector('[role="status"]');
  const preview=dialog.querySelector('.friend-preview');preview.replaceChildren();preview.hidden=!invite.gameId;
  if(invite.gameId){const art=document.createElement('span'),detail=document.createElement('div'),game=document.createElement('strong'),target=document.createElement('span');art.className='friend-preview-art';art.innerHTML=window.BrainiIcons?.game?.(invite.gameId,'mini')||'';game.textContent=invite.gameName;target.textContent=invite.score===null?'Same game. Your turn.':invite.score.toLocaleString('en-GB')+' points to beat';detail.append(game,target);preview.append(art,detail);}
  const field=dialog.querySelector('textarea');field.value=invite.text;feedback.textContent='';copy.textContent='Copy invitation';copy.disabled=false;share.disabled=false;share.hidden=typeof navigator.share!=='function';opener=trigger;
  async function send(method){
   if(invite.date!==today()){feedback.textContent='That Daily has ended. Open today’s Daily to send a fresh invitation.';copy.disabled=true;share.disabled=true;return;}
   const message=field.value.trim();if(!message){feedback.textContent='Write your message first.';field.focus();return;}
   copy.disabled=true;share.disabled=true;
   try{
    if(method==='copy'){if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(message);feedback.textContent='Copied. Paste it into your chat when you’re ready.';copy.textContent='Copied ✓';}
    else{await navigator.share({title:invite.title,text:message});feedback.textContent='Invitation ready to share.';}
    window.dispatchEvent(new CustomEvent('brainilab:friendchallenge',{detail:{method}}));
   }catch(error){
    if(error?.name!=='AbortError'){feedback.textContent='Couldn’t share automatically. Select and copy the invitation above.';field.focus();field.select();}
   }finally{copy.disabled=false;share.disabled=false;}
  }
  copy.onclick=()=>send('copy');share.onclick=()=>send('share');if(!dialog.open)dialog.showModal();copy.focus();return true;
 }
 function mount(container,status){
  if(!container||!buildInvite(status))return;
  container.querySelector('[data-friend-challenge]')?.remove();
  const box=document.createElement('div');box.className='friend-challenge';box.dataset.friendChallenge='';
  const button=document.createElement('button'),note=document.createElement('span');button.type='button';button.textContent='Challenge a friend';note.textContent='Same Daily. No spoilers.';
  button.onclick=()=>{if(!open(status,button)){note.textContent='A new Daily has started.';button.disabled=true;}};
  box.append(button,note);container.append(box);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderInvitation);else renderInvitation();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderInvitation();});
 if(new URLSearchParams(location.search).has('friend'))setInterval(renderInvitation,60000);
 return {buildInvite,invitationState,renderInvitation,open,mount};
})();

/* ===== try-first-runtime.js ===== */

/* BrainiLab Try First runtime — V41.8.0 */
window.BrainiTryFirstRuntime=(function(){
  const P=new URLSearchParams(location.search);
  const active=P.get("try")==="1";
  const today=P.get("today")||BrainiData.todayKey?.()||new Date().toISOString().slice(0,10);
  const ROTATING=new Set(["connections","oddoneout","higherlower","mathrush","numberroute","sequence"]);
  const PATH_TO_GAME={"brain-mix":"brainmix","brainiword":"brainiword","order-up":"orderup","topic-rush":"topicrush","connections":"connections","odd-one-out":"oddoneout","higher-lower":"higherlower","math-rush":"mathrush","number-route":"numberroute","sequence":"sequence"};
  function gameId(){const parts=location.pathname.split("/").filter(Boolean);for(const [slug,id] of Object.entries(PATH_TO_GAME))if(parts.includes(slug))return id;return null}
  function todayHref(){const u=new URL(location.href);u.search="";const id=gameId();if(id&&ROTATING.has(id))u.searchParams.set("daily",today);return u.href}
  function decorate(){
    if(!active) return;
    document.documentElement.classList.add("try-first-active");
    if(!document.querySelector("[data-try-first-banner]")){
      const banner=document.createElement("div");banner.dataset.tryFirstBanner="1";banner.className="try-first-global-banner";
      banner.innerHTML='<strong>Practice round</strong><span>Try the game. Your score, XP and streak stay unchanged.</span>';
      document.body.prepend(banner);
    }
    document.querySelectorAll(".inline-quiz-result-actions,.simple-result-actions").forEach(box=>{
      if(box.querySelector("[data-play-real-daily]"))return;
      const first=box.querySelector("a");
      if(first){first.href=todayHref();first.textContent="Play today’s scored challenge";first.dataset.playRealDaily="1";}
      const back=[...box.querySelectorAll("a")].find(a=>a!==first&&/Choose another|Back to Daily|Continue Daily/i.test(a.textContent||""));
      if(back){back.href="../../daily-quiz/";back.textContent="Back to Daily";}
    });
  }
  if(active){document.addEventListener("DOMContentLoaded",decorate);new MutationObserver(decorate).observe(document.documentElement,{subtree:true,childList:true});}
  return {active,decorate};
})();

/* ===== daily-choice-guard.js ===== */

/* Authoritative eligibility/extra selection before mounting a scored game. */
window.BrainiDailyChoiceGuard=(()=>{
 const paths={brainmix:'brain-mix',brainiword:'brainiword',orderup:'order-up',topicrush:'topic-rush',connections:'connections',oddoneout:'odd-one-out',higherlower:'higher-lower',mathrush:'math-rush',numberroute:'number-route',sequence:'sequence'};
 const params=new URLSearchParams(location.search);
 const game=Object.keys(paths).find(id=>location.pathname.split('/').includes(paths[id]));
 const day=params.get('daily')||new Date().toISOString().slice(0,10);
 const dailyOnly=['brainmix','brainiword','orderup','topicrush'].includes(game);
 const active=!!game&&(params.has('daily')||dailyOnly)&&!params.has('archive')&&params.get('try')!=='1'&&window.BrainiDailyRules?.active(day);
 let pending;
 async function rpc(client,name,args){let timer;try{return await Promise.race([client.rpc(name,args),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Connection timed out')),8000);})]);}finally{clearTimeout(timer);}}
 async function validate(){
  if(!active)return {allowed:true};
  if(day!==new Date().toISOString().slice(0,10))return {allowed:false,message:'That Daily has ended. Pick today’s challenge or play for practice.'};
  const ids=BrainiDailyRules.lineup(day);
  if(!ids.includes(game))return {allowed:false,message:'This game is not in today’s Daily. You can still play another round for practice.'};
  try{
   const client=window.BrainiBackendAuth?.getClient?.();
   if(!client)throw new Error('Connection unavailable');
   const {data,error}=await rpc(client,'get_brainilab_daily_lineup',{p_challenge_date:day});
   if(error)throw error;
   if(data?.rules_version!=='daily-choice-v1'||JSON.stringify(data.games)!==JSON.stringify(ids)||data.max_score!==3500||data.extra_max!==1000)throw new Error('Daily rules are updating');
   if(game!==ids[0]){
    let sessionTimer;
    try{await Promise.race([BrainiBackendAuth.ensurePlayerSession(),new Promise((_,reject)=>{sessionTimer=setTimeout(()=>reject(new Error('Connection timed out')),8000);})]);}finally{clearTimeout(sessionTimer);}
    const chosen=await rpc(client,'choose_brainilab_daily_extra',{p_game_id:game,p_challenge_date:day});
    if(chosen.error)throw chosen.error;
    BrainiData.setDailyBonusChoice(chosen.data.game_id);
   }
   return {allowed:true};
  }catch(error){
   const text=String(error?.message||'');
   return {allowed:false,message:text.includes('already chosen')?'You have already chosen your extra for today.':text.includes('main Daily first')?'Complete the main Daily first. If you just finished, wait for your result to sync.':'Your Daily could not be checked. Please reconnect and try again.'};
  }
 }
 async function check(root){
  if(!active)return false;
  pending ||=validate();
  const result=await pending;
  if(result.allowed)return false;
  const target=root||document.querySelector('.labgame-shell');
  if(target){
   target.innerHTML='<section class="daily-load-error" role="status"><h2>Let’s get you to the right game</h2><p></p><a class="btn" href="/daily-quiz/">Today’s Daily</a> <a class="btn-light" href="/games/">All games</a> <button class="btn-light" type="button">Retry</button></section>';
   target.querySelector('p').textContent=result.message;
   target.querySelector('button').onclick=()=>location.reload();
  }
  return true;
 }
 return {active,check};
})();

/* ===== daily-completion-guard.js ===== */

/* BrainiLab Daily completion guard — V41.8.0
   Prevents a completed rotating Daily challenge being mounted/replayed from a direct URL.
   Server submission is also idempotent/locked by Step 27.
*/
window.BrainiDailyCompletionGuard=(function(){
  const P=new URLSearchParams(location.search);
  const date=P.get("daily");
  if(!date || P.get("archive") || P.get("try")==="1") return {active:false};
  const PATHS={connections:"connections",oddoneout:"odd-one-out",higherlower:"higher-lower",mathrush:"math-rush",numberroute:"number-route",sequence:"sequence"};
  const gameId=Object.entries(PATHS).find(([,slug])=>location.pathname.split("/").includes(slug))?.[0]||null;
  if(!gameId) return {active:false};
  const dailyNumber=BrainiData.dailyNumberForDate?.(date);
  let locked=false;
  function localComplete(){return (BrainiData.recentResults?.(gameId)||[]).some(r=>!r.practice&&Number(r.dailyNumber)===Number(dailyNumber))}
  function showLock(){
    if(locked)return;locked=true;
    const shell=document.querySelector(".labgame-shell");if(!shell)return;
    shell.innerHTML=`<div class="daily-completed-state simple-daily-result"><div class="daily-completed-kicker simple-result-kicker-row"><span>Daily #${Number(dailyNumber)||""}</span><strong>Completed ✓</strong></div><h1>Already played today</h1><p class="daily-completed-lead">This Daily result is locked. Each scored Daily game can only be completed once.</p><div class="simple-result-actions"><a class="simple-result-play" href="../../daily-quiz/">Back to Daily</a><a class="simple-result-progress" href="../index.html">Play Anytime</a></div></div>`;
  }
  async function check(){
    if(await window.BrainiDailyChoiceGuard?.check?.())return true;
    if(localComplete()){showLock();return true}
    if(window.BrainiCloudGames&&window.BrainiBackendAuth?.isConfigured?.()){
      try{const session=await BrainiBackendAuth.getSession?.();if(session?.user){const rows=await BrainiCloudGames.getMyRecentResults(80);if((rows||[]).some(r=>r.game_id===gameId&&Number(r.daily_number)===Number(dailyNumber))){showLock();return true}}}catch(err){console.warn("BrainiLab Daily completion guard:",err?.message||err)}
    }
    return false;
  }
  return {active:true,gameId,dailyNumber,check,isLocked:()=>locked};
})();

/* ===== ui.js ===== */


/*
 BrainiLab UI hydration from data layer.
 UI components read from BrainiData; when the backend changes,
 these components do not need to know where the data comes from.
*/
window.BrainiUI = (function(){
  function setText(selector,value){
    document.querySelectorAll(selector).forEach(el=>{
      // Data-display selectors must never replace an entire structural component.
      // If an attribute is accidentally reused on a container, skip it instead of
      // destroying all of its child markup with textContent.
      if(el.matches("article,section,main,header,footer,nav,form")){
        console.warn("BrainiLab UI skipped structural setText target:",selector,el);
        return;
      }
      el.textContent=value;
    });
  }

  function renderDailyScoreCards(daily){
    const root=document.querySelector(".brain-score-games");
    if(!root) return;
    const meta={
      brainmix:["Brain Mix","brainmix"],
      orderup:["Order Up","orderup"],
      topicrush:["Topic Rush","topicrush"],
      connections:["Connections","connections"],
      oddoneout:["Odd One Out","odd-one-out"],
      higherlower:["Higher or Lower","higher-lower"],
      mathrush:["Math Rush","math-rush"],
      numberroute:["Number Route","number-route"],
      sequence:["Sequence","sequence"],
      brainiword:["BrainiWord","brainiword"]
    };
    const ids=BrainiData.dailyGameIdsForNumber?.(daily.number)||BrainiData.DAILY_GAME_IDS;
    root.innerHTML=ids.map(id=>{
      const [name,icon]=meta[id]||[id,id];
      return `<article class="brain-score-game" data-daily-item="${id}">
        <div class="brain-score-game-head"><div><span class="brain-score-game-icon">${window.BrainiIcons?.game?BrainiIcons.game(icon,"mini","braini-game-mini"):""}</span><strong>${name}</strong></div><span class="brain-score-game-points" data-item-value>—</span></div>
        <div class="brain-score-game-track"><span data-item-bar style="width:0%"></span></div>
        <small data-item-note>${window.BrainiDailyRules?.model(BrainiData.dateForDailyNumber(daily.number)).primary===id?"Main Daily":"Daily game"} · up to ${(window.BrainiDailyRules?.max(id,BrainiData.dateForDailyNumber(daily.number))||2500).toLocaleString("en-GB")} points</small>
      </article>`;
    }).join("");
  }

  async function hydrate(){
    setText('[data-daily-score-max]','/ '+(window.BrainiDailyRules?.model().maxScore||10000).toLocaleString()+' points');
    const player=await BrainiData.api.getPlayer();
    const daily=await BrainiData.api.getDaily();
    const collective=BrainiData.getCollective();
    renderDailyScoreCards(daily);

    setText("[data-player-streak]",player.currentStreak);
    document.querySelectorAll('.streak').forEach(el=>{
      el.classList.toggle('is-secured',player.streakSecuredToday===true);
      el.title=player.streakSecuredToday?'Daily streak secured for today':player.currentStreak?'Play the main Daily to keep your streak':'Complete the main Daily to start your streak';
      el.setAttribute('aria-label',`${player.currentStreak} day streak. ${el.title}. Days reset at 00:00 UTC.`);
    });
    setText("[data-player-best-streak]",player.bestStreak);
    setText("[data-player-total-games]",player.totalGames.toLocaleString());
    setText("[data-player-total-questions]",player.totalQuestions.toLocaleString());
    setText("[data-player-level]",player.level);
    setText("[data-player-xp]",Number(player.xp||0).toLocaleString());
    setText("[data-player-full-daily]",Number(player.fullDailyCount||0).toLocaleString());

    const cloudProgression=BrainiData.getState().cloudProgression||null;
    const week=cloudProgression?.week||{};
    const month=cloudProgression?.month||{};

    setText("[data-week-brain-score]",Number(week.daily_brain_score||0).toLocaleString());
    setText("[data-week-active-days]",Number(week.active_days||0));
    setText("[data-week-full-dailies]",Number(week.full_daily_count||0));

    setText("[data-month-brain-score]",Number(month.daily_brain_score||0).toLocaleString());
    setText("[data-month-active-days]",Number(month.active_days||0));
    setText("[data-month-full-dailies]",Number(month.full_daily_count||0));

    setText("[data-daily-number]",daily.number);
    setText("[data-daily-score]",daily.brainScore.toLocaleString());
    setText("[data-daily-completed]",daily.completedGames.length);
    setText("[data-daily-total]",(BrainiData.dailyGameIdsForNumber?.(daily.number)||BrainiData.DAILY_GAME_IDS).length);
    document.querySelectorAll("[data-daily-item]").forEach(el=>{
      const id=el.dataset.dailyItem;
      const item=daily.dailyBreakdown?.[id];
      if(!item) return;
      const valueEl=el.querySelector("[data-item-value]");
      const barEl=el.querySelector("[data-item-bar]");
      const noteEl=el.querySelector("[data-item-note]");
      if(valueEl) valueEl.textContent=item.points ? item.points.toLocaleString() : "—";
      if(barEl) barEl.style.width=((item.points||0)/(item.max||2500)*100)+"%";
      if(noteEl) noteEl.textContent=item.label + " · worth up to " + (item.max||2500).toLocaleString();
    });
    const community=collective?.today||{};
    setText("[data-today-active]",community.activePlayers==null?"—":Number(community.activePlayers).toLocaleString());
    setText("[data-today-games]",community.gamesPlayed==null?"—":Number(community.gamesPlayed).toLocaleString());
    setText("[data-today-shares]",community.shares==null?"—":Number(community.shares).toLocaleString());

    document.querySelectorAll("[data-game-players]").forEach(async el=>{
      const s=await BrainiData.api.getCollectiveStats(el.dataset.gamePlayers);
      if(s?.playersToday!=null) el.textContent=s.playersToday.toLocaleString();
    });
  }

  function renderLeaderboard(container,gameId){
    const rows=BrainiData.leaderboard(gameId);
    if(!container) return;
    if(!rows.length){
      container.innerHTML='<div class="sub">Leaderboard data will appear here.</div>';
      return;
    }
    container.innerHTML=rows.map(r=>`
      <div class="data-row ${r.isMe?"is-me":""}">
        <span class="data-rank">#${r.rank}</span>
        <span class="data-name">${r.name}${r.isMe?" · You":""}</span>
        <span class="data-value">${r.score!=null?r.score.toLocaleString():r.correct+" correct"}</span>
      </div>`).join("");
  }

  function renderPlayerSummary(container){
    if(!container) return;
    const p=BrainiData.player(),d=BrainiData.daily();
    container.innerHTML=`
      <div class="player-data-card">
        <div><strong>${p.currentStreak} 🔥</strong><span>Current streak</span></div>
        <div><strong>${d.brainScore.toLocaleString()}</strong><span>Daily Brain Score</span></div>
        <div><strong>${p.totalQuestions.toLocaleString()}</strong><span>Questions answered</span></div>
      </div>`;
  }

  function renderGameStats(container,gameId){
    if(!container) return;
    const collective=BrainiData.collectiveStats(gameId)||{};
    const pb=BrainiData.personalBest(gameId)||{};
    const latest=BrainiData.recentResults(gameId)[0]||null;
    const def=BrainiData.game(gameId);

    let pbText="No personal best yet";
    if(gameId==="brainiword" && pb.attempts) pbText=pb.attempts+"/5";
    else if(gameId==="flagdash" && pb.correct!=null) pbText=pb.correct+" flags";
    else if(gameId==="orderup" && pb.score!=null) pbText=Number(pb.score).toLocaleString()+" pts";
    else if(pb.score!=null) pbText=Number(pb.score).toLocaleString()+" pts";

    let avgText="—";
    if(collective.avgScore!=null) avgText=Number(collective.avgScore).toLocaleString()+" pts";
    else if(collective.avgCorrect!=null) avgText=collective.avgCorrect+" correct";
    else if(collective.avgAttempts!=null) avgText=collective.avgAttempts+" attempts";

    container.innerHTML=`
      <div class="data-strip">
        <div class="data-metric"><strong>${collective.playersToday?.toLocaleString?.()||"—"}</strong><span>Players today</span></div>
        <div class="data-metric"><strong>${avgText}</strong><span>Community average</span></div>
        <div class="data-metric"><strong>${pbText}</strong><span>Your personal best</span></div>
        <div class="data-metric"><strong>${latest?.percentile!=null?"Top "+latest.percentile+"%":"—"}</strong><span>Your latest rank</span></div>
      </div>`;
  }

  function renderRecentResults(container,limit=8,cloudRows=null){
    if(!container) return;
    const rows=(cloudRows||BrainiData.recentResults()).slice(0,limit);
    container.innerHTML=rows.map(r=>{
      const d=BrainiData.game(r.gameId);
      let result="Completed";
      if(r.gameId==="brainiword") result=r.won?r.attempts+"/5":"X/5";
      else if(r.gameId==="flagdash") result=(r.correct||0)+" flags";
      else if(r.gameId==="orderup") result=Number(r.score||0).toLocaleString()+" / 2,500";
      else if(r.score!=null) result=Number(r.score).toLocaleString()+" pts";
      return `<div class="data-row">
        <span class="data-rank">${window.BrainiIcons?.game?.(r.gameId,'mini','recent-game-art')||'●'}</span>
        <span class="data-name">${d?.name||r.gameId}<small style="display:block;color:var(--muted);font-weight:650">${new Date(r.playedAt).toLocaleDateString()}</small></span>
        <span class="data-value">${result}</span>
      </div>`;
    }).join("") || '<div class="sub">No games played yet.</div>';
  }

  window.addEventListener("brainilab:datachange",hydrate);
  document.addEventListener("DOMContentLoaded",hydrate);

  return {hydrate,renderLeaderboard,renderPlayerSummary,renderGameStats,renderRecentResults};
})();

/* ===== progression-ui.js ===== */

/*
  BrainiLab Progression UX — V27
  Academic-style ranks derived from the canonical player level.
*/
window.BrainiProgressUI=(function(){
  const TIERS=[
    {min:1, max:4,  key:"rookie",     name:"Rookie",      icon:"●", halo:"starter"},
    {min:5, max:9,  key:"elementary", name:"Elementary",  icon:"✦", halo:"learner"},
    {min:10,max:14, key:"highschool", name:"High School", icon:"◆", halo:"scholar"},
    {min:15,max:19, key:"college",    name:"College",     icon:"⬟", halo:"graduate"},
    {min:20,max:24, key:"graduate",   name:"Graduate",    icon:"✧", halo:"doctorate"},
    {min:25,max:29, key:"phd",        name:"PhD",         icon:"⬢", halo:"doctorate"},
    {min:30,max:39, key:"researcher", name:"Researcher",  icon:"⌁", halo:"professor"},
    {min:40,max:49, key:"professor",  name:"Professor",   icon:"★", halo:"professor"},
    {min:50,max:59, key:"dean",       name:"Dean",        icon:"♛", halo:"dean"},
    {min:60,max:999,key:"nobel",      name:"Nobel Mind",  icon:"🏅", halo:"laureate"}
  ];

  function tier(level){
    const n=Math.max(1,Number(level||1));
    return TIERS.find(t=>n>=t.min && n<=t.max)||(n>999?TIERS.at(-1):TIERS[0]);
  }

  function nextTier(level){
    const current=tier(level);
    const index=TIERS.indexOf(current);
    return TIERS[index+1]||null;
  }

  function xpForLevel(level){
    const n=Math.max(1,Number(level||1));
    return Math.max(0,Math.ceil(20*Math.pow(n-1,2)));
  }

  function xpProgress(level,xp){
    const value=Number.isFinite(Number(xp))?Math.max(0,Math.floor(Number(xp))):0;
    const n=Math.max(1,Math.floor(Math.sqrt(value/20))+1);
    const start=xpForLevel(n),end=xpForLevel(n+1);
    return {percent:Math.max(0,Math.min(100,(value-start)/(end-start)*100)),
      currentXp:value,nextXp:end,level:n,nextLevel:n+1,
      startXp:start,earnedInLevel:value-start,neededInLevel:end-start,remainingXp:end-value,
      label:`${Math.max(0,end-value).toLocaleString()} XP to level ${n+1}`};
  }

  function avatarClass(level){
    const t=tier(level),n=Math.max(t.min,Math.min(t.max,Number(level)||1));
    const step=Math.min(9,Math.floor((n-t.min)/Math.min(10,t.max-t.min+1)*10));
    return `rank-ring rank-${t.key} rank-step-${step}`;
  }

  function avatarMarkup(initial,level,extraClass=""){
    const t=tier(level);
    return `<span class="rank-avatar ${avatarClass(level)} ${extraClass}" title="${t.name} · Level ${Number(level||1)}">
      ${defaultAvatarMarkup(typeof initial==="object"?initial:undefined)}
    </span>`;
  }

  const escapeAvatar=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function defaultAvatarMarkup(person){
    const identity=BrainiPeople.resolve(person||window.BrainiData?.player?.()||{});
    return `<img class="default-player-avatar" src="${identity.avatar}" width="48" height="48" alt="" title="Illustration inspired by ${escapeAvatar(identity.name)}">`;
  }

  function avatarImageMarkup(person){
    person=person||window.BrainiData?.player?.()||{};
    if(person.avatarDesign?.mode==='built'&&window.BrainiAvatarDesign){
      return BrainiAvatarDesign.markup(person.avatarDesign,person.avatarRenderXp??person.xp).replace('Your illustrated BrainiLab avatar','Illustrated BrainiLab avatar');
    }
    const identity=BrainiPeople.resolve(person);
    try{
      if(person.avatarUrl){
        const url=new URL(person.avatarUrl,location.origin);
        if(['https:','http:'].includes(url.protocol)){
          return `<img src="${escapeAvatar(url.href)}" data-fallback-avatar="${identity.id}" width="48" height="48" alt="">`;
        }
      }
    }catch{}
    return defaultAvatarMarkup(person);
  }

  const paintedAvatars=new WeakMap();
  // Startup, cloud sync and cosmetic events can repeat the same portrait. Keep
  // its decoded image/SVG (including a failed photo's fallback) until it changes.
  function setAvatarMarkup(element,markup){
    const previous=paintedAvatars.get(element);
    if(previous?.markup===markup && previous.child===element.firstChild &&
      previous.count===element.childNodes.length)return false;
    element.innerHTML=markup;
    paintedAvatars.set(element,{markup,child:element.firstChild,count:element.childNodes.length});
    return true;
  }

  function avatarFrameAttribute(person){
    const frame=person?.avatarFrame;
    if(['blue','green','copper','gold','orbit'].includes(frame))return `data-social-frame="${frame}"`;
    // Automatic nicknames keep one recognizable palette everywhere. This is
    // default portrait decoration, never an equipped reward or a profile write.
    const raw=String(person?.identityName||person?.name||person?.displayName||'').trim();
    if(person?.avatarUrl||person?.avatarDesign?.mode==='built'||
      ![BrainiPeople.isLegacy(raw),BrainiPeople.isPreset(raw)].some(Boolean))return '';
    let seed=2166136261;
    for(const letter of BrainiPeople.resolve(person).displayName){seed^=letter.charCodeAt(0);seed=Math.imul(seed,16777619);}
    return `data-default-palette="${(seed>>>0)%8}"`;
  }

  function profileTitleMarkup(person){
    const titles=window.BrainiAvatarDesign?.profileTitles,id=person?.profileTitle;
    const label=titles&&typeof id==='string'&&Object.hasOwn(titles,id)?titles[id]:'';
    return label?`<span class="player-profile-title"><span class="profile-title-context">Profile title: </span>${label}</span>`:'';
  }

  // Failed custom photos retain the same portrait throughout the interface.
  document.addEventListener('error',event=>{
    const image=event.target;
    if(image?.tagName==='IMG' && image.dataset.fallbackAvatar){
      const person=BrainiPeople.PEOPLE.find(p=>p.id===image.dataset.fallbackAvatar);
      delete image.dataset.fallbackAvatar;
      if(person){image.classList.add('default-player-avatar');image.src=person.avatar;}
    }
  },true);

  function ranksMarkup(person,{open=false}={}){
    const progress=xpProgress(person.level,person.xp),current=tier(progress.level);
    return `<details class="profile-ranks" ${open?'open':''}><summary data-ranks-toggle>Level ranks <span aria-hidden="true">+</span></summary>
      <p>Your level unlocks these ranks. Choose your avatar frame and profile title in My Avatar.</p>
      <ol class="profile-rank-journey">${TIERS.map(t=>{
        const reached=progress.level>=t.min,active=t.key===current.key;
        return `<li class="${active?'is-current':reached?'is-reached':'is-ahead'}" ${active?'aria-current="step"':''}>
          <span class="rank-avatar ${avatarClass(active?progress.level:t.min)}" aria-hidden="true">${avatarImageMarkup(person)}</span>
          <span><strong>${t.name}</strong><small>Level ${t.min}</small></span>
          <b>${active?'Your rank':reached?'Reached':'Ahead'}</b></li>`;
      }).join('')}</ol></details>`;
  }

  function badgeMarkup(level){
    const t=tier(level);
    return `<span class="brain-rank-badge rank-${t.key}">
      <span class="brain-rank-icon">${BrainiIcons.rankHalo(t.halo,"brain-rank-halo")}</span>
      ${t.name}
      <small>Lv ${Number(level||1)}</small>
    </span>`;
  }

  function xpEarned(correct){
    return 50+Math.min(50,Math.max(0,Number(correct||0)))*5;
  }

  function rankStorageKey(){
    const auth=window.BrainiData?.authState?.();
    const id=auth?.user?.id||"guest";
    return `brainilab-rank-tier-v38-${id}`;
  }

  function showRankUp(level){
    const current=tier(level);

    document.querySelector(".rank-up-toast")?.remove();

    const el=document.createElement("aside");
    el.className=`rank-up-toast rank-${current.key}`;
    el.setAttribute("role","status");
    el.innerHTML=`
      <button
        type="button"
        class="rank-up-close"
        aria-label="Close rank celebration"
      >×</button>

      <span class="rank-up-kicker">NEW BRAIN RANK UNLOCKED</span>

      <div class="rank-up-main">
        <span class="brain-rank-icon">${BrainiIcons.rankHalo(current.halo,"brain-rank-halo")}</span>
        <div>
          <strong>${current.name}</strong>
          <small>Level ${Number(level||1)}</small>
        </div>
      </div>

      <p>
        Your BrainiLab rank just moved up.
        Keep playing to reach the next tier.
      </p>
    `;

    document.body.appendChild(el);

    const close=()=>el.remove();
    el.querySelector(".rank-up-close")?.addEventListener("click",close);

    requestAnimationFrame(
      ()=>el.classList.add("show")
    );

    setTimeout(close,6500);
  }

  function rememberRank(level,{celebrate=true}={}){
    const current=tier(level);
    const key=rankStorageKey();

    let previous=null;
    try{
      previous=localStorage.getItem(key);
    }catch(err){}

    const previousIndex=TIERS.findIndex(
      x=>x.key===previous
    );
    const currentIndex=TIERS.findIndex(
      x=>x.key===current.key
    );

    try{
      localStorage.setItem(key,current.key);
    }catch(err){}

    if(
      celebrate &&
      previous &&
      previousIndex>=0 &&
      currentIndex>previousIndex
    ){
      showRankUp(level);
    }
  }

  function watchRankUps(){
    // Store a baseline on page load. Existing high-rank players do not
    // receive a fake "unlock" just because they opened a new page.
    const initial=window.BrainiData?.player?.();
    if(initial?.level){
      rememberRank(initial.level,{celebrate:false});
    }

    window.addEventListener(
      "brainilab:progressionchange",
      event=>{
        const level=
          event.detail?.summary?.progression?.level
          || window.BrainiData?.player?.()?.level;

        if(level){
          rememberRank(level,{celebrate:true});
        }
      }
    );
  }

  if(document.readyState==="loading"){
    document.addEventListener(
      "DOMContentLoaded",
      watchRankUps,
      {once:true}
    );
  }else{
    queueMicrotask(watchRankUps);
  }

  return {
    TIERS,tier,nextTier,xpForLevel,xpProgress,
    avatarClass,avatarMarkup,defaultAvatarMarkup,avatarImageMarkup,setAvatarMarkup,avatarFrameAttribute,profileTitleMarkup,ranksMarkup,badgeMarkup,xpEarned,
    showRankUp,rememberRank
  };
})();

/* ===== continuity.js ===== */

/* A single, server-backed view of Daily continuity and earned rewards. */
window.BrainiContinuity=(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const count=value=>Math.max(0,Math.floor(Number(value)||0));
  const milestones=[3,7,14,30,60,100,180,365];
  function displaySummary(now=new Date()){
    const state=window.BrainiData?.getState?.(),owner=state?.auth?.user?.id||state?.auth?.guestUserId;
    const current=window.BrainiProgression?.getCached?.();
    const saved=state?.cloudProgression?.streakSnapshot;
    const known=[current,saved].find(s=>s?.progression?.user_id===owner&&owner);
    const today=now.toISOString().slice(0,10);
    if(known?.continuity?.today===today)return known;
    const p=window.BrainiData?.player?.()||{};
    const yesterday=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-1)).toISOString().slice(0,10);
    const active=p.lastStreakDate>=yesterday&&p.lastStreakDate<=today?count(p.currentStreak):0;
    const days=Array.from({length:7},(_,i)=>{
      const date=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-6+i)).toISOString().slice(0,10);
      return {date,completed:!!known?.continuity?.days?.find(d=>d.date===date)?.completed};
    });
    return {progression:{current_streak:active,best_streak:p.bestStreak||0,xp:p.xp||0},continuity:{today,reset_at:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1)).toISOString(),completed_today:p.lastStreakDate===today&&active>0,days}};
  }
  function markup({summary=displaySummary(),now=new Date(),compact=false}={}){
    const continuity=summary?.continuity,p=summary?.progression;
    // Do not present stale cached dates or browser-only scores as a secured day.
    if(!continuity||!p||continuity.today!==now.toISOString().slice(0,10))return '';
    const streak=count(p.current_streak),best=count(p.best_streak),secured=!!continuity.completed_today;
    const next=milestones.find(n=>n>streak)||Math.ceil((streak+1)/100)*100;
    const remaining=Math.max(0,new Date(continuity.reset_at)-now),hours=Math.floor(remaining/3600000),minutes=Math.floor(remaining%3600000/60000);
    const heading=secured?'Streak secured for today':streak?'Keep your streak going':'Start a new streak';
    const detail=secured?`${streak} ${streak===1?'day':'days'} and counting. Next milestone: ${next} days.`:streak?`The main Daily keeps it going. Today ends in ${hours}h ${minutes}m.`:'Complete the main Daily to start your streak.';
    const days=(continuity.days||[]).map(d=>{const date=new Date(d.date+'T12:00:00Z'),today=d.date===continuity.today;return `<li class="${d.completed?'complete':''} ${today?'today':''}" aria-label="${esc(date.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'}))}: ${d.completed?'completed':today?'not completed yet':'no Daily game'}"><span>${esc(date.toLocaleDateString('en-GB',{weekday:'narrow',timeZone:'UTC'}))}</span><b aria-hidden="true">${d.completed?'✓':today?'•':'–'}</b></li>`;}).join('');
    return `<section class="continuity-card ${secured?'is-secured':''} ${compact?'is-compact':''}" aria-label="Your Daily streak"><div class="continuity-main"><span class="continuity-count" aria-label="${streak} day streak">${BrainiIcons.product('streak','continuity-flame')}<b>${streak}</b></span><div><h2>${heading}</h2>${compact?'':`<p>${detail}</p>`}${best||compact?`<small>Personal best: ${best} ${best===1?'day':'days'}</small>`:''}</div></div><ol class="continuity-week" aria-label="Last seven UTC days">${days}</ol>${secured?'<a class="continuity-action" href="/profile/?section=progress">See your progress →</a>':'<a class="continuity-action" href="/daily-quiz/">Play today’s Daily →</a>'}<span class="continuity-timezone">Daily reset: 00:00 UTC</span></section>`;
  }
  const changes=new Map(),animated=new Set();let previous=null;
  function observeRewards(){
    const summary=window.BrainiProgression?.getCached?.();if(!summary?.progression)return;
    const owner=summary.progression.user_id;
    if(previous&&previous.progression.user_id!==owner){changes.clear();animated.clear();}
    if(previous&&owner&&previous.progression.user_id===owner){
      const known=new Set((previous.recent_rewards||[]).filter(r=>r.verified).map(r=>r.client_result_id));
      const fresh=(summary.recent_rewards||[]).filter(r=>r.verified&&!known.has(r.client_result_id));
      if(fresh.length===1&&Number(summary.progression.xp)>Number(previous.progression.xp))changes.set(fresh[0].client_result_id,{before:Number(previous.progression.xp),after:Number(summary.progression.xp)});
    }
    previous=summary;
  }
  function rewardMarkup(result){
    if(result?.practice||result?.tryFirst)return '<p class="post-reward-note">Practice round · no XP or streak changes</p>';
    if(!result?.clientResultId)return '';
    const auth=window.BrainiData?.getState?.()?.auth||window.BrainiData?.authState?.()||{},owner=auth.user?.id||auth.guestUserId;
    const summary=window.BrainiProgression?.getCached?.();
    const validOwner=!summary?.progression?.user_id||owner===summary.progression.user_id;
    const reward=validOwner&&summary?.recent_rewards?.find(r=>r.client_result_id===result.clientResultId);
    if(!reward?.verified){
      if(auth.status!=='authenticated')return '<p class="post-reward-note">Playing as a guest. <a data-post-action="progress" href="/profile/?section=progress">Sign in to keep your progress across devices</a>.</p>';
      const saved=window.BrainiData?.recentResults?.(result.gameId)?.find(r=>r.clientResultId===result.clientResultId)||result;
      const checked=saved.answersVerified===true||[saved.answerVerificationStatus,saved.dailyAnswerVerificationStatus,saved.dailyGameVerificationStatus].includes('verified');
      if(window.BrainiProgression?.getLastError?.())return '<p class="post-reward-note">Your result is saved. Progress is temporarily unavailable. <button type="button" class="post-refresh-progress" data-refresh-progress>Refresh progress</button></p>';
      if(checked)return '<p class="post-reward-note">Your result is saved. <a href="/profile/?section=progress">See your progress</a>.</p>';
      return `<p class="post-reward-note" role="status">${saved.cloudSyncStatus==='synced'?'Your score is saved. We’re checking your XP.':'Saved on this device. Waiting to sync.'}</p>`;
    }
    const p=summary.progression,progress=BrainiProgressUI.xpProgress(p.level,p.xp),change=changes.get(result.clientResultId),before=change&&BrainiProgressUI.xpProgress(1,change.before),up=before&&progress.level>before.level;
    const player=window.BrainiData?.player?.()||{};
    const avatar=`<span class="rank-avatar ${BrainiProgressUI.avatarClass(progress.level)}">${BrainiProgressUI.avatarImageMarkup(player)}</span>`;
    const today=new Date().toISOString().slice(0,10),model=window.BrainiDailyRules?.model(today);
    const main=Number(result.dailyNumber)>0&&window.BrainiData?.dateForDailyNumber?.(Number(result.dailyNumber))===today&&model?.primary===result.gameId;
    const secured=main&&summary.continuity?.today===today&&summary.continuity.completed_today;
    return `<a class="post-reward ${up?'is-level-up':''}" href="/profile/?section=progress" data-reward-id="${esc(result.clientResultId)}"><span class="post-reward-identity">${avatar}<span><span class="post-reward-label">${up?'New level!':'Your progress'}</span><strong>Level ${progress.level}</strong><small>${esc(BrainiProgressUI.tier(progress.level).name)}</small></span><b class="post-earned">${reward.daily_limit_reached?'XP complete':'+'+count(reward.xp)+' XP'}</b></span><span class="post-xp-label"><b>${Number(p.xp).toLocaleString()} XP</b><span>${esc(progress.label)}</span></span><i class="post-xp-track" role="progressbar" aria-label="Progress to level ${progress.nextLevel}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress.percent)}"><i style="width:${progress.percent}%;--xp-from:${before&&before.level===progress.level?before.percent:progress.percent}%"></i></i>${secured?`<span class="post-streak-earned">${BrainiIcons.product('streak','post-streak-flame')}<strong>${count(p.current_streak)} ${count(p.current_streak)===1?'day':'days'}</strong><span>Daily complete</span></span>`:''}${reward.daily_limit_reached?'<small>You can still improve your score. Try another game for more XP.</small>':''}</a>`;
  }
  function animateReward(root){
    const card=root?.querySelector('[data-reward-id]');if(!card)return;
    const id=card.dataset.rewardId;if(animated.has(id)||!changes.has(id))return;
    animated.add(id);card.classList.add('is-fresh');
  }
  function render(){
    observeRewards();
    window.BrainiUI?.hydrate?.();
    document.querySelectorAll('[data-braini-continuity]').forEach(el=>{el.innerHTML=markup({compact:el.dataset.brainiContinuity==='compact'});el.hidden=!el.innerHTML;});
    document.querySelectorAll('[data-result-reward]').forEach(el=>{if(el.dataset.resultReward){const html=rewardMarkup({clientResultId:el.dataset.resultReward,gameId:el.dataset.resultGame,dailyNumber:Number(el.dataset.resultDaily)});if(el.dataset.rewardHtml!==html){const restoreFocus=el.querySelector('[data-refresh-progress]')===document.activeElement;el.innerHTML=html;el.dataset.rewardHtml=html;animateReward(el);if(restoreFocus)(el.querySelector('[data-refresh-progress]')||el.querySelector('a'))?.focus({preventScroll:true});}}});
  }
  render(); // Deferred shell runs after HTML parsing, before cloud requests complete.
  document.addEventListener('DOMContentLoaded',render);
  window.addEventListener('brainilab:authchange',render);
  window.addEventListener('brainilab:progressionchange',render);
  window.addEventListener('brainilab:progressionsync',render);
  document.addEventListener('click',async event=>{
    const button=event.target.closest?.('[data-refresh-progress]');
    if(!button||button.disabled)return;
    button.disabled=true;button.textContent='Updating…';
    try{await window.BrainiProgression?.sync?.({fresh:true});}
    finally{render();if(button.isConnected){button.disabled=false;button.textContent='Refresh progress';}}
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();const cached=window.BrainiProgression?.getCached?.();if(cached?.continuity?.today!==new Date().toISOString().slice(0,10))window.BrainiProgression?.sync?.();}});
  function scheduleReset(){
    const now=new Date(),next=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1);
    setTimeout(()=>{render();window.dispatchEvent(new CustomEvent('brainilab:daychange'));window.BrainiProgression?.sync?.();scheduleReset();},next-now+1000);
  }
  scheduleReset();
  return {markup,rewardMarkup,render,displaySummary,animateReward};
})();

/* ===== post-game.js ===== */

/* Shared result presentation. Game saves and scoring stay with their existing owners. */
window.BrainiPostGame=(()=>{
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
 const localHref=(href,fallback='/games/')=>typeof href==='string'&&/^\/(?!\/)/.test(href)&&!/[\\<>]/.test(href)?href:fallback;
 const mounted=new Map();
 const invitations=new Map(),dismissed=new WeakSet();
 function inviteAccount(container,{practice=false,gameId='brainmix'}={}){
  if(!container)return;
  for(const root of invitations.keys())if(!root.isConnected)invitations.delete(root);
  invitations.set(container,{practice,gameId});
  const signedIn=window.BrainiData?.authState?.()?.status==='authenticated';
  if(signedIn||dismissed.has(container)){container.replaceChildren();container.hidden=true;return;}
  if(container.querySelector('[data-join-account]'))return;
  container.hidden=false;
  container.innerHTML=`<aside class="post-account-invite" aria-label="Free BrainiLab account"><div><p class="post-account-kicker">Free to join</p><h3>Keep your progress.</h3><p>Keep your scores across devices and pick up your Academy lessons where you left off.</p>${practice?'<small>This practice round stays on this page.</small>':''}</div><div class="post-account-actions"><button type="button" data-join-account>Create free account <span aria-hidden="true">→</span></button><button type="button" data-dismiss-account>Not now</button></div><p role="status" data-account-error hidden></p></aside>`;
  container.querySelector('[data-dismiss-account]').onclick=()=>{dismissed.add(container);container.hidden=true;const fallback=container.closest('.post-game')?.querySelector('.post-primary')||container.parentElement.querySelector('a');fallback?.focus();};
  container.querySelector('[data-join-account]').onclick=async event=>{
   const button=event.currentTarget,error=container.querySelector('[data-account-error]');
   button.disabled=true;error.hidden=true;
   window.BrainiSiteAnalytics?.accountPrompt?.('click',practice?'practice_result':'game_result',gameId);
   try{
    if(!window.BrainiAuth?.open)await window.BrainiPerf?.ensureCloud?.();
    if(!window.BrainiAuth?.open)throw Error('Sign-in unavailable');
    window.BrainiAuth.open({source:practice?'practice_result':'game_result',mode:'signup'});
    window.BrainiSiteAnalytics?.accountPrompt?.('open',practice?'practice_result':'game_result',gameId);
   }catch{error.hidden=false;error.textContent='We couldn’t open sign-in. Please try again. Your result is still here.';}
   finally{button.disabled=false;}
  };
 }
 function refreshInvitations(){for(const [root,options]of invitations){if(!root.isConnected){invitations.delete(root);continue;}inviteAccount(root,options);}}
 window.addEventListener('brainilab:authchange',refreshInvitations);
 const guides={worldflags:{slug:'how-to-learn-world-flags',title:'Spot the clues in a flag'},generalknowledge:{slug:'why-2100-is-not-a-leap-year',title:'The leap-year rule with a twist'},mathrush:{slug:'multiply-by-11-in-your-head',title:'Try a mental-maths shortcut'}};
 function review(answers=[]){
  if(!answers.length)return '';
  const rows=answers.map((a,i)=>({...a,position:a.position||i+1}));
  const missed=rows.filter(a=>!a.isCorrect),correct=rows.filter(a=>a.isCorrect);
  const items=list=>list.map(a=>`<article class="post-answer"><h4>${number(a.position)}. ${esc(a.questionText)}</h4><p class="post-answer-choice">${a.isCorrect?'Correct':a.skipped?'Skipped':'Your answer: '+esc(a.selectedAnswer??'No answer')}</p><p><strong>${esc(a.correctAnswer||'Answer unavailable')}</strong></p>${a.explanation?`<p>${esc(a.explanation)}</p>`:''}</article>`).join('');
  return `<div class="post-review">${missed.length?`<details data-post-missed><summary>Review ${missed.length} ${missed.length===1?'answer':'answers'} to revisit</summary>${items(missed)}</details>`:''}${correct.length?`<details><summary>${missed.length?'Your correct answers':'Review your answers'} · ${correct.length}</summary>${items(correct)}</details>`:''}</div>`;
 }
 const owner=()=>window.BrainiData?.authState?.()?.user?.id||window.BrainiData?.getState?.()?.auth?.user?.id||'guest';
 const verified=r=>r?.answersVerified===true||r?.answerVerificationStatus==='verified'||r?.dailyGameVerificationStatus==='verified'||r?.dailyAnswerVerificationStatus==='verified';
 function localStatus(result){
  if(!result.dailyNumber||result.practice||result.tryFirst)return null;
  const d=window.BrainiData?.daily?.(),day=window.BrainiData?.dateForDailyNumber?.(result.dailyNumber);
  if(!d||Number(d.number)!==Number(result.dailyNumber)||day!==new Date().toISOString().slice(0,10))return null;
  const model=window.BrainiDailyRules?.model(day),ids=window.BrainiData.dailyGameIdsForNumber?.(d.number)||[];
  const games=Object.fromEntries(ids.map(id=>{
   const recent=window.BrainiData.recentResults?.(id)?.find(r=>!r.practice&&Number(r.dailyNumber)===Number(d.number));
   const completed=!!d.completedGames?.includes(id)&&(!recent||verified(recent));
   return [id,{completed,points:d.dailyBreakdown?.[id]?.points||0}];
  }));
  return {dailyNumber:d.number,model,bonusChoice:d.bonusChoice,brainScore:d.brainScore,completedCount:Object.values(games).filter(g=>g.completed).length,dailyIds:ids,games};
 }
 function nextDaily(status){
  if(status?.model?.version==='daily-choice-v1'){
   if(!status.games?.[status.model.primary]?.completed)return {href:'/daily-quiz/',label:'Play the main Daily'};
   if(!status.bonusChoice)return {href:'/daily-quiz/#daily-extras',label:'Choose an optional extra'};
   if(!status.games?.[status.bonusChoice]?.completed)return {href:'/daily-quiz/#daily-extras',label:'Continue your extra'};
   return {href:'/games/',label:'Find another game',complete:true};
  }
  const id=(status?.dailyIds||[]).find(id=>id!=='brainmix'&&!status.games?.[id]?.completed),meta=window.BrainiDailyJourney?.META?.[id];
  if(meta)return {href:'/'+meta.href+(meta.dailyQuery?'?daily='+new Date().toISOString().slice(0,10):''),label:'Play '+meta.name};
  return status?.completedCount>=4?{href:'/games/',label:'Find another game'}:{href:'/daily-quiz/',label:'Continue Daily'};
 }
 function actionMarkup(container,options){
  const {result={},gameId,status:provided,next}=options,practice=result.practice||result.tryFirst;
  const providedDay=provided?.dailyNumber&&window.BrainiData?.dateForDailyNumber?.(provided.dailyNumber);
  const today=new Date().toISOString().slice(0,10),sameOwner=options.owner===owner();
  const resultDay=result.dailyNumber&&window.BrainiData?.dateForDailyNumber?.(result.dailyNumber);
  let status=practice||!sameOwner?null:localStatus(result);
  // A resolved cloud status can be newer than the local cache; only merge the same Daily/account.
  if(!practice&&sameOwner&&providedDay===today&&Number(provided.dailyNumber)===Number(result.dailyNumber)){
   const games={...provided.games,...status?.games};
   for(const [id,g]of Object.entries(provided.games||{}))if(g.completed)games[id]={...games[id],...g};
   status={...provided,...status,games,bonusChoice:status?.bonusChoice||provided.bonusChoice};
  }
  const pending=!practice&&resultDay===today&&(!sameOwner||!status?.games?.[gameId]?.completed);
  const invite=!practice&&!pending&&status&&window.BrainiFriendChallenge?.buildInvite(status);
  const primary=pending?{href:'/daily-quiz/',label:'Back to Daily'}:status&&!practice?nextDaily(status):result.dailyNumber&&!practice?{href:'/daily-quiz/',label:'See today’s Daily'}:next||{href:'/games/',label:'Find another game'};
  const missed=(result.answerDetails||[]).filter(a=>!a.isCorrect).length;
  const reviewFirst=!pending&&!status&&missed>=2&&number(result.correct)<number(result.total)*.6;
  const challengeFirst=primary.complete&&invite;
  const label=reviewFirst?'Review your answers':challengeFirst?'Challenge a friend':primary.label;
  const root=container.querySelector('.post-actions');
  const focused=document.activeElement,restoreFocus=root.contains(focused);
  const focusedAction=restoreFocus?focused.dataset.postAction:null;
  root.innerHTML=`${reviewFirst||challengeFirst?`<button type="button" class="post-primary" data-post-action="${reviewFirst?'review':'challenge'}">${label} <span aria-hidden="true">→</span></button>`:`<a class="post-primary" data-post-action="next" href="${esc(localHref(primary.href))}">${esc(label)} <span aria-hidden="true">→</span></a>`}${reviewFirst||challengeFirst?`<a class="post-secondary" data-post-action="next" href="${esc(localHref(primary.href))}">${esc(primary.label)}</a>`:`<button type="button" class="post-share">${invite?'Challenge a friend':'Share result'}</button>`}`;
  root.querySelector('[data-post-action="review"]')?.addEventListener('click',()=>{const d=container.querySelector('[data-post-missed]');if(d){d.open=true;d.querySelector('summary').focus();d.scrollIntoView?.({block:'nearest',behavior:'instant'});}});
  const share=event=>invite?window.BrainiFriendChallenge.open(status,event.currentTarget):window.BrainiShare?.open(gameId,result);
  root.querySelector('.post-share')?.addEventListener('click',share);root.querySelector('[data-post-action="challenge"]')?.addEventListener('click',share);
  const note=container.querySelector('.post-next-note');
  note.textContent=!pending&&status?.model?.version==='daily-choice-v1'&&status.games?.[status.model.primary]?.completed&&!primary.complete?'Your Daily is done. The extra is up to you.':'';
  note.hidden=!note.textContent;
  if(restoreFocus){const target=focusedAction?Array.from(root.querySelectorAll('[data-post-action]')).find(el=>el.dataset.postAction===focusedAction):root.querySelector('.post-share');(target||root.querySelector('.post-primary'))?.focus({preventScroll:true});}
 }
 const presentation=(value,result)=>typeof value==='function'?value(result):value;
 function scorePresentation(gameId,result){
  const raw=number(result.score??result.points),daily=!!(!result.practice&&!result.tryFirst&&result.dailyNumber);
  const converted=daily&&typeof window.BrainiData?.dailyPointsForResult==='function';
  const points=converted?number(BrainiData.dailyPointsForResult(gameId,result)):raw;
  return {points,label:daily?'Daily points':'Game points',context:converted&&raw!==points?`From ${raw.toLocaleString('en-GB')} game points.`:''};
 }
 function updatePresentation(root,options){
  const result=options.result,headline=presentation(options.headline,result),summary=presentation(options.summary,result);
  const score=root.querySelector('.post-score');
  if(headline!=null)score.textContent=headline;
  else score.innerHTML=options.timed?String(number(result.correct)):result.total?`${number(result.correct)}<span> / ${number(result.total)}</span>`:'Round complete';
  if(summary!=null)root.querySelector('.post-message').textContent=summary;
  const scoring=scorePresentation(options.gameId,result);
  root.querySelector('.post-points strong').textContent=scoring.points.toLocaleString('en-GB');
  root.querySelector('[data-points-label]').textContent=scoring.label;
  const context=root.querySelector('[data-score-context]');
  context.textContent=scoring.context;context.hidden=!scoring.context;
  root.querySelectorAll('.post-metrics div').forEach(stat=>{if(stat.querySelector('dt')?.textContent==='Accuracy')stat.querySelector('dd').textContent=number(result.accuracy)+'%';});
 }
 function resolveStatus(container,options){
  if(!options.resolveDaily||options.result.practice||!options.result.dailyNumber)return;
  Promise.resolve().then(()=>window.BrainiDailyHub?.resolve(options.result.dailyNumber)).then(status=>{
   if(!status||mounted.get(container)!==options||options.owner!==owner()||!container.isConnected)return;
   options.status=status;actionMarkup(container,options);
  }).catch(()=>{/* Keep the local result and navigation when the cloud is unavailable. */});
 }
 function mount(container,options={}){
  if(!container)return;
  const {result={},gameId='brainmix',name='Brain Mix',difficulty='',ads=false,focus=true,timed=false,metrics=[],scoreLabel=null}=options;
  const headline=presentation(options.headline,result),summary=presentation(options.summary,result);
  const correct=number(result.correct),total=number(result.total),practice=result.practice||result.tryFirst;
  const scoring=scorePresentation(gameId,result);
  const message=summary||(timed?(correct?'Time’s up. Here’s how your run went.':'Time’s up. Ready for another go?'):total&&correct===total?'Every answer right. Nicely done.':correct===0?'A fresh set of things to discover.':correct>=total*.8?'Nicely done. A few new discoveries, too.':'There’s always something new to learn.');
  const art=window.BrainiIcons?.game?.(gameId,'mini','post-game-art')||'';
  const guide=options.guide||guides[gameId]||({numberroute:{href:'/learn/paths/mental-maths-foundations/',title:'Build your mental-maths toolkit',kind:'Academy · Start with the basics'},connections:{href:'/learn/connections-puzzles-find-the-hidden-link/',title:'Find a link that fits every clue'},brainiword:{href:'/learn/repeated-letters-in-five-letter-word-games/',title:'When the same letter appears twice'},sequence:{href:'/learn/paths/patterns-and-reasoning/',title:'Find the pattern, then test it',kind:'Academy · Short lessons'},oddoneout:{href:'/learn/sorting-with-two-rules/',title:'Try sorting with two rules'},science:{href:'/learn/paths/sun-moon-and-time/',title:'Make sense of the sky',kind:'Academy · Start with the basics'},history:{href:'/learn/paths/calendars-explained/',title:'Calendars have some curious rules',kind:'Academy · Start with the basics'},sports:{href:'/learn/how-to-read-a-tennis-score/',title:'Why does tennis count 15, 30, 40?'},worldcapitals:{href:'/learn/why-canberra-is-australias-capital/',title:'Why Canberra, not Sydney?'},brainmix:{href:'/learn/paths/',title:'Find your next small discovery',kind:'Explore BrainiLab Academy'}})[gameId],feedbackId=/^[a-z]{1,30}$/.test(gameId)?gameId:'';
  const stats=metrics.length?`<dl class="post-metrics">${metrics.slice(0,3).map(m=>`<div><dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd></div>`).join('')}</dl>`:'';
  container.innerHTML=`<section class="post-game ${practice?'is-practice':''}" aria-label="Game result"><header class="post-heading"><span class="post-art" aria-hidden="true">${art}</span><div><p class="post-kicker">${esc(name)}${difficulty?' · '+esc(difficulty):''}</p><span class="post-complete">${practice?'Practice complete':'Round complete'} <span aria-hidden="true">✓</span></span></div></header><div class="post-score-panel"><h2 tabindex="-1" class="post-score ${headline?'is-word-result':''}">${headline?esc(headline):timed?correct:total?`${correct}<span> / ${total}</span>`:'Round complete'}</h2><p class="post-score-label">${esc(scoreLabel??((total||timed)?'correct answers':''))}</p><p class="post-message">${esc(message)}</p><p class="post-points"><strong>${scoring.points.toLocaleString('en-GB')}</strong> <span data-points-label>${scoring.label}</span>${Number.isFinite(result.timeSec)?'<span> · '+Math.floor(result.timeSec/60)+':'+String(result.timeSec%60).padStart(2,'0')+'</span>':''}</p><p class="post-score-context" data-score-context ${scoring.context?'':'hidden'}>${esc(scoring.context)}</p></div>${stats}<div role="status" aria-live="polite" data-result-reward="${esc(practice?'':result.clientResultId||'')}" data-result-game="${esc(gameId)}" data-result-daily="${number(result.dailyNumber)}">${window.BrainiContinuity?.rewardMarkup?.({...result,gameId})||''}</div><div class="post-actions"></div><p class="post-next-note" hidden></p>${review(result.answerDetails)}${guide?`<a class="post-guide" data-post-action="guide" href="${esc(localHref(guide.href||'/learn/'+guide.slug+'/'))}"><span>${esc(guide.kind||'A little reading')}</span><strong>${esc(guide.title)} →</strong></a>`:''}<div class="post-footer"><a class="post-browse" data-post-action="browse" href="/games/">All games</a><a data-post-action="progress" href="/profile/?section=progress">My progress</a><a data-post-action="feedback" href="/suggestions/?context=post-game&amp;game=${feedbackId}">Give feedback</a></div>${ads?'<div class="brainilab-ad-slot brainilab-ad-slot-result" data-ad-slot="quiz_result" hidden></div>':''}</section>`;
  const liveOptions={...options,owner:owner(),gameId,result};mounted.set(container,liveOptions);actionMarkup(container,liveOptions);resolveStatus(container,liveOptions);
  const invitation=document.createElement('div');invitation.dataset.accountInvite='';container.querySelector('.post-actions').after(invitation);inviteAccount(invitation,{practice:!!practice,gameId});
  const videoSlot=document.createElement('div');videoSlot.hidden=true;videoSlot.dataset.resultVideo='';
  container.querySelector('.post-footer').before(videoSlot);
  window.BrainiRelatedVideo?.mount(videoSlot,{gameId});
  window.BrainiContinuity?.animateReward?.(container.querySelector('[data-result-reward]'));
  if(focus)container.querySelector('.post-score').focus({preventScroll:true});
 }
 function refresh(){for(const [root,options]of mounted){
  if(!root.isConnected||!root.querySelector('.post-actions')){mounted.delete(root);continue;}
  const result=options.result;
  if(options.owner===owner()&&!result.practice&&result.clientResultId){
   const canonical=window.BrainiData?.recentResults?.(options.gameId)?.find(r=>r.clientResultId===result.clientResultId);
   if(verified(canonical)){
    Object.assign(result,canonical);
    updatePresentation(root,options);
   }
  }
  actionMarkup(root,options);
 }}
 window.addEventListener('brainilab:progressionchange',refresh);window.addEventListener('brainilab:daychange',refresh);window.addEventListener('brainilab:datachange',refresh);window.addEventListener('brainilab:authchange',refresh);
 // Render first. Saving and verification must never hold the completed round on screen.
 async function complete(container,options,{save,verify}={}){
  const result=options.result;
  const practice=!!(result.practice||result.tryFirst||new URLSearchParams(location.search).get('try')==='1');
  result.practice=practice;
  mount(container,options);
  container.querySelector('.post-game').scrollIntoView?.({block:'start',behavior:'instant'});
  const reward=container.querySelector('[data-result-reward]');
  const current=()=>container.contains(reward);
  const renderReward=()=>{
   if(!current())return;
   reward.dataset.resultReward=practice?'':result.clientResultId||'';
   reward.innerHTML=window.BrainiContinuity?.rewardMarkup?.({...result,gameId:options.gameId,practice})||'';
   window.BrainiContinuity?.animateReward?.(reward);
  };
  if(!practice)reward.textContent='Saving your result…';
  const timer=!practice?setTimeout(()=>{if(current())reward.textContent='Saving is taking longer than usual. Your result is shown above.';},8000):null;
  let confirmed;
  try{
   confirmed=await save();
   if(!confirmed)throw Error('Result unavailable');
  }catch{
   if(current()&&!practice)reward.textContent='Your score is shown above. Progress could not be saved; please check your connection.';
   return null;
  }finally{clearTimeout(timer);}
  Object.assign(result,confirmed,{practice});
  renderReward();
  refresh();
  try{
   const verified=await verify?.(confirmed);
   if(verified){
    Object.assign(result,verified,{practice});
    if(current()){
     updatePresentation(container,options);
    }
   }
  }catch{/* Saved results stay visible when verification is temporarily unavailable. */}
  renderReward();
  refresh();
  return result;
 }
 return {mount,complete,review,nextDaily,localStatus,refresh,inviteAccount};
})();

/* ===== perf-loader.js ===== */

/*
  BrainiLab Performance Loader — V37
  Loads Supabase/cloud only when a page actually needs it.
*/
window.BrainiPerf=(function(){
  const scriptUrl=document.currentScript?.src||location.href;
  const jsBase=new URL("./",scriptUrl);
  let supabasePromise=null;
  let cloudPromise=null;

  function loadScript(src,attrs={}){
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src===src);
      if(existing){
        if(existing.dataset.loaded==="1" || existing.readyState==="complete"){
          resolve();
          return;
        }
        existing.addEventListener("load",resolve,{once:true});
        existing.addEventListener("error",()=>{
          existing.remove();
          reject(new Error(`Could not load ${src}`));
        },{once:true});
        return;
      }

      const s=document.createElement("script");
      s.src=src;
      s.async=true;
      Object.entries(attrs).forEach(([k,v])=>{
        if(v===true) s.setAttribute(k,"");
        else if(v!==false && v!=null) s.setAttribute(k,String(v));
      });
      s.addEventListener("load",()=>{
        s.dataset.loaded="1";
        resolve();
      },{once:true});
      s.addEventListener("error",()=>{
        s.remove();
        reject(new Error(`Could not load ${src}`));
      },{once:true});
      document.head.appendChild(s);
    });
  }

  function ensureSupabase(){
    if(window.supabase?.createClient) return Promise.resolve();
    if(supabasePromise) return supabasePromise;

    supabasePromise=loadScript(
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
      {crossorigin:"anonymous"}
    ).catch(err=>{
      supabasePromise=null;
      throw err;
    });

    return supabasePromise;
  }

  async function ensureCloud(){
    if(window.BrainiBackendAuth && window.BrainiAuth) return true;
    if(cloudPromise) return cloudPromise;

    cloudPromise=(async()=>{
      await ensureSupabase();
      await loadFeature('cloud.bundle.js');
      window.dispatchEvent(new CustomEvent("brainilab:cloudready"));
      return true;
    })().catch(err=>{
      cloudPromise=null;
      console.warn("BrainiLab cloud bootstrap:",err.message||err);
      return false;
    });

    return cloudPromise;
  }

  function idleCloud(){
    // OAuth callbacks must complete immediately.
    const params=new URLSearchParams(location.search);
    if(params.has("code") || params.has("error")){
      ensureCloud();
      return;
    }

    const run=()=>ensureCloud();
    if("requestIdleCallback" in window){
      requestIdleCallback(run,{timeout:2500});
    }else{
      setTimeout(run,1500);
    }
  }

  // Make account/auth interaction responsive even on otherwise static pages.
  document.addEventListener("pointerdown",e=>{
    if(e.target.closest(".avatar,[data-account-login],[data-account-signup]")){
      ensureCloud();
    }
  },{capture:true,passive:true});


  function installNavigationPrefetch(){
    const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
    if(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType||"")){
      return;
    }

    const seen=new Set();

    document.addEventListener("pointerover",e=>{
      const a=e.target.closest?.("a[href]");
      if(!a) return;

      try{
        const u=new URL(a.href,location.href);
        if(
          u.origin!==location.origin ||
          !["http:","https:"].includes(u.protocol) ||
          u.hash && u.pathname===location.pathname
        ){
          return;
        }

        const key=u.pathname+u.search;
        if(seen.has(key)) return;
        seen.add(key);

        const link=document.createElement("link");
        link.rel="prefetch";
        link.href=u.href;
        link.as="document";
        document.head.appendChild(link);
      }catch(err){}
    },{passive:true});
  }

  function cleanupLocalServiceWorkers(){
    const isLocal=
      location.protocol==="file:"
      || ["localhost","127.0.0.1","::1"]
        .includes(location.hostname);

    if(!isLocal) return;

    if("serviceWorker" in navigator){
      navigator.serviceWorker
        .getRegistrations()
        .then(async registrations=>{
          if(!registrations.length) return;

          await Promise.all(
            registrations.map(
              registration=>
                registration.unregister()
            )
          );

          if(
            navigator.serviceWorker.controller
            && sessionStorage.getItem(
              "brainilab-sw-cleaned-v410"
            )!=="1"
          ){
            sessionStorage.setItem(
              "brainilab-sw-cleaned-v410",
              "1"
            );

            location.reload();
          }
        })
        .catch(()=>{});
    }

    if("caches" in window){
      caches.keys()
        .then(keys=>
          Promise.all(
            keys
              .filter(
                key=>
                  key.startsWith(
                    "brainilab-static-"
                  )
              )
              .map(
                key=>caches.delete(key)
              )
          )
        )
        .catch(()=>{});
    }
  }

  function registerServiceWorker(){
    if(
      window.BRAINI_ENABLE_SW!==true ||
      !("serviceWorker" in navigator) ||
      !["http:","https:"].includes(location.protocol) ||
      ["localhost","127.0.0.1","::1"].includes(location.hostname)
    ){
      return;
    }

    window.addEventListener("load",()=>{
      navigator.serviceWorker.register("/sw.js").catch(err=>{
        console.warn("BrainiLab service worker:",err.message||err);
      });
    },{once:true});
  }

  function loadFeature(filename){
    const url=new URL(filename,jsBase),name=url.pathname.split('/').pop();
    const versions=window.BrainiFeatureVersions;
    const version=url.origin===jsBase.origin&&url.pathname.startsWith(jsBase.pathname)
      &&versions&&Object.hasOwn(versions,name)?versions[name]:null;
    url.searchParams.set('v',version||url.searchParams.get('v')||'37');
    return loadScript(url.href);
  }

  installNavigationPrefetch();
  cleanupLocalServiceWorkers();
  registerServiceWorker();

  return {
    ensureSupabase,
    ensureCloud,
    idleCloud,
    loadFeature,
    jsBase
  };
})();

/* ===== monetization-config.js ===== */

/*
  BrainiLab Monetization public configuration — V39

  Safe browser-side values only.
  NEVER place Stripe secret keys or Supabase secret/service-role keys here.
*/
window.BRAINI_MONETIZATION_CONFIG={
  ads:{
    provider:"adsense",

    // Public account identifier; ad slots remain disabled until configured:
    // publisherId:"ca-pub-1234567890123456"
    publisherId:"ca-pub-5613536700850101",

    slots:{
      home_after_play:"2201740000",
      games_mid_content:"9888658335",
      daily_lower:"",
      quiz_result:"",
      rankings_after_board:"",
      about_lower:""
    },

    // Google CMP / certified CMP remains the consent authority.
    consentProvider:"google_cmp",

    // Initial launch policy: manual display only.
    allowAnchor:false,
    allowVignette:false
  },

  plus:{
    monthlyLabel:"€2.99 / month",
    yearlyLabel:"€24.99 / year",

    checkoutFunction:"create-plus-checkout",
    portalFunction:"create-billing-portal"
  }
};

/* ===== monetization.js ===== */

/*
  BrainiLab Monetization Controller — V39
  Ads / Plus remain OFF until Step 20 flags are explicitly enabled.
*/
window.BrainiMonetization=(function(){
  const config=
    window.BRAINI_MONETIZATION_CONFIG||{ads:{},plus:{}};

  let entitlements={
    plus:false,
    ads_free:false,
    status:"free",
    plan:null,
    current_period_end:null,
    cancel_at_period_end:false,
    cancel_at:null,
    canceled_at:null,
    scheduled_to_cancel:false,
    cancellation_effective_at:null
  };

  let entitlementReady=false;
  let refreshing=null;
  let checkoutBusy=false;
  let checkoutMessage="";
  let checkoutMessageType="info";

  function plusNotice(message,type="info"){
    const text=String(message||"").trim();

    checkoutMessage=text;
    checkoutMessageType=type;

    document
      .querySelectorAll(
        "[data-plus-status]"
      )
      .forEach(node=>{
        node.hidden=!text;
        node.dataset.state=type;
        node.textContent=text;
      });


    if(
      text
      && typeof window.showToast==="function"
    ){
      window.showToast(text);
    }
  }

  function setCheckoutBusy(busy,plan=null){
    checkoutBusy=!!busy;

    document
      .querySelectorAll(
        "[data-plus-checkout]"
      )
      .forEach(button=>{
        const isTarget=
          !plan
          || button.dataset.plusCheckout===plan;

        button.disabled=checkoutBusy;

        if(checkoutBusy && isTarget){
          if(!button.dataset.originalLabel){
            button.dataset.originalLabel=
              button.textContent.trim();
          }

          button.textContent=
            "Opening secure checkout…";
        }else if(
          !checkoutBusy
          && button.dataset.originalLabel
        ){
          button.textContent=
            button.dataset.originalLabel;

          delete button.dataset.originalLabel;
        }
      });

  }

  function auth(){
    return window.BrainiData?.authState?.()||{
      status:"guest"
    };
  }

  function runtimeEnabled(key){
    return !!(
      window.BrainiRuntime?.has?.(key)
      && BrainiRuntime.get(key)?.enabled===true
    );
  }

  function plusEnabled(){
    return runtimeEnabled("plus_enabled");
  }

  function adsEnabled(){
    return runtimeEnabled("ads_enabled");
  }

  function hasPlus(){
    return entitlements.plus===true;
  }

  function adsFree(){
    return entitlements.ads_free===true;
  }

  function canDecideAds(){
    return auth().status!=="authenticated"
      || entitlementReady;
  }

  function snapshot(){
    return {
      plusEnabled:plusEnabled(),
      adsEnabled:adsEnabled(),
      hasPlus:hasPlus(),
      adsFree:adsFree(),
      entitlementReady,
      entitlements:{...entitlements}
    };
  }

  function emit(){
    window.dispatchEvent(
      new CustomEvent(
        "brainilab:monetizationchange",
        {detail:snapshot()}
      )
    );
  }

  async function refresh({forceCloud=false}={}){
    if(refreshing) return refreshing;

    refreshing=(async()=>{
      const current=auth();

      if(current.status!=="authenticated"){
        entitlements={
          plus:false,
          ads_free:false,
          status:"free",
          plan:null,
          current_period_end:null,
          cancel_at_period_end:false,
          cancel_at:null,
          canceled_at:null,
          scheduled_to_cancel:false,
          cancellation_effective_at:null
        };
        entitlementReady=true;
        emit();
        renderAll();
        return snapshot();
      }

      if(
        !window.BrainiMonetizationBackend
        && forceCloud
        && window.BrainiPerf?.ensureCloud
      ){
        await BrainiPerf.ensureCloud();
      }

      if(!window.BrainiMonetizationBackend){
        entitlementReady=false;
        emit();
        return snapshot();
      }

      try{
        const value=
          await BrainiMonetizationBackend
            .getEntitlements();

        entitlements={
          ...entitlements,
          ...(value||{})
        };
        entitlementReady=true;
      }catch(err){
        // Fail closed for logged-in users: do not show ads until entitlement
        // state is known.
        entitlementReady=false;
        console.warn(
          "BrainiLab entitlements:",
          err.message||err
        );
      }

      emit();
      renderAll();
      return snapshot();
    })();

    try{
      return await refreshing;
    }finally{
      refreshing=null;
    }
  }

  function plusHref(){
    return "/plus/";
  }

  function ensureLogin(){
    if(window.BrainiAuth?.open){
      BrainiAuth.open({
        source:"brainilab_plus",
        mode:"signin"
      });
      return;
    }

    window.BrainiPerf
      ?.ensureCloud?.()
      .then(()=>{
        BrainiAuth?.open?.({
          source:"brainilab_plus",
          mode:"signin"
        });
      });
  }

  async function checkout(plan){
    const normalized=
      plan==="yearly"
        ?"yearly"
        :"monthly";

    if(checkoutBusy) return;


    plusNotice(
      "Connecting securely to Stripe…",
      "info"
    );

    BrainiData?.track?.(
      "plus_checkout_started",
      {plan:normalized}
    );

    if(auth().status!=="authenticated"){
      plusNotice(
        "Log in to BrainiLab before choosing a Plus plan.",
        "info"
      );

      ensureLogin();
      return;
    }

    if(!plusEnabled()){
      plusNotice(
        "BrainiLab+ is not available yet. Nothing has been charged.",
        "warning"
      );
      return;
    }

    setCheckoutBusy(
      true,
      normalized
    );

    try{
      if(
        !window.BrainiMonetizationBackend
        && window.BrainiPerf?.ensureCloud
      ){
        await BrainiPerf.ensureCloud();
      }

      if(!window.BrainiMonetizationBackend){
        throw new Error(
          "The payment service could not load. Reload the page and try again."
        );
      }

      const data=
        await BrainiMonetizationBackend
          .createCheckout(
            normalized
          );

      if(!data?.url){
        throw new Error(
          "The checkout could not open. Please try again."
        );
      }

      plusNotice(
        "Opening Stripe secure checkout…",
        "success"
      );

      location.assign(data.url);
    }catch(err){
      console.error(
        "BrainiLab+ checkout:",
        err
      );

      plusNotice(
        err?.message
        || "Could not start Stripe Checkout.",
        "error"
      );

      setCheckoutBusy(false);
    }
  }

  async function openPortal(){
    if(auth().status!=="authenticated"){
      ensureLogin();
      return;
    }

    if(!window.BrainiMonetizationBackend){
      await BrainiPerf?.ensureCloud?.();
    }

    try{
      const data=
        await BrainiMonetizationBackend
          .createPortal();

      if(!data?.url){
        throw new Error(
          "Billing portal URL was not returned"
        );
      }

      location.href=data.url;
    }catch(err){
      console.warn("BrainiLab billing portal:",err);
      plusNotice(
        err?.message
        || "Could not open billing.",
        "error"
      );
    }
  }

  function planName(){
    if(entitlements.plan==="plus_yearly"){
      return "Annual plan";
    }

    if(entitlements.plan==="plus_monthly"){
      return "Monthly plan";
    }

    return "BrainiLab+";
  }

  function dateText(value){
    if(!value) return "";

    const date=new Date(value);
    if(Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(
      undefined,
      {
        year:"numeric",
        month:"short",
        day:"numeric"
      }
    ).format(date);
  }

  function scheduledToCancel(){
    return (
      entitlements.scheduled_to_cancel===true
      || (
        ["active","trialing"].includes(
          String(entitlements.status||"")
        )
        && (
          !!entitlements.cancel_at
          || entitlements.cancel_at_period_end===true
        )
      )
    );
  }

  function cancellationDate(){
    return (
      entitlements.cancellation_effective_at
      || entitlements.cancel_at
      || (
        entitlements.cancel_at_period_end
          ?entitlements.current_period_end
          :null
      )
    );
  }

  function renderAccountCard(){
    document
      .querySelectorAll(
        "[data-plus-account-root]"
      )
      .forEach(root=>{
        if(auth().status!=="authenticated"){
          root.innerHTML=`
            <div class="plus-account-card">
              <div>
                <span>BrainiLab+</span>
                <strong>
                  Sign in to manage BrainiLab+
                </strong>
                <p>
                  Your subscription is tied to your
                  BrainiLab account.
                </p>
              </div>

              <button
                type="button"
                class="btn-light"
                data-plus-login
              >
                Log in
              </button>
            </div>
          `;

          root
            .querySelector("[data-plus-login]")
            ?.addEventListener(
              "click",
              ensureLogin
            );
          return;
        }

        if(!entitlementReady){
          root.innerHTML=`
            <div class="plus-account-card">
              <div>
                <span>BrainiLab+</span>
                <strong>Checking membership…</strong>
              </div>
            </div>
          `;
          return;
        }

        if(hasPlus()){
          const end=
            dateText(
              entitlements.current_period_end
            );

          root.innerHTML=`
            <div class="plus-account-card is-plus">
              <div>
                <span>BrainiLab+</span>
                <strong>${planName()}</strong>
                <p>
                  Thank you for supporting our website and YouTube channel.
                  ${
                    scheduledToCancel()
                      ? (
                          dateText(cancellationDate())
                            ? `Access until ${dateText(cancellationDate())}. Your plan will not renew.`
                            : "Your plan is scheduled to end and will not renew."
                        )
                      : (
                          end
                            ? `Current period ends ${end}.`
                            : ""
                        )
                  }
                </p>
              </div>

              <button
                type="button"
                class="btn-light"
                data-plus-portal
              >
                Manage subscription
              </button>
            </div>
          `;

          root
            .querySelector("[data-plus-portal]")
            ?.addEventListener(
              "click",
              openPortal
            );

          return;
        }

        if(!plusEnabled()){
          root.innerHTML=`
            <div class="plus-account-card">
              <div>
                <span>BrainiLab+</span>
                <strong>Coming soon</strong>
                <p>
                  Our optional supporter membership is not available yet.
                </p>
              </div>
            </div>
          `;
          return;
        }

        root.innerHTML=`
          <div class="plus-account-card">
            <div>
              <span>BrainiLab+</span>
              <strong>Support the creators behind BrainiLab</strong>
              <p>
                Help us create quizzes and videos and improve the website.
                See what membership includes today.
              </p>
            </div>

            <a
              class="btn"
              href="${plusHref()}"
            >
              See BrainiLab+
            </a>
          </div>
        `;
      });
  }

  function renderPlusPage(){
    const root=
      document.querySelector(
        "[data-plus-page-root]"
      );

    if(!root) return;

    const monthly=
      config.plus?.monthlyLabel
      ||"€2.99 / month";

    const yearly=
      config.plus?.yearlyLabel
      ||"€24.99 / year";

    const logged=
      auth().status==="authenticated";

    const active=
      entitlementReady&&hasPlus();

    const salesOpen=plusEnabled();

    let action="";

    if(logged && !entitlementReady){
      action=`
        <div class="plus-current-card">
          <span>MEMBERSHIP STATUS</span>
          <h2>We couldn't verify your membership yet</h2>
          <p>
            Your billing status is protected while BrainiLab reconnects.
            You will not be asked to purchase again until verification succeeds.
          </p>
          <button
            type="button"
            class="btn-light"
            data-plus-retry
          >
            Try again
          </button>
        </div>
      `;
    }else if(active){
      action=`
        <div class="plus-current-card">
          <span>YOUR MEMBERSHIP</span>
          <h2>BrainiLab+ is active</h2>
          <p>
            Thank you for helping us create more content and improve BrainiLab. Your membership is active.
            ${scheduledToCancel()
              ? (
                  dateText(cancellationDate())
                    ? `Your membership will end on ${dateText(cancellationDate())} and will not renew.`
                    : "Your membership is scheduled to end and will not renew."
                )
              : ""
            }
          </p>
          <button
            type="button"
            class="btn-light"
            data-plus-portal
          >
            Manage subscription
          </button>
        </div>
      `;
    }else if(!salesOpen){
      action=`
        <div class="plus-current-card">
          <span>COMING SOON</span>
          <h2>BrainiLab+ is coming soon</h2>
          <p>
            Membership sales are currently disabled.
            Nothing will be charged.
          </p>
        </div>
      `;
    }else{
      action=`
        <div class="plus-pricing-grid">
          <article class="plus-price-card">
            <span>MONTHLY</span>
            <h2>€2.99</h2>
            <p>per month</p>
            <button
              type="button"
              class="btn-light"
              data-plus-checkout="monthly"
            >
              ${logged?"Support BrainiLab monthly":"Log in to support us"}
            </button>
          </article>

          <article class="plus-price-card featured">
            <span>BEST VALUE · ANNUAL</span>
            <h2>€24.99</h2>
            <p>
              per year · about 30% less than monthly
            </p>
            <button
              type="button"
              class="btn"
              data-plus-checkout="yearly"
            >
              ${logged?"Support BrainiLab yearly":"Log in to support us"}
            </button>
          </article>
        </div>
      `;
    }

    root.innerHTML=`
      <section class="plus-hero">
        <span>BrainiLab+ · Support the creators</span>
        <h1>Help us build more BrainiLab.</h1>
        <p>
          Enjoy our quizzes, games, and videos? BrainiLab+ is a way to support
          the people who make them. Your membership helps us create more content,
          improve the website, and keep building our YouTube channel.
          Our existing free games and videos remain available to everyone.
        </p>
      </section>

      ${window.BrainiRuntime?.has?.("ads_enabled") && !adsEnabled()
        ? `<div class="plus-fineprint"><strong>Before you subscribe</strong><span>Ads are currently switched off for everyone. Plus supports BrainiLab today; it will also keep your play free of display ads if advertising is enabled while your membership is active.</span></div>`
        : ""}

      <div class="plus-benefits">
        <article>
          <strong>Ad-free when ads are enabled</strong>
          <p>
            If display advertising is enabled, an active Plus membership
            keeps it off the BrainiLab website. This does not remove ads on YouTube.
          </p>
        </article>

        <article>
          <strong>Help the creators keep building</strong>
          <p>
            Help us spend more time researching quizzes, creating videos,
            and improving the games and website.
          </p>
        </article>

        <article>
          <strong>No competitive advantage</strong>
          <p>
            Plus never gives extra points, attempts,
            XP multipliers or ranking advantages.
          </p>
        </article>
      </div>

      <div
        class="plus-status"
        data-plus-status
        data-state="${checkoutMessageType}"
        role="status"
        aria-live="polite"
        ${checkoutMessage?"":"hidden"}
      >${checkoutMessage}</div>

      ${action}

      <div class="plus-fineprint">
        <strong>Ongoing support, on your terms.</strong>
        <span>
          Monthly: ${monthly}. Annual: ${yearly}.
          Subscriptions renew until canceled. Manage or cancel your subscription
          through your account; billing is handled by Stripe.
        </span>
      </div>
    `;

    root
      .querySelectorAll(
        "[data-plus-checkout]"
      )
      .forEach(button=>{
        button.addEventListener(
          "click",
          ()=>checkout(
            button.dataset.plusCheckout
          )
        );
      });

    root
      .querySelector("[data-plus-portal]")
      ?.addEventListener(
        "click",
        openPortal
      );

    root
      .querySelector("[data-plus-retry]")
      ?.addEventListener(
        "click",
        ()=>refresh({forceCloud:true})
      );

    if(checkoutBusy){
      setCheckoutBusy(true);
    }


    const params=
      new URLSearchParams(location.search);

    if(params.get("checkout")==="success"){
      BrainiData?.track?.(
        "plus_checkout_returned",
        {status:"success"}
      );

      // Webhook remains authoritative. Refresh after a short
      // delay in case Stripe delivery is still in flight.
      setTimeout(
        async()=>{
          const state=
            await refresh({
              forceCloud:true
            });

          if(state?.hasPlus){
            BrainiData?.track?.(
              "plus_checkout_completed",
              {
                plan:
                  state.entitlements?.plan
                  ||null
              }
            );
          }
        },
        1200
      );
    }
  }

  function renderAll(){
    renderAccountCard();
    renderPlusPage();
  }

  async function boot(){
    const current=auth();

    if(
      current.status==="authenticated"
      && !window.BrainiMonetizationBackend
      && window.BrainiPerf?.ensureCloud
    ){
      // Static pages keep this outside critical rendering;
      // cloud may already be loading in idle time.
    }

    await refresh();
  }

  // Capture-phase delegated handler:
  // survives every dynamic Plus-page rerender and cannot lose its listener.
  document.addEventListener(
    "click",
    event=>{
      const button=
        event.target.closest?.(
          "[data-plus-checkout]"
        );

      if(!button) return;

      event.preventDefault();
      event.stopPropagation();

      checkout(
        button.dataset.plusCheckout
      );
    },
    true
  );

  document.addEventListener(
    "click",
    event=>{
      const link=
        event.target.closest?.(
          "[data-manage-privacy]"
        );

      if(!link) return;

      const handler=
        config.ads?.managePrivacy;

      if(typeof handler==="function"){
        event.preventDefault();
        handler();
      }
      // Otherwise the ordinary Cookies / Privacy href remains the fallback.
    }
  );

  window.addEventListener(
    "brainilab:cloudready",
    ()=>refresh()
  );


  window.addEventListener(
    "brainilab:authchange",
    ()=>refresh({forceCloud:true})
  );

  window.addEventListener(
    "brainilab:runtimechange",
    ()=>{
      emit();
      renderAll();
    }
  );

  if(document.readyState==="loading"){
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      {once:true}
    );
  }else{
    queueMicrotask(boot);
  }

  return {
    refresh,
    snapshot,
    plusEnabled,
    adsEnabled,
    hasPlus,
    adsFree,
    canDecideAds,
    checkout,
    openPortal,
    renderAll,
    plusHref
  };
})();

/* ===== ads.js ===== */

/*
  BrainiLab Ads Manager — V39

  Manual display placements only.
  Active gameplay intentionally has no ad slots.
*/
window.BrainiAds=(function(){
  const config=
    window.BRAINI_MONETIZATION_CONFIG?.ads||{};

  const flagForPlacement={
    home_after_play:
      "ad_home_after_play_enabled",

    games_mid_content:
      "ad_games_mid_content_enabled",

    daily_lower:
      "ad_daily_lower_enabled",

    quiz_result:
      "ad_quiz_result_enabled",

    rankings_after_board:
      "ad_rankings_after_board_enabled",

    about_lower:
      "ad_about_lower_enabled"
  };

  let scriptPromise=null;
  let observer=null;

  function productionHost(){
    return ["brainilabgames.com","www.brainilabgames.com"].includes(location.hostname);
  }

  function safeTestHost(){
    const host=String(
      location.hostname||""
    ).toLowerCase();

    if(location.protocol==="file:"){
      return true;
    }

    if(
      host==="localhost"
      || host==="127.0.0.1"
      || host==="::1"
      || host.endsWith(".local")
    ){
      return true;
    }

    // Private LAN ranges for testing from a real phone.
    if(/^10\./.test(host)){
      return true;
    }

    if(/^192\.168\./.test(host)){
      return true;
    }

    const match=
      host.match(
        /^172\.(\d{1,2})\./
      );

    if(
      match
      && Number(match[1])>=16
      && Number(match[1])<=31
    ){
      return true;
    }

    return false;
  }

  function debugMode(){
    const query=
      new URLSearchParams(
        location.search
      ).get("ads_test");

    return (
      query==="1"
      && safeTestHost()
    );
  }

  function eligiblePlacement(name){
    const monetization=
      window.BrainiMonetization;

    if(debugMode()) return true;
    if(!productionHost()) return false;
    if(document.querySelector('#homeQuiz [data-answers]')) return false;
    if(!/^(?:\/(?:index\.html)?|\/games\/(?:index\.html)?|\/daily-quiz\/(?:index\.html)?|\/about\/(?:index\.html)?|\/(?:general-knowledge|geography|science|history|sports)\/[^/]+\/(?:index\.html)?)$/.test(location.pathname)) return false;

    if(!monetization) return false;
    if(!monetization.canDecideAds()) return false;
    if(!monetization.adsEnabled()) return false;
    if(monetization.adsFree()) return false;

    const flag=
      flagForPlacement[name];

    if(!flag) return false;

    return !!(
      window.BrainiRuntime?.has?.(flag)
      && BrainiRuntime.get(flag)?.enabled===true
    );
  }

  function publisherReady(name){
    return !!(
      config.publisherId
      && config.slots?.[name]
    );
  }

  function loadAdSense(){
    if(scriptPromise) return scriptPromise;

    const client=
      String(config.publisherId||"").trim();

    if(!client){
      return Promise.reject(
        new Error(
          "AdSense publisher ID is not configured"
        )
      );
    }

    scriptPromise=
      new Promise((resolve,reject)=>{
        window.googlefc=window.googlefc||{};
        window.googlefc.callbackQueue=window.googlefc.callbackQueue||[];
        window.googlefc.callbackQueue.push({CONSENT_API_READY:()=>{
          if(document.querySelector('[data-google-ad-choices]')) return;
          const footer=document.querySelector('footer');
          if(!footer) return;
          const link=document.createElement('button');
          link.type='button';
          link.className='btn-light';
          link.dataset.googleAdChoices='1';
          link.textContent='Ad privacy choices';
          link.onclick=()=>window.googlefc.callbackQueue.push({CONSENT_API_READY:()=>window.googlefc.showRevocationMessage()});
          footer.appendChild(link);
        }});
        const existing=
          document.querySelector(
            'script[data-brainilab-adsense]'
          );

        if(existing){
          existing.addEventListener(
            "load",
            resolve,
            {once:true}
          );
          existing.addEventListener(
            "error",
            reject,
            {once:true}
          );
          return;
        }

        const script=
          document.createElement("script");

        script.async=true;
        script.crossOrigin="anonymous";
        script.dataset.brainilabAdsense="1";
        script.src=
          "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="
          +encodeURIComponent(client);

        script.onload=resolve;
        script.onerror=()=>reject(
          new Error(
            "Could not load the advertising provider"
          )
        );

        document.head.appendChild(script);
      });

    return scriptPromise;
  }

  function resetSlot(element){
    element.hidden=true;
    element.classList.remove("is-probe","is-active");
    element.innerHTML="";
    delete element.dataset.adRendered;
    delete element.dataset.adRequested;
    delete element.dataset.adObserved;
  }

  function watchFill(ins,name){
    let lastStatus=null;
    const trackStatus=()=>{
      const status=
        ins.getAttribute("data-ad-status");

      if(!status || status===lastStatus) return;
      lastStatus=status;

      // Keep Google's processed unit in place; never request it again.
      // Only collapse a confirmed empty slot, not a delayed consent request.
      const slot=ins.parentElement?.closest('.brainilab-ad-slot[data-ad-slot]');
      if(slot && status==='unfilled') slot.hidden=true;
      else if(slot && status==='filled' && eligiblePlacement(name)) slot.hidden=false;

      window.BrainiData?.track?.(
        status==="filled"
          ?"ad_slot_filled"
          :"ad_slot_unfilled",
        {
          placement:name,
          provider:"adsense"
        }
      );
    };

    const mutation=
      new MutationObserver(trackStatus);

    mutation.observe(
      ins,
      {
        attributes:true,
        attributeFilter:["data-ad-status"]
      }
    );

    // Consent can take longer than 15 seconds. Observe for the unit lifetime.
    trackStatus();
  }

  async function renderSlot(element){
    if(
      !element
      || element.dataset.adRequested==="1"
    ){
      return;
    }

    const name=
      element.dataset.adSlot;

    if(!eligiblePlacement(name)){
      resetSlot(element);
      return;
    }

    element.dataset.adRequested="1";
    element.classList.remove("is-probe");
    element.classList.add("is-active");

    if(debugMode()){
      element.hidden=false;
      element.innerHTML=`
        <div class="brainilab-ad-test">
          <span>AD TEST</span>
          <strong>${name}</strong>
          <small>
            Hidden in production until AdSense IDs
            and runtime flags are configured.
          </small>
        </div>
      `;

      BrainiData?.track?.(
        "ad_slot_viewed",
        {
          placement:name,
          provider:"test"
        }
      );

      return;
    }

    if(!publisherReady(name)){
      // Fail closed: never expose a blank ad shell to users.
      resetSlot(element);
      console.warn(
        `BrainiLab Ads: ${name} has no AdSense slot ID`
      );
      return;
    }

    try{
      await loadAdSense();

      if(
        !eligiblePlacement(name)
        || element.dataset.adRendered==="1"
      ){
        return;
      }

      element.hidden=false;
      element.innerHTML=`
        <div class="brainilab-ad-label">
          Advertisement
        </div>
      `;

      const ins=
        document.createElement("ins");

      ins.className="adsbygoogle";
      ins.style.display="block";
      ins.dataset.adClient=
        config.publisherId;
      ins.dataset.adSlot=
        config.slots[name];
      ins.dataset.adFormat="auto";
      ins.dataset.fullWidthResponsive="true";

      element.appendChild(ins);
      element.dataset.adRendered="1";

      watchFill(ins,name);

      BrainiData?.track?.(
        "ad_slot_viewed",
        {
          placement:name,
          provider:"adsense"
        }
      );

      (
        window.adsbygoogle=
          window.adsbygoogle||[]
      ).push({});
    }catch(err){
      resetSlot(element);
      console.warn(
        "BrainiLab Ads:",
        err.message||err
      );
    }
  }

  function observe(element){
    if(!element || element.dataset.adObserved==="1" || element.dataset.adRequested==="1"){
      return;
    }

    const name=element.dataset.adSlot;

    if(debugMode()){
      element.hidden=false;
      renderSlot(element);
      return;
    }

    if(!eligiblePlacement(name) || !publisherReady(name)){
      resetSlot(element);
      return;
    }

    // A [hidden] element has no layout box and can never intersect.
    // Use a one-pixel invisible probe until the slot approaches viewport.
    element.hidden=false;
    element.classList.add("is-probe");
    element.dataset.adObserved="1";

    if(!("IntersectionObserver" in window)){
      renderSlot(element);
      return;
    }

    if(!observer){
      observer=
        new IntersectionObserver(
          entries=>{
            entries.forEach(entry=>{
              if(entry.isIntersecting){
                renderSlot(entry.target);
                observer.unobserve(entry.target);
              }
            });
          },
          {
            rootMargin:"500px 0px"
          }
        );
    }

    observer.observe(element);
  }

  function scan(root=document){
    root
      .querySelectorAll?.(
        ".brainilab-ad-slot[data-ad-slot]"
      )
      .forEach(observe);
  }

  function reconcile(){
    document
      .querySelectorAll(
        ".brainilab-ad-slot[data-ad-slot]"
      )
      .forEach(element=>{
        const name=
          element.dataset.adSlot;

        if(
          window.BrainiMonetization?.adsFree?.()
          || !eligiblePlacement(name)
        ){
          resetSlot(element);
        }else{
          observe(element);
        }
      });
  }

  function renderDebugIndicator(){
    if(!debugMode()) return;

    const slots=[
      ...document.querySelectorAll(
        ".brainilab-ad-slot[data-ad-slot]"
      )
    ];

    let indicator=
      document.querySelector(
        "[data-ads-test-indicator]"
      );

    if(!indicator){
      indicator=
        document.createElement("aside");

      indicator.dataset.adsTestIndicator="1";
      indicator.className=
        "brainilab-ads-test-indicator";

      document.body.appendChild(indicator);
    }

    indicator.innerHTML=`
      <span>ADS TEST MODE</span>
      <strong>
        ${slots.length}
        ${slots.length===1?"placement":"placements"}
      </strong>
      <small>
        ${slots.length
          ? slots
              .map(
                x=>x.dataset.adSlot
              )
              .join(" · ")
          : "No ad slots on this page"
        }
      </small>
    `;
  }

  function boot(){
    if(debugMode()){
      renderDebugIndicator();

      // Deterministic local QA:
      // bypass observer, flags, publisher IDs and Plus entitlement.
      document
        .querySelectorAll(
          ".brainilab-ad-slot[data-ad-slot]"
        )
        .forEach(element=>{
          element.hidden=false;
          renderSlot(element);
        });
    }else{
      scan();
    }

    const mutations=
      new MutationObserver(records=>{
        if(records.some(record=>record.target.closest?.('#homeQuiz'))) reconcile();
        records.forEach(record=>{
          record.addedNodes.forEach(node=>{
            if(!(node instanceof Element)){
              return;
            }

            if(node.matches?.(".brainilab-ad-slot[data-ad-slot]")){
              if(debugMode()){
                node.hidden=false;
                renderSlot(node);
                renderDebugIndicator();
              }else{
                observe(node);
              }
            }

            if(debugMode()){
              node
                .querySelectorAll?.(
                  ".brainilab-ad-slot[data-ad-slot]"
                )
                .forEach(element=>{
                  element.hidden=false;
                  renderSlot(element);
                });

              renderDebugIndicator();
            }else{
              scan(node);
            }
          });
        });
      });

    mutations.observe(
      document.body,
      {
        childList:true,
        subtree:true
      }
    );
  }

  window.addEventListener(
    "brainilab:monetizationchange",
    reconcile
  );

  window.addEventListener(
    "brainilab:cloudready",
    reconcile
  );

  if(document.readyState==="loading"){
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      {once:true}
    );
  }else{
    queueMicrotask(boot);
  }

  return {
    scan,
    reconcile,
    renderSlot
  };
})();

/* ===== account-menu.js ===== */

/*
  BrainiLab Account Menu — V28
  Capture-phase delegation guarantees that clicking the avatar opens the menu
  instead of navigating away first.
*/
window.BrainiAccountMenu=(function(){
  let openMenu=null;
  const headerInvites=new WeakMap();
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function close(){
    if(openMenu){
      openMenu.remove();
      openMenu=null;
    }
  }

  function profileHref(section=null){
    const existing=document.querySelector('a.avatar[href*="profile"]');
    const href=existing?.getAttribute("href")||"/profile/";
    const base=href.split("?")[0].split("#")[0];
    return section ? `${base}?section=${section}` : base;
  }

  async function signOut(){
    close();

    if(!confirm("Sign out of BrainiLab on this browser?")) return;

    try{
      if(!window.BrainiBackendAuth && window.BrainiPerf?.ensureCloud){
        await BrainiPerf.ensureCloud();
      }

      if(window.BrainiBackendAuth?.isConfigured?.()){
        await BrainiBackendAuth.signOut();
      }else{
        await BrainiData.api.signOut();
      }
      location.href="/";
    }catch(err){
      if(typeof showToast==="function"){
        showToast(err.message||"Could not sign out");
      }
    }
  }

  function menuMarkup(auth,p){
    const logged=auth.status==="authenticated";
    const progress=window.BrainiProgressUI?.xpProgress?.(p.level,p.xp);
    const tier=window.BrainiProgressUI?.tier?.(progress?.level||1);
    const streak=Math.max(0,Number(p.currentStreak)||0);

    return `
      <div class="account-popover" role="menu" aria-label="BrainiLab account menu">
        <div class="account-popover-head">
          <span class="rank-avatar ${window.BrainiProgressUI
            ? BrainiProgressUI.avatarClass(progress.level)
            : ""
          } account-menu-avatar">
            ${BrainiProgressUI.avatarImageMarkup(p)}
          </span>

          <div>
            <strong>${esc(p.displayName||"Braini Player")}</strong>
            <span class="account-level-label">Level ${progress?.level||1} <span class="account-tier">${tier?.name||"Rookie"}</span></span>
          </div>
        </div>

        <a role="menuitem" class="account-progress-link" href="${profileHref('progress')}">
          <span><strong>${Number(p.xp||0).toLocaleString()} XP</strong><small>${esc(progress?.label||'Start with a game')}</small></span>
          <i class="account-xp-track" role="progressbar" aria-label="Progress to level ${progress?.nextLevel||2}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress?.percent||0)}"><i style="width:${progress?.percent||0}%"></i></i>
          <span class="account-streak ${p.streakSecuredToday?'is-secured':''}"><span aria-hidden="true">🔥</span> ${streak} ${streak===1?'day':'days'} <small>${p.streakSecuredToday?'Done for today':'Daily not played today'}</small></span>
        </a>

        <a role="menuitem" class="account-popover-row account-popover-primary" href="${profileHref()}">
          <div>
            <strong>My BrainiLab</strong>
            <small>Overview, progress & stats</small>
          </div>
        </a>

        <a role="menuitem" class="account-popover-row" href="${profileHref("profile")}">
          <div>
            <strong>Edit Profile</strong>
            <small>Name, photo & public profile</small>
          </div>
        </a>

        <a role="menuitem" class="account-popover-row" href="${profileHref("social")}">
          <div>
            <strong>Groups & Friends</strong>
            <small>Your people, your teams</small>
          </div>
        </a>

        <a role="menuitem" class="account-popover-row" href="${profileHref("settings")}">
          <div>
            <strong>Account & Security</strong>
            <small>Account, privacy and sign-in</small>
          </div>
        </a>

        ${
          (
            window.BrainiMonetization?.plusEnabled?.()
            || window.BrainiMonetization?.hasPlus?.()
          )
            ? `<a
                 role="menuitem"
                 class="account-popover-row account-popover-plus"
                 href="${
                   window.BrainiMonetization?.plusHref?.()
                   || "/plus/"
                 }"
               >
                 <div>
                   <strong>BrainiLab+</strong>
                   <small>${
                     window.BrainiMonetization?.hasPlus?.()
                       ? "Active · No ads"
                       : "Play without ads"
                   }</small>
                 </div>
               </a>`
            : ""
        }

        ${logged
          ? `<button type="button" role="menuitem" class="account-popover-row account-popover-danger" data-account-signout>
               <div>
                 <strong>Sign out</strong>
                 <small>Sign out of this browser while keeping your synced progress.</small>
               </div>
             </button>`
          : `
             <div class="account-popover-authbox" role="group" aria-label="Authentication actions">
               <button type="button" role="menuitem" class="account-popover-authbtn" data-account-login>
                 <div>
                   <strong>Log in</strong>
                   <small>Use your existing BrainiLab account.</small>
                 </div>
               </button>

               <button type="button" role="menuitem" class="account-popover-authbtn account-popover-authbtn-primary" data-account-signup>
                 <div>
                   <strong>Sign up</strong>
                   <small>Create an account and sync your progress.</small>
                 </div>
               </button>
             </div>`
        }
      </div>`;
  }

  function positionMenu(avatar){
    const rect=avatar.getBoundingClientRect();
    const viewportWidth=document.documentElement.clientWidth||window.innerWidth;

    openMenu.style.position="fixed";
    openMenu.style.maxWidth=`${Math.max(0,viewportWidth-24)}px`;
    openMenu.style.visibility="hidden";

    document.body.appendChild(openMenu);
    openMenu.style.right=`${Math.min(Math.max(12,viewportWidth-rect.right),Math.max(12,viewportWidth-openMenu.offsetWidth-12))}px`;

    const maxTop=Math.max(
      12,
      window.innerHeight-openMenu.offsetHeight-12
    );

    openMenu.style.top=`${Math.min(rect.bottom+10,maxTop)}px`;
    openMenu.style.visibility="visible";
  }

  function openFor(avatar){
    close();

    const auth=BrainiData.authState();
    const p=BrainiData.player();

    const wrap=document.createElement("div");
    wrap.innerHTML=menuMarkup(auth,p);
    openMenu=wrap.firstElementChild;

    positionMenu(avatar);

    openMenu.querySelector("[data-account-signout]")?.addEventListener(
      "click",
      signOut
    );

    const openAuthModal=async(mode)=>{
      close();

      if(!window.BrainiAuth?.open && window.BrainiPerf?.ensureCloud){
        await BrainiPerf.ensureCloud();
      }

      if(window.BrainiAuth?.open){
        BrainiAuth.open({
          source:"account_menu",
          mode
        });
      }
    };

    openMenu.querySelector("[data-account-login]")?.addEventListener(
      "click",
      ()=>openAuthModal("signin")
    );

    openMenu.querySelector("[data-account-signup]")?.addEventListener(
      "click",
      ()=>openAuthModal("signup")
    );
  }

  function toggleFor(avatar){
    if(openMenu){
      close();
      return;
    }
    openFor(avatar);
  }

  function isGuest(){
    const auth=BrainiData.authState();
    return auth.status==="guest" || (auth.status==="authenticated" && auth.user?.is_anonymous===true);
  }

  function hydrateHeaderInvite(){
    if(/^\/(admin|auth)(\/|$)/.test(location.pathname)) return;
    document.querySelectorAll(".topbar .nav").forEach(nav=>{
      const right=nav.querySelector(".nav-right");
      if(!right) return;
      let entry=headerInvites.get(nav);
      if(!entry){
        const slot=document.createElement("div");
        slot.className="header-account-invite";
        const button=document.createElement("button");
        button.type="button";
        button.className="header-account-button";
        button.dataset.headerSignup="";
        button.title="Keep your scores and progress across devices";
        const status=document.createElement("span");
        status.className="header-account-status";
        status.setAttribute("role","status");
        status.hidden=true;
        slot.append(button,status);
        right.prepend(slot);
        entry={slot,button,status,pending:false};
        headerInvites.set(nav,entry);
        button.addEventListener("click",async()=>{
          if(entry.pending || !isGuest()) return;
          close();
          entry.pending=true;
          status.hidden=true;
          hydrateHeaderInvite();
          try{
            if(!window.BrainiAuth?.open && window.BrainiPerf?.ensureCloud) await BrainiPerf.ensureCloud();
            if(!isGuest()) return;
            if(!window.BrainiAuth?.open) throw Error("Sign-up unavailable");
            await BrainiAuth.open({source:"header",mode:"signup"});
          }catch{
            if(isGuest()){
              status.textContent="Sign-up is unavailable right now. Please try again.";
              status.hidden=false;
            }
          }finally{
            entry.pending=false;
            hydrateHeaderInvite();
          }
        });
      }
      const visible=isGuest();
      entry.slot.hidden=!visible;
      nav.classList.toggle("has-header-account-invite",visible);
      entry.button.disabled=entry.pending;
      entry.button.setAttribute("aria-busy",String(entry.pending));
      entry.button.textContent=entry.pending?"Opening…":"Create free account";
      if(!visible){entry.status.hidden=true;entry.status.textContent="";}
    });
  }

  function hydrate(){
    hydrateHeaderInvite();
    const p=BrainiData.player();

    document.querySelectorAll(".avatar").forEach(avatar=>{
      if(window.BrainiProgressUI){
        const level=BrainiProgressUI.xpProgress(p.level,p.xp).level;
        const t=BrainiProgressUI.tier(level);
        const classes=new Set(["rank-header-avatar",...BrainiProgressUI.avatarClass(level).split(" ")]);
        for(const name of [...avatar.classList]){
          if(name.startsWith("rank-")&&!classes.has(name))avatar.classList.remove(name);
        }
        for(const name of classes)if(!avatar.classList.contains(name))avatar.classList.add(name);
        const title=`${p.displayName||"My BrainiLab"} · ${t.name} · Level ${level}`;
        if(avatar.title!==title)avatar.title=title;
      }

      BrainiProgressUI.setAvatarMarkup(avatar,BrainiProgressUI.avatarImageMarkup(p));
    });
  }

  // Capture-phase interception prevents the anchor's normal navigation from
  // winning before the menu has a chance to open.
  document.addEventListener(
    "click",
    e=>{
      const avatar=e.target.closest?.(".avatar");

      if(avatar){
        e.preventDefault();
        e.stopPropagation();
        toggleFor(avatar);
        return;
      }

      if(openMenu && !openMenu.contains(e.target)){
        close();
      }
    },
    true
  );

  document.addEventListener("keydown",e=>{
    if(e.key==="Escape") close();
  });

  window.addEventListener("resize",close);
  window.addEventListener("scroll",close,{passive:true});

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",hydrate,{once:true});
  else hydrate();
  window.addEventListener("brainilab:authchange",hydrate);
  window.addEventListener("brainilab:profilechange",hydrate);
  window.addEventListener("brainilab:progressionchange",hydrate);
  window.addEventListener("brainilab:daychange",close);
  window.addEventListener("brainilab:datachange",hydrate);

  return {
    hydrate,
    close,
    openFor
  };
})();

/* ===== mobile-ui.js ===== */

/*
  BrainiLab Mobile UI — V40
  Accessible navigation behavior shared by every public page.
*/
window.BrainiMobileUI=(function(){
  const readyNav=new WeakSet();
  const readyCommunity=new WeakSet();
  function closeMenu(nav,button){
    nav?.classList.remove('mobile-open');
    button?.setAttribute('aria-expanded','false');
  }

  function bootNav(){
    if(!document.querySelector('[data-news-nav-style]')){
      const style=document.createElement('style');style.dataset.newsNavStyle='';
      style.textContent='.topbar .links .news-nav-link{color:#ae201b!important;border:1px solid #e52720!important;border-radius:999px;padding:7px 11px;white-space:nowrap;animation:news-nav-aura 4s ease-in-out infinite}@keyframes news-nav-aura{0%,100%{box-shadow:0 0 0 2px #e5272008}50%{box-shadow:0 0 0 4px #e5272018}}@media(prefers-reduced-motion:reduce){.topbar .links .news-nav-link{animation:none}}';
      document.head.append(style);
    }
    document.querySelectorAll('.topbar .nav').forEach(shell=>{
      const nav=shell.querySelector('.links');
      const button=shell.querySelector('[data-mobile-menu]');
      if(nav&&!nav.querySelector('.news-nav-link')){
        const link=document.createElement('a');link.href='/breaking-news/';link.className='news-nav-link';link.textContent='Breaking News';
        if(location.pathname.startsWith('/breaking-news'))link.setAttribute('aria-current','page');
        nav.append(link);
      }
      if(!nav||!button||readyNav.has(nav)) return;
      readyNav.add(nav);

      if(!nav.id) nav.id='mainNav';
      button.setAttribute('aria-controls',nav.id);
      button.setAttribute('aria-expanded','false');

      button.addEventListener('click',event=>{
        event.stopPropagation();
        const open=!nav.classList.contains('mobile-open');
        nav.classList.toggle('mobile-open',open);
        button.setAttribute('aria-expanded',String(open));
      });

      // The dropdown sits before its toggle in the shared header DOM.
      // Enter its links on Tab, then leave it after the last link.
      button.addEventListener('keydown',event=>{
        if(event.key==='Tab'&&!event.shiftKey&&nav.classList.contains('mobile-open')){
          const first=nav.querySelector('a[href]');
          if(first){event.preventDefault();first.focus();}
        }
      });
      nav.addEventListener('keydown',event=>{
        const links=nav.querySelectorAll('a[href]');
        if(event.key==='Tab'&&!event.shiftKey&&event.target===links[links.length-1]&&nav.classList.contains('mobile-open')){
          closeMenu(nav,button);
          button.focus();
        }
      });

      nav.addEventListener('click',event=>{
        if(event.target.closest('a')) closeMenu(nav,button);
      });

      document.addEventListener('pointerdown',event=>{
        if(!nav.classList.contains('mobile-open')) return;
        if(shell.contains(event.target)) return;
        closeMenu(nav,button);
      },{passive:true});

      document.addEventListener('keydown',event=>{
        if(event.key==='Escape'&&nav.classList.contains('mobile-open')){
          const restoreFocus=nav.contains(document.activeElement);
          closeMenu(nav,button);
          if(restoreFocus)button.focus();
        }
      });

      window.addEventListener('resize',()=>{
        if(window.innerWidth>920) closeMenu(nav,button);
      },{passive:true});
    });
  }

  function bootCommunity(){
    document.querySelectorAll('.topbar .nav-community').forEach(group=>{
      if(readyCommunity.has(group))return;
      const summary=group.querySelector('summary');
      if(!summary)return;
      readyCommunity.add(group);
      let mobile=window.innerWidth<=920;
      let openedOnHover=false;
      group.open=mobile;
      const current=location.pathname.match(/^\/(rankings|groups)(?:\/|$)/)?.[1];
      group.classList.toggle('is-current',Boolean(current));
      group.querySelectorAll('a[href]').forEach(link=>{
        if(current&&new URL(link.href,location.href).pathname.match(new RegExp('^/'+current+'(?:/|$)')))link.setAttribute('aria-current','page');
        else link.removeAttribute('aria-current');
      });
      const close=()=>{group.open=false;openedOnHover=false;};
      const open=()=>{group.open=true;window.BrainiAccountMenu?.close?.();};
      // On a narrow screen both links are already visible when Menu opens.
      // On desktop a mouse, touch, or keyboard can open the same disclosure.
      group.addEventListener('pointerenter',event=>{
        if(mobile||event.pointerType==='touch'||!window.matchMedia('(hover: hover) and (pointer: fine)').matches)return;
        if(!group.open){open();openedOnHover=true;}
      });
      group.addEventListener('pointerleave',()=>{
        if(!mobile&&!group.contains(document.activeElement))close();
      });
      summary.addEventListener('click',event=>{
        if(mobile)return;
        event.preventDefault();
        if(openedOnHover&&event.detail>0)open();
        else if(group.open)close();
        else open();
        openedOnHover=false;
      });
      summary.addEventListener('keydown',event=>{
        if(!mobile&&(event.key==='ArrowDown'||event.key==='ArrowUp')){
          event.preventDefault();open();
          const links=group.querySelectorAll('a[href]');
          (event.key==='ArrowUp'?links[links.length-1]:links[0])?.focus();
        }
      });
      group.addEventListener('keydown',event=>{
        if(event.key==='Escape'&&!mobile&&group.open){
          event.preventDefault();event.stopPropagation();close();summary.focus();
        }
      });
      group.addEventListener('focusout',event=>{
        if(!mobile&&!group.contains(event.relatedTarget))close();
      });
      group.addEventListener('click',event=>{
        if(!mobile&&event.target.closest('a'))close();
      });
      document.addEventListener('pointerdown',event=>{
        if(!mobile&&!group.contains(event.target))close();
      },{capture:true,passive:true});
      window.addEventListener('resize',()=>{
        const next=window.innerWidth<=920;
        if(next===mobile)return;
        mobile=next;openedOnHover=false;group.open=mobile;
      },{passive:true});
    });
  }

  function centerActiveTabs(){
    document.querySelectorAll('.profile-tabs').forEach(tabs=>{
      const active=tabs.querySelector('.active');
      if(active){
        requestAnimationFrame(()=>{
          active.scrollIntoView({
            block:'nearest',
            inline:'center'
          });
        });
      }

      tabs.addEventListener('click',event=>{
        const button=event.target.closest('button');
        if(!button) return;
        requestAnimationFrame(()=>{
          button.scrollIntoView({
            behavior:'smooth',
            block:'nearest',
            inline:'center'
          });
        });
      });
    });
  }

  function boot(){
    bootNav();
    bootCommunity();
    centerActiveTabs();
    document.documentElement.classList.add('brainilab-mobile-ready');
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    queueMicrotask(boot);
  }

  return {boot};
})();

/* ===== avatar-announcement.js ===== */

/* A dismissible invitation on browsing pages. No tracking or gameplay writes. */
window.BrainiAvatarAnnouncement=(()=>{
  const key='brainilab_avatar_announcement_seen_v1',cooldown=30*86400000;
  const browsing=new Set(['/','/index.html','/games/','/games/index.html','/daily-quiz/','/daily-quiz/index.html']);
  let card=null,timer=null,finished=false;
  const signedIn=()=>window.BrainiData?.authState?.()?.status==='authenticated';
  const visible=el=>!!el?.getClientRects().length;
  function blocked(){
    return document.hidden||signedIn()||[...document.querySelectorAll('.marketing-consent,.auth-modal.show,.modal.show,.quiz-modal.show,.account-popover,dialog[open],[role="dialog"][aria-modal="true"]')].some(visible);
  }
  function seen(){
    try{const at=Number(localStorage.getItem(key));return Number.isFinite(at)&&at>0&&Date.now()-at<cooldown;}catch{return true;}
  }
  function dismiss(){
    clearTimeout(timer);timer=null;
    const focused=!!card?.contains(document.activeElement);
    card?.remove();card=null;
    if(focused)document.querySelector('.nav-right .avatar')?.focus({preventScroll:true});
  }
  async function join(){
    const button=card?.querySelector('[data-avatar-join]'),error=card?.querySelector('[data-avatar-invite-error]');
    if(!button||button.disabled)return;
    button.disabled=true;error.hidden=true;
    try{
      if(!window.BrainiAuth?.open)await window.BrainiPerf?.ensureCloud?.();
      if(signedIn()){dismiss();return;}
      if(!window.BrainiAuth?.open)throw Error('Sign-in unavailable');
      if(!card?.isConnected)return;
      dismiss();window.BrainiAuth.open({source:'avatar_announcement',mode:'signup'});
    }catch{
      if(error.isConnected){error.hidden=false;error.textContent='Sign-in could not open. Please try again.';}
    }finally{if(button.isConnected)button.disabled=false;}
  }
  function show(){
    timer=null;
    if(finished||card||!browsing.has(location.pathname)||blocked()||seen())return;
    // Remember the invitation before showing it, including across tabs/navigation.
    try{const at=String(Date.now());localStorage.setItem(key,at);if(localStorage.getItem(key)!==at)return;}catch{return;}
    finished=true;card=document.createElement('aside');card.className='avatar-announcement';card.setAttribute('aria-labelledby','avatar-announcement-title');
    card.innerHTML=`<button class="avatar-announcement-close" type="button" aria-label="Dismiss avatar invitation">×</button><div class="avatar-announcement-heading"><span class="avatar-announcement-art" aria-hidden="true">${BrainiAvatarDesign.markup({mode:'built',skin:'honey',hair:'curls',shirt:'green',background:'sunshine',hat:'corn',glasses:'round',prop:'icepop'},2200)}</span><div><span class="avatar-announcement-kicker">A little more you</span><h2 id="avatar-announcement-title">Meet your avatar.</h2></div></div><p>Create a free account to save your look across devices. Play to unlock fun extras with XP.</p><button class="btn" type="button" data-avatar-join>Create my avatar <span aria-hidden="true">→</span></button><p class="avatar-announcement-error" role="status" data-avatar-invite-error hidden></p>`;
    card.querySelector('.avatar-announcement-close').onclick=dismiss;
    card.querySelector('[data-avatar-join]').onclick=join;
    document.body.append(card);
  }
  function schedule(){if(!finished&&!timer&&browsing.has(location.pathname)&&!signedIn()&&!seen())timer=setTimeout(show,15000);}
  function afterInteraction(){
    queueMicrotask(()=>{
      if(blocked()){if(card)dismiss();}
      else schedule();
    });
  }
  function boot(){
    schedule();
    window.addEventListener('brainilab:authchange',()=>{if(signedIn())dismiss();});
    window.addEventListener('brainilab:statistics-consent',schedule);
    window.addEventListener('storage',event=>{if(event.key===key&&card)dismiss();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)dismiss();else schedule();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(card)dismiss();afterInteraction();}},true);
    // Capture before menus stop propagation; inspect after their open/close handlers.
    document.addEventListener('click',afterInteraction,true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  return {dismiss};
})();
/* related-video bundle */
(()=>{var d=e=>String(e??"").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n]);function u(e){if(typeof e!="string")return null;let n=e.trim();if(/^[\w-]{11}$/.test(n))return n;try{let t=new URL(n);if(t.protocol!=="https:"||t.username||t.password||t.port)return null;let r=null;return t.hostname==="youtu.be"&&(r=t.pathname.slice(1)),["youtube.com","www.youtube.com","m.youtube.com"].includes(t.hostname)&&(r=t.pathname==="/watch"?t.searchParams.get("v"):t.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})\/?$/)?.[1]),typeof r=="string"&&/^[\w-]{11}$/.test(r)?r:null}catch{return null}}function o(e){let n=u(e?.id),t=typeof e?.title=="string"?e.title.trim().slice(0,180):"";return n&&t?{id:n,title:t,showAfterGame:e.showAfterGame===!0}:null}function i(e,n="article"){let t=o(e);if(!t)return"";let r=n==="post_game"?"post_game":"article";return`<a class="related-video" data-related-video="${r}" data-video-id="${t.id}" href="https://www.youtube.com/watch?v=${t.id}" target="_blank" rel="noopener"><span class="related-video-art"><img src="/api/youtube-thumbnail/${t.id}" width="320" height="180" loading="lazy" decoding="async" alt=""/><span class="related-video-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M9 5v14l11-7z"/></svg></span></span><span class="related-video-copy"><span class="related-video-label">${r==="post_game"?"Fancy a video quiz?":"Play along on YouTube"}</span><strong>${d(t.title)}</strong><span class="related-video-link">Watch on YouTube <span aria-hidden="true">\u2197</span><span class="sr-only"> (opens in a new tab)</span></span></span></a>`}var s=Object.freeze({brainmix:"/games/brain-mix/",worldflags:"/geography/world-flags-quiz/",worldcapitals:"/geography/world-capitals-quiz/",generalknowledge:"/general-knowledge/general-knowledge-quiz/",science:"/science/science-quiz/",history:"/history/history-quiz/",sports:"/sports/sports-quiz/",connections:"/games/connections/",mathrush:"/games/math-rush/",sequence:"/games/sequence/",brainiword:"/games/brainiword/",numberroute:"/games/number-route/",orderup:"/games/order-up/",topicrush:"/games/topic-rush/",oddoneout:"/games/odd-one-out/",higherlower:"/games/higher-lower/",survival:"/games/survival/"});var a=new Map,l=new WeakMap;function c(e){return a.has(e)||a.set(e,fetch("/api/related-video?game="+encodeURIComponent(e),{credentials:"omit",signal:AbortSignal.timeout(6e3)}).then(async n=>{if(!n.ok)throw Error("Video unavailable");return o((await n.json()).video)}).catch(()=>(a.delete(e),null))),a.get(e)}async function p(e,{gameId:n}={}){if(!e)return;let t={};if(l.set(e,t),e.hidden=!0,e.replaceChildren(),!Object.hasOwn(s,n))return;let r=await c(n);!r||!e.isConnected||l.get(e)!==t||(e.innerHTML=i(r,"post_game"),e.hidden=!1)}document.addEventListener("error",e=>{let n=e.target;n?.matches?.(".related-video-art img")&&(n.hidden=!0)},!0);window.BrainiRelatedVideo={mount:p};})();
