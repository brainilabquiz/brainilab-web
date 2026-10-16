/* Original BrainiLab character artwork. Local SVG, no remote avatar service. */
window.BrainiAvatarDesign=(function(){
  const choices={
    mode:[['picture','Your picture'],['built','Create an avatar']],
    skin:[['sand','Sand','#f3c4a0'],['peach','Peach','#ffdbc4'],['honey','Honey','#d79d6b'],['cocoa','Cocoa','#a96b47'],['umber','Umber','#744630'],['ebony','Ebony','#4c3028']],
    hair:[['sweep','Side sweep'],['curls','Curls'],['bob','Soft bob'],['crop','Short crop'],['bald','No hair'],['ponytail','Ponytail'],['waves','Long waves'],['braids','Braids']],
    hairColor:[['brown','Brown','#644130'],['black','Black','#302c36'],['blond','Blond','#e6bd63'],['auburn','Auburn','#a34e30'],['silver','Silver','#b5b6c2']],
    shirt:[['navy','Navy','#2d296e'],['green','Green','#397e39'],['orange','Orange','#d86725'],['blue','Blue','#3d86b0'],['berry','Berry','#aa4b77']],
    background:[['lilac','Lilac','#eae6fa'],['sky','Sky','#dceef8'],['sage','Sage','#e1efdf'],['sunshine','Sunshine','#fff0b3'],['coral','Coral','#fce1d6']],
    glasses:[['none','No glasses'],['round','Fresh eyes',null,150,'Round glasses. A fresh way to look at things.'],['square','Square roots',null,600,'Square frames with a soft spot for math.'],['sun','Bright mind',null,1000,'Sunglasses for a bright mind.'],['star','Star pupil',null,3500,'Star-shaped glasses. A little brilliance.'],['visor','Eye-Q',null,5000,'A futuristic visor with an eye for good ideas.']],
    hat:[['none','No hat'],['beanie','Warm thoughts',null,500,'A cozy beanie for your best ideas.'],['egg','Egghead',null,1200,'A sunny-side-up hat for a well-rounded thinker.'],['cap','Thinking cap',null,1500,'Put your thinking cap on.'],['cloud','Brainstorm',null,4000,'A little cloud with a bright idea brewing.'],['wizard','Quiz wizard',null,6000,'A starry hat for a little quiz magic.'],['graduate','Top of the class',null,8000,'A graduation cap. Your head is in a class of its own.']],
    prop:[['none','No extra'],['cookie','Smart cookie',null,300,'A chocolate chip cookie. One clever little snack.'],['icepop','Brain freeze',null,800,'An ice pop to cool off a busy brain.'],['peas','Peas of mind',null,1800,'Peace of mind, one little pea at a time.'],['bulb','Bright idea',null,2500,'A light bulb for your next bright idea.'],['pencil','Sharp thinker',null,4500,'A well-sharpened pencil, ready for a sharp thinker.'],['rocket','Rocket science',null,7000,'A tiny rocket for ideas that are ready to take off.'],['book','Bookworm',null,9000,'A little worm who always has time for one more page.']]
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
  function fromPublicStyle(style){
    if(!style||typeof style!=='object'||Array.isArray(style))return {};
    const value=Number(style.render_xp),renderXp=Number.isFinite(value)?Math.max(0,Math.min(9000,value)):0;
    const frame=Object.hasOwn(frameXp,style.frame)&&renderXp>=frameXp[style.frame]?style.frame:'level';
    return {avatarDesign:style.design?.mode==='built'?available(style.design,renderXp):null,
      avatarRenderXp:renderXp,avatarFrame:frame};
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
    }
    if(kind==='hat'){
      if(id==='beanie')return '<path d="M54 48Q53 12 100 12T146 48" fill="#d66c3e"/><path d="M64 42Q67 21 82 19M84 42 87 16M103 42 103 14M123 42 118 17M138 42 132 25" fill="none" stroke="#bc5331" stroke-width="3"/><rect x="49" y="39" width="102" height="21" rx="8" fill="#e8844e"/><rect x="92" y="43" width="18" height="12" rx="3" fill="#ffdc86"/>';
      if(id==='cap')return '<path d="M55 48Q52 15 99 15Q137 15 145 48Z" fill="#3e856c"/><path d="M100 18Q116 26 116 46M60 46H145" fill="none" stroke="#286a56" stroke-width="3"/><path d="M103 43Q145 37 164 51Q152 62 109 55Z" fill="#286a56"/><circle cx="94" cy="30" r="5" fill="#ffdd75"/>';
      if(id==='wizard')return `<path d="M56 52 105 5 144 53Z" fill="#4b4288"/><path d="M46 52Q98 39 156 53Q154 67 101 65Q47 65 46 52Z" fill="#342e6b"/><polygon points="${star(105,32,8)}" fill="#ffdb66"/><circle cx="86" cy="45" r="3" fill="#ffdb66"/>`;
      if(id==='egg')return '<path d="M49 48Q39 32 58 27Q66 8 83 20Q104 6 117 20Q142 13 146 31Q166 39 148 53Q142 65 123 58Q105 67 89 58Q64 67 55 54Z" fill="#fff7e8" stroke="#dfcbaa" stroke-width="2"/><ellipse cx="102" cy="38" rx="20" ry="16" fill="#f4bf41"/><path d="M91 32Q96 26 104 28" fill="none" stroke="#ffe48a" stroke-width="4" stroke-linecap="round"/>';
      if(id==='cloud')return '<path d="M52 51Q42 28 65 27Q73 9 94 21Q116 7 130 27Q154 25 153 45Q163 62 139 63H62Q45 63 52 51Z" fill="#eff7ff" stroke="#a7b8d0" stroke-width="2"/><path d="M98 50 86 67H99L94 80 114 59H101L110 50Z" fill="#f5c94e" stroke="#b58a28" stroke-width="1.5" stroke-linejoin="round"/><path d="M61 69 57 76M139 69 135 76" stroke="#669fc4" stroke-width="3" stroke-linecap="round"/>';
      if(id==='graduate')return '<path d="M75 34H129V57Q102 69 75 57Z" fill="#423d70"/><path d="M38 30 101 9 165 30 101 52Z" fill="#302b58" stroke="#6e659d" stroke-width="2" stroke-linejoin="round"/><path d="M101 30 146 39V65" fill="none" stroke="#efc653" stroke-width="3" stroke-linecap="round"/><path d="M142 64H150L153 77H139Z" fill="#efc653"/><circle cx="101" cy="30" r="4" fill="#efc653"/>';
    }
    if(kind==='prop'){
      if(id==='icepop')return '<g transform="rotate(14 158 151)"><rect x="153" y="148" width="10" height="31" rx="5" fill="#c18d56"/><path d="M139 119Q139 104 158 104T177 119V151Q158 162 139 151Z" fill="#ef7095"/><path d="M139 130H177V144H139Z" fill="#fff4d6"/><path d="M139 144H177V151Q158 162 139 151Z" fill="#6ab9d5"/><path d="M147 116V128" stroke="#fff" stroke-opacity=".6" stroke-width="4" stroke-linecap="round"/></g><path d="M27 65V79M20 72H34M22 67 32 77M22 77 32 67" stroke="#78b8cb" stroke-width="2" stroke-linecap="round"/>';
      if(id==='bulb')return '<g transform="rotate(12 160 135)"><path d="M147 137Q146 130 141 124Q129 103 147 94Q164 84 176 102Q183 116 171 128Q168 132 168 137Z" fill="#ffda6d" stroke="#b88b23" stroke-width="3"/><path d="M150 139H166M151 146H165M154 152H162M154 135 150 113 162 116 161 135" fill="none" stroke="#896b2d" stroke-width="3" stroke-linecap="round"/><path d="M135 86 130 80M158 78V70M180 86 185 80" stroke="#d6a72c" stroke-width="3" stroke-linecap="round"/></g>';
      if(id==='pencil')return '<g transform="rotate(18 158 144)"><path d="M148 119H168V163L158 183 148 163Z" fill="#f5c75c" stroke="#8d6a31" stroke-width="2"/><path d="M149 163H167L158 183Z" fill="#e7bf94"/><path d="M154 175 158 183 162 175Z" fill="#41384c"/><rect x="147" y="106" width="22" height="14" rx="5" fill="#e98c9e"/><path d="M148 124H168M158 128V160" stroke="#b48b32" stroke-width="3"/></g>';
      if(id==='cookie')return '<g transform="rotate(12 158 137)"><path d="M174 115Q179 116 181 122Q171 126 182 133Q184 150 170 158Q150 168 138 150Q126 132 140 118Q155 104 174 115Z" fill="#d7a15f" stroke="#a77342" stroke-width="2"/><g fill="#825133"><circle cx="147" cy="119" r="3"/><circle cx="171" cy="144" r="3"/><circle cx="147" cy="148" r="3"/><circle cx="160" cy="155" r="2.5"/></g><g fill="none" stroke="#45394b" stroke-width="2"><circle cx="148" cy="132" r="6"/><circle cx="165" cy="132" r="6"/><path d="M154 132H159M153 143Q158 147 163 143" stroke-linecap="round"/></g><circle cx="148" cy="132" r="1.5" fill="#45394b"/><circle cx="165" cy="132" r="1.5" fill="#45394b"/></g>';
      if(id==='peas')return '<g transform="rotate(16 158 138)"><path d="M160 102Q185 125 169 159L156 177Q136 151 140 128Q142 110 160 102Z" fill="#568b45" stroke="#366b39" stroke-width="2"/><path d="M158 108Q148 138 158 168" fill="none" stroke="#a5ce70" stroke-width="3"/><g fill="#a5cd72" stroke="#42733b" stroke-width="1.5"><circle cx="158" cy="122" r="9"/><circle cx="158" cy="141" r="9"/><circle cx="159" cy="159" r="8"/></g><path d="M153 121 155 122 157 121M160 121 162 122 164 121M155 140 157 141M161 140 163 141M156 145Q159 148 162 145" fill="none" stroke="#365d36" stroke-width="1.4" stroke-linecap="round"/><path d="M160 103Q157 94 165 94" fill="none" stroke="#366b39" stroke-width="3" stroke-linecap="round"/></g>';
      if(id==='rocket')return '<g transform="rotate(12 159 139)"><path d="M149 153 144 170 154 165M168 153 175 169 164 166" fill="#d87742" stroke="#9d4b30" stroke-width="2" stroke-linejoin="round"/><path d="M153 161Q146 174 159 182Q172 175 165 161Z" fill="#f2bc51"/><path d="M156 164Q152 174 159 177Q166 174 162 164Z" fill="#fff0b0"/><path d="M149 154Q139 122 158 98Q179 120 168 154L166 163H152Z" fill="#f8f0df" stroke="#85879f" stroke-width="2"/><path d="M147 117Q151 104 158 98Q168 108 171 118Z" fill="#d87742"/><circle cx="159" cy="134" r="8" fill="#79bfd1" stroke="#435673" stroke-width="3"/><path d="M153 154H166" stroke="#435673" stroke-width="3"/></g>';
      if(id==='book')return '<path d="M135 142Q148 137 160 145Q171 135 184 139L181 175Q170 171 160 180Q149 173 136 177Z" fill="#51477e"/><path d="M138 139Q149 136 160 142Q172 132 181 136L179 170Q169 166 160 176Q150 169 139 173Z" fill="#fff5dc" stroke="#cbbba0" stroke-width="1.5"/><path d="M160 143V174M143 147 153 150M143 154 153 157M167 145 176 141M167 152 176 148" stroke="#c8b796" stroke-width="1.5" stroke-linecap="round"/><path d="M145 148Q132 143 139 132Q148 122 147 114" fill="none" stroke="#578945" stroke-width="10" stroke-linecap="round"/><circle cx="147" cy="113" r="10" fill="#99c970" stroke="#578945" stroke-width="2"/><circle cx="144" cy="111" r="2" fill="#354437"/><circle cx="151" cy="111" r="2" fill="#354437"/><path d="M144 117Q148 121 152 116" fill="none" stroke="#354437" stroke-width="1.5" stroke-linecap="round"/>';
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
  return Object.freeze({options,metadataKeys,clean,available,fromMetadata,fromPublicStyle,frameXp,markup});
})();
