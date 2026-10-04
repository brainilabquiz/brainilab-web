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
