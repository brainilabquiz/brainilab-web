/* Shared character portrait for the studio and saved avatar surfaces. */
window.BrainiAvatarStudioArt=(()=>{
  const A=BrainiAvatarDesign;
  const sceneVersions={library:'bc2e29e50a79',lab:'c24336b91bc0',stars:'9236b09fa514',greenhouse:'ab8cc622242b',tidepool:'8e5f8804c652',arcade:'eb6e9dc004cb'};
  function sceneSource(scene){
    return typeof scene==='string'&&Object.hasOwn(sceneVersions,scene)?
      '/assets/profile-scenes/'+scene+'-avatar.webp?v='+sceneVersions[scene]:'';
  }
  function paletteFor(look){
    return Object.fromEntries(['skin','hairColor','shirt'].map(kind=>[kind,A.options[kind].find(item=>item.id===look[kind]).color]));
  }
  const glassRim='<circle cx="100" cy="100" r="105" fill="none" stroke="#fff" stroke-opacity=".64" stroke-width="2" stroke-dasharray="105 555" transform="rotate(190 100 100)"/>';
  const frameDetails={
    blue:glassRim+'<path d="m31 173 6 6m124-151 6 4m14 10 4 6" stroke="#d5efff" stroke-width="3" stroke-linecap="round"/>',
    green:'<path d="M14 65Q7 52 24 42Q42 30 44 21M153 192Q170 190 181 171Q189 157 194 153" fill="none" stroke="#4c7435" stroke-width="1.8" stroke-linecap="round"/>',
    copper:glassRim+'<path d="m100-18 7 11-7 6-7-6Zm0 236 7-11-7-6-7 6ZM-18 100l11-7 6 7-6 7Zm236 0-11-7-6 7 6 7Z" fill="#d08958" stroke="#6f3825" stroke-width="1.5"/>',
    gold:glassRim+'<path d="M71 4Q100-9 129 4M71 196Q100 209 129 196" fill="none" stroke="#fff4b2" stroke-width="3" stroke-linecap="round"/><path d="m100-16 10 12-10 10-10-10Zm0 232 8-9-8-9-8 9Z" fill="#ffea8b" stroke="#a07625" stroke-width="1.7"/>'
  };
  const spectrum=['#ff7894','#ffa271','#ffc962','#fae77d','#a5de78','#69d5a6',
    '#67ded4','#74c9fa','#879ff9','#a48bfc','#cd92f8','#f690c7'];
  const ring=(r,stroke,width,attrs='')=>
    `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${stroke}" stroke-width="${width}" ${attrs}/>`;
  const glide=(r,stroke,width,dash,kind='')=>
    `<g class="avatar-frame-spin ${kind}">${ring(r,stroke,width,`pathLength="100" stroke-dasharray="${dash}" stroke-linecap="round" transform="rotate(-132 100 100)"`)}</g>`;
  const frameMotif=(name,positions,art)=>`<g class="avatar-frame-spin avatar-frame-motifs avatar-frame-${name}">${positions.map(a=>`<g transform="rotate(${a} 100 100)">${art}</g>`).join('')}</g>`;
  const frameEffects=Object.freeze({
    level:frameMotif('progress',[12,27,42],'<rect x="97.5" y="-13" width="5" height="6" rx="2" fill="#fff0a2" stroke="#54456b" stroke-width="1.2"/>'),
    blue:glide(104,'#e7fbff',2.2,'15 85','avatar-frame-tide')+
      frameMotif('bubbles',[3,126,244],'<g class="avatar-frame-bubbles"><circle cx="100" cy="-10" r="5" fill="#c0f0ff" stroke="#376fb0" stroke-width="1.4"/><circle cx="102" cy="-12" r="1.8" fill="#fff"/><circle cx="110" cy="-12" r="2" fill="#dcf6ff"/></g>'),
    green:frameMotif('leaves',[12,125,248],'<g class="avatar-frame-leaf"><path d="M88-5q6-13 18-12-1 13-18 12Zm9-4q14-8 21-2-6 9-21 2Z" fill="#a1e467" stroke="#487a43" stroke-width="1.6"/><path d="m92-7 10-7m-2 6 13-3" stroke="#e9ffb7" stroke-width="1.3" stroke-linecap="round"/></g>'),
    copper:frameMotif('gears',[16,112,209,302],'<g class="avatar-frame-cog" transform="translate(100 -10)"><path d="M-3-8h6l1 3 3 1 2 5-3 2-1 4-5 2-2-3-4-1-2-5 3-2Z" fill="#f5b688" stroke="#754530" stroke-width="1.4"/><circle r="2.4" fill="#754530"/></g>')+
      glide(113,'#ffc494',2,'3 10 4 16 9 58','avatar-frame-reverse'),
    gold:frameMotif('comets',[15,133,245],'<g class="avatar-frame-spark"><path d="m100-19 2.7 6 6 2.7-6 2.7-2.7 6-2.7-6-6-2.7 6-2.7Z" fill="#fff2af" stroke="#b47c3a" stroke-width="1.4"/><circle cx="112" cy="-10" r="2.5" fill="#ffdd71"/><circle cx="119" cy="-8" r="1.6" fill="#fff3c6"/></g>'),
    orbit:glide(109,'#b7abff',2.4,'15 20 9 56','avatar-frame-reverse')+
      '<g class="avatar-frame-spin avatar-orbit"><path d="M68-8a113 113 0 0 1 32-5M-10 125a113 113 0 0 0 12 31M210 124a113 113 0 0 1-12 32" fill="none" stroke="#9d8ffa" stroke-width="2" stroke-linecap="round"/><circle cx="100" cy="-13" r="7" fill="#ffd813" stroke="#2d296e" stroke-width="2"/><circle cx="98" cy="-15" r="2.1" fill="#fff7c8"/><circle cx="2" cy="156" r="5.5" fill="#f09b65" stroke="#2d296e" stroke-width="2"/><circle cx="198" cy="156" r="5" fill="#76d68a" stroke="#2d296e" stroke-width="2"/></g>',
    midnight:frameMotif('bats',[20,190],'<path d="M89-10q6-4 10 1l1-5 2 4q5-3 11-1l-5 7-5-2-3 4-3-4-4 1Z" fill="#d6b8fb" stroke="#5c467c" stroke-width="1.6" stroke-linejoin="round"/>'),
    prism:ring(104,'#2e2459',14)+
      `<g class="avatar-frame-spectrum">${spectrum.map((color,i)=>ring(104,color,10,`pathLength="12" stroke-dasharray="1.06 10.94" stroke-dashoffset="${-i}"`)).join('')}</g>`+
      ring(98,'#fff7ff',1.4,'opacity=".9"')+
      glide(104,'#fff',2.8,'12 20 6 62','avatar-frame-prism'),
    aurora:ring(104,'#21455e',13)+ring(99,'#b0ede7',1.6)+
      glide(104,'#60e2b0',7,'25 14 9 14 11 27','avatar-frame-aurora')+
      glide(109,'#bda8ff',2.4,'13 29 12 46','avatar-frame-reverse')+
      '<path d="m20 30 1.4 4.6 4.6 1.4-4.6 1.4-1.4 4.6-1.4-4.6L14 36l4.6-1.4Z" fill="#c9fcec"/><circle cx="186" cy="170" r="3" fill="#c0aafa"/>',
    nova:ring(104,'#522847',14)+ring(99,'#f6d0a2',1.4)+
      ring(104,'#ed9299',7,'pathLength="100" stroke-dasharray="26 5 16 6 35 12"')+
      glide(111,'#ffc787',2.2,'13 41 5 41','avatar-frame-reverse')+
      '<g class="avatar-frame-spin avatar-frame-nova"><path d="m100-19 3.5 8.5 8.5 3.5-8.5 3.5-3.5 8.5-3.5-8.5-8.5-3.5 8.5-3.5Z" fill="#fff1c0" stroke="#a85473" stroke-width="1.6"/><circle cx="211" cy="94" r="4.2" fill="#ffc48c" stroke="#6d3659" stroke-width="1.4"/><circle cx="43" cy="194" r="3" fill="#ffaba7"/></g>'
  });
  const completeFrames=Object.freeze(['prism','aurora','nova']);
  function frameOverlay(frame){
    if(!Object.hasOwn(frameEffects,frame))return '';
    const complete=completeFrames.includes(frame)?' data-complete-frame':'';
    return `<svg class="avatar-frame-overlay"${complete} viewBox="0 0 240 240" aria-hidden="true" focusable="false"><g transform="translate(20 20)">${frameEffects[frame]}</g></svg>`;
  }
  function markup(look,{instance,level=1,levelPct=0,cropHair=false,scene,transparentBackdrop=false}){
    const id='avatar-art-'+instance,palette=paletteFor(look),arc=Math.round(1000*levelPct)+' 1000';
    const sceneUrl=cropHair||transparentBackdrop?'':sceneSource(scene);
    const backHair={waves:'longBack',bob:'bobBack',braids:'braids',ponytail:'pony',curls:'curlsBack'}[look.hair];
    const frontHair={sweep:'sweep',crop:'crop',curls:'curls',bald:'none',bob:'part',waves:'part',braids:'part',ponytail:'part'}[look.hair];
    const hairArt={
      curlsBack: `<g fill="${palette.hairColor}"><circle cx="56" cy="94" r="14"></circle><circle cx="144" cy="94" r="14"></circle><circle cx="58" cy="72" r="16"></circle><circle cx="142" cy="72" r="16"></circle></g>`,
      longBack: `<path d="M50 92 C46 46 76 30 100 30 C124 30 154 46 150 92 L156 156 C144 166 126 164 118 156 L82 156 C74 164 56 166 44 156 Z" fill="${palette.hairColor}"></path>`,
      bobBack: `<path d="M52 92 C50 48 76 32 100 32 C124 32 150 48 148 92 L150 128 C140 136 126 136 120 128 L80 128 C74 136 60 136 50 128 Z" fill="${palette.hairColor}"></path>`,
      braids: `<g fill="${palette.hairColor}"><path d="M54 92 C52 50 76 34 100 34 C124 34 148 50 146 92 L146 112 L54 112 Z"></path><circle cx="55" cy="114" r="10"></circle><circle cx="55" cy="131" r="9"></circle><circle cx="55" cy="147" r="8"></circle><circle cx="145" cy="114" r="10"></circle><circle cx="145" cy="131" r="9"></circle><circle cx="145" cy="147" r="8"></circle></g><circle cx="55" cy="159" r="4.5" fill="#FFD813"></circle><circle cx="145" cy="159" r="4.5" fill="#FFD813"></circle>`,
      pony: `<path d="M134 52 C170 52 180 100 164 140 C158 118 150 100 138 90 Z" fill="${palette.hairColor}"></path><circle cx="140" cy="58" r="6" fill="#FFD813"></circle>`,
      curls: `<g fill="${palette.hairColor}"><circle cx="64" cy="74" r="15"></circle><circle cx="76" cy="57" r="16"></circle><circle cx="94" cy="48" r="17"></circle><circle cx="112" cy="48" r="17"></circle><circle cx="128" cy="57" r="16"></circle><circle cx="138" cy="74" r="15"></circle><circle cx="84" cy="66" r="10"></circle><circle cx="118" cy="66" r="10"></circle><circle cx="100" cy="62" r="11"></circle></g><g fill="#FFFFFF" opacity=".22"><circle cx="90" cy="42" r="4"></circle><circle cx="110" cy="42" r="4"></circle><circle cx="72" cy="52" r="3.5"></circle></g>`,
      sweep: `<path d="M56 90 C52 50 80 34 106 36 C134 38 150 60 144 92 C140 78 132 70 122 66 C108 74 84 74 66 70 C60 76 57 82 56 90 Z" fill="${palette.hairColor}"></path><path d="M84 47 Q104 40 124 48" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".25"></path>`,
      crop: `<path d="M58 86 C56 52 80 40 100 40 C122 40 144 52 142 86 C138 74 128 64 100 62 C74 64 62 74 58 86 Z" fill="${palette.hairColor}"></path><path d="M86 48 Q100 44 114 48" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".22"></path>`,
      part: `<path d="M56 94 C52 52 78 36 100 36 C122 36 148 52 144 94 C140 76 130 64 112 58 C108 66 100 70 100 70 C100 70 92 64 88 58 C70 64 60 76 56 94 Z" fill="${palette.hairColor}"></path><path d="M70 56 Q80 46 92 44" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".22"></path>`,
      none: `<ellipse cx="86" cy="58" rx="14" ry="6" fill="#FFFFFF" opacity=".28" transform="rotate(-18 86 58)"></ellipse>`,
    };
    const hair={
      [backHair]:hairArt[backHair],
      [frontHair]:hairArt[frontHair]
    };
    const newHair=A.newHair(look.hair,palette.hairColor);
    const frame=look.frame==='midnight'?'level':look.frame;
    const viewBox=cropHair?'37 27 166 166':'0 0 240 240';
  const frames={
    level: `<circle cx="100" cy="100" r="104" fill="none" stroke="#29244e" stroke-width="10"></circle><circle cx="100" cy="100" r="104" fill="none" stroke="#FFD813" stroke-width="10" stroke-linecap="round" pathLength="1000" stroke-dasharray="${arc}" transform="rotate(-90 100 100)"></circle><circle cx="100" cy="206" r="15" fill="#FFD813" stroke="#2D296E" stroke-width="3.5"></circle><text x="100" y="211.5" text-anchor="middle" font-size="15" font-weight="700" fill="#2D296E">${level}</text>`,
    blue: `<circle cx="100" cy="100" r="104" fill="none" stroke="url(#${id}-g-sky)" stroke-width="10"></circle><circle cx="100" cy="100" r="99" fill="none" stroke="#FFFFFF" stroke-width="2" opacity=".8"></circle><g fill="#FFFFFF" stroke="#2F7FE0" stroke-width="2"><path d="M14 52 a9 9 0 0 1 17 -2 a7 7 0 0 1 4 13 h-19 a6 6 0 0 1 -2 -11 z"></path><path d="M172 150 a8 8 0 0 1 15 -2 a6 6 0 0 1 3 11 h-17 a5 5 0 0 1 -1 -9 z"></path></g>`,
    green: `<circle cx="100" cy="100" r="104" fill="none" stroke="url(#${id}-g-green)" stroke-width="10"></circle><g fill="#40AB34"><ellipse cx="22" cy="44" rx="11" ry="5.5" transform="rotate(-45 22 44)"></ellipse><ellipse cx="36" cy="28" rx="9" ry="4.5" transform="rotate(-20 36 28)" fill="#7FCB4F"></ellipse><ellipse cx="184" cy="160" rx="11" ry="5.5" transform="rotate(-45 184 160)"></ellipse><ellipse cx="170" cy="178" rx="9" ry="4.5" transform="rotate(-70 170 178)" fill="#7FCB4F"></ellipse></g>`,
    copper: `<circle cx="100" cy="100" r="115" fill="none" stroke="#C8693A" stroke-width="3" stroke-dasharray="1.5 7"></circle><circle cx="100" cy="100" r="104" fill="none" stroke="url(#${id}-g-copper)" stroke-width="11"></circle><circle cx="100" cy="100" r="98.5" fill="none" stroke="#5A260F" stroke-width="1.5" opacity=".5"></circle>`,
    gold: `<circle cx="100" cy="100" r="104" fill="none" stroke="url(#${id}-g-gold)" stroke-width="12"></circle><circle cx="100" cy="100" r="98" fill="none" stroke="#FFF6C4" stroke-width="1.5"></circle><g fill="#FFD813" stroke="#D99200" stroke-width="1.5"><path d="M18 40 L21 49 L30 52 L21 55 L18 64 L15 55 L6 52 L15 49 Z"></path><path d="M186 30 L188 36 L194 38 L188 40 L186 46 L184 40 L178 38 L184 36 Z"></path><path d="M190 146 L192.5 153.5 L200 156 L192.5 158.5 L190 166 L187.5 158.5 L180 156 L187.5 153.5 Z"></path></g>`,
    orbit: ring(104,'#302a65',8)+ring(100,'#c7bff4',1.4)+ring(113,'#9a8bea',1.5,'stroke-dasharray="3 5" opacity=".75"')
  };
    return `<svg class="avatar-studio-drawing" xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" aria-hidden="true" focusable="false">
    <defs>
    <clipPath id="${id}-disc"><circle cx="100" cy="100" r="98"></circle></clipPath>
    <linearGradient id="${id}-g-sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2F7FE0"></stop><stop offset="1" stop-color="#9AD6FF"></stop></linearGradient>
    <linearGradient id="${id}-g-green" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2E8A26"></stop><stop offset="1" stop-color="#A6E06A"></stop></linearGradient>
    <linearGradient id="${id}-g-copper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8E3F1D"></stop><stop offset=".5" stop-color="#E08A55"></stop><stop offset="1" stop-color="#9A4521"></stop></linearGradient>
    <linearGradient id="${id}-g-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D99200"></stop><stop offset=".45" stop-color="#FFE36E"></stop><stop offset="1" stop-color="#E6A100"></stop></linearGradient>
    </defs>
    <g transform="translate(20 20)">
    <g clip-path="url(#${id}-disc)">
    ${transparentBackdrop?'':A.backdrop(look.background)}
    ${sceneUrl?`<image class="avatar-scene-art" href="${sceneUrl}" width="200" height="200" preserveAspectRatio="xMidYMid slice"/>`:''}

    ${newHair.back||''}
    ${hair.longBack||''}
    ${hair.bobBack||''}
    ${hair.braids||''}
    ${hair.pony||''}
    ${hair.curlsBack||''}

    <path d="M28 206 C30 166 60 148 100 148 C140 148 170 166 172 206 Z" fill="${palette.shirt}"></path>
    ${A.shirtAccent(look.shirt)}
    <path d="M100 148 C88 148 78 150 70 154 L100 182 L130 154 C122 150 112 148 100 148 Z" fill="#000000" opacity=".16"></path>
    <rect x="87" y="118" width="26" height="42" rx="12" fill="${palette.skin}"></rect>
    <path d="M87 128 L113 128 L113 138 Q100 148 87 138 Z" fill="#000000" opacity=".12"></path>
    <path d="M28 194Q42 172 56 165L51 201H28ZM172 194Q158 172 144 165L149 201H172Z" fill="#17132d" opacity=".18"></path>
    <path d="M133 179h13l-2 10-5 4-5-4Z" fill="#fff" opacity=".23"></path>
    <path d="M136 182h7m-3.5-3.5v7" stroke="#fff" stroke-width="1.25" opacity=".72"></path>
    <path d="M80 152 L100 172 L120 152" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".9"></path>
    <path d="M44 176 C52 166 60 162 66 162" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".18"></path>

    <circle cx="58" cy="98" r="10" fill="${palette.skin}"></circle>
    <circle cx="142" cy="98" r="10" fill="${palette.skin}"></circle>
    <circle cx="58" cy="98" r="4.5" fill="#000000" opacity=".1"></circle>
    <circle cx="142" cy="98" r="4.5" fill="#000000" opacity=".1"></circle>
    <ellipse cx="100" cy="92" rx="42" ry="46" fill="${palette.skin}" stroke="${A.darkSkin(look.skin)?'#e7ad92':'#613f41'}" stroke-opacity="${A.darkSkin(look.skin)?'.36':'.13'}" stroke-width="1.6" paint-order="stroke fill"></ellipse>
    <path d="M62 104 C66 126 82 138 100 138 C118 138 134 126 138 104 C132 122 118 132 100 132 C82 132 68 122 62 104 Z" fill="#000000" opacity=".07"></path>
    <path d="M76 84 Q84 79 92 83" stroke="${palette.hairColor}" stroke-width="3.5" fill="none" stroke-linecap="round"></path>
    <path d="M108 83 Q116 79 124 84" stroke="${palette.hairColor}" stroke-width="3.5" fill="none" stroke-linecap="round"></path>
    <ellipse cx="84" cy="96" rx="5" ry="6.2" fill="#181729"></ellipse>
    <ellipse cx="116" cy="96" rx="5" ry="6.2" fill="#181729"></ellipse>
    <circle cx="86" cy="93.6" r="1.8" fill="#FFFFFF"></circle>
    <circle cx="118" cy="93.6" r="1.8" fill="#FFFFFF"></circle>
    <ellipse cx="73" cy="110" rx="7" ry="4.5" fill="#F0607A" opacity=".24"></ellipse>
    <ellipse cx="127" cy="110" rx="7" ry="4.5" fill="#F0607A" opacity=".24"></ellipse>
    <path d="M100 100 Q96 108 101 110" stroke="#000000" stroke-opacity=".22" stroke-width="2.5" fill="none" stroke-linecap="round"></path>
    <path d="M89 117 Q100 127 111 117" stroke="${A.darkSkin(look.skin)?'#f2c5ad':'#392533'}" stroke-width="3" fill="none" stroke-linecap="round"></path>

    ${hair.sweep||''}
    ${hair.crop||''}
    ${hair.part||''}
    ${hair.curls||''}
    ${hair.none||''}
    ${newHair.front||''}
    ${!look.hat||look.hat==='none'?A.hairAccent(look.hair,look.hairColor):''}
    ${A.fittedGlasses(look.glasses)}
    ${A.integratedProp(look.prop,palette.skin)}
    </g>
    ${cropHair?'':(frames[frame]||'')+(frameDetails[frame]||'')+(frameEffects[look.frame]||'')}
    ${A.fittedHat(look.hat,look.hair)}
    </g>
    </svg>`;
  }
  return Object.freeze({markup,sceneSource,frameOverlay});
})();
