/* Original BrainiLab character artwork. Local SVG, no remote avatar service. */
window.BrainiAvatarDesign=(function(){
  const choices={
    mode:[['picture','Your picture'],['built','Create an avatar']],
    skin:[['sand','Sand','#f3c4a0'],['peach','Peach','#ffdbc4'],['honey','Honey','#d79d6b'],['cocoa','Cocoa','#a96b47'],['umber','Umber','#744630'],['ebony','Ebony','#4c3028']],
    hair:[['sweep','Side sweep'],['curls','Curls'],['bob','Soft bob'],['crop','Short crop'],['bald','No hair']],
    hairColor:[['brown','Brown','#644130'],['black','Black','#302c36'],['blond','Blond','#e6bd63'],['auburn','Auburn','#a34e30'],['silver','Silver','#b5b6c2']],
    shirt:[['navy','Navy','#2d296e'],['green','Green','#397e39'],['orange','Orange','#d86725'],['blue','Blue','#3d86b0'],['berry','Berry','#aa4b77']],
    background:[['lilac','Lilac','#eae6fa'],['sky','Sky','#dceef8'],['sage','Sage','#e1efdf'],['sunshine','Sunshine','#fff0b3'],['coral','Coral','#fce1d6']],
    glasses:[['none','No glasses'],['round','Fresh eyes',null,150,'Round glasses. A fresh way to look at things.'],['sun','Bright mind',null,1000,'Sunglasses for a bright mind.'],['star','Star pupil',null,3500,'Star-shaped glasses. A little brilliance.']],
    hat:[['none','No hat'],['beanie','Warm thoughts',null,500,'A cozy beanie for your best ideas.'],['cap','Thinking cap',null,1500,'Put your thinking cap on.'],['wizard','Quiz wizard',null,6000,'A starry hat for a little quiz magic.']],
    prop:[['none','No extra'],['icepop','Brain freeze',null,800,'An ice pop to cool off a busy brain.'],['bulb','Bright idea',null,2500,'A light bulb for your next bright idea.'],['pencil','Sharp thinker',null,4500,'A well-sharpened pencil, ready for a sharp thinker.']]
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
  const color=(kind,id)=>options[kind].find(item=>item.id===id).color;
  function star(cx,cy,r=13){
    return Array.from({length:10},(_,i)=>{const a=(i*36-90)*Math.PI/180,n=i%2?r*.46:r;return `${(cx+Math.cos(a)*n).toFixed(2)},${(cy+Math.sin(a)*n).toFixed(2)}`;}).join(' ');
  }
  function accessory(kind,id){
    if(kind==='glasses'){
      const arms='<path d="M65 94 53 89M135 94 147 89" fill="none" stroke="#302c46" stroke-width="4" stroke-linecap="round"/>';
      if(id==='round')return `${arms}<g fill="#fff" fill-opacity=".17" stroke="#302c46" stroke-width="4"><circle cx="80" cy="96" r="14"/><circle cx="120" cy="96" r="14"/><path d="M94 95Q100 91 106 95" fill="none"/></g>`;
      if(id==='sun')return `${arms}<g stroke="#302c46" stroke-width="4" stroke-linejoin="round"><path d="M63 88H95L92 105Q80 115 67 104ZM105 88H137L133 104Q120 115 108 105Z" fill="#302c46"/><path d="M95 94Q100 91 105 94" fill="none"/></g><path d="M69 93H82M111 93H122" stroke="#fff" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"/>`;
      if(id==='star')return `${arms}<g fill="#f6cc4a" fill-opacity=".65" stroke="#7b6022" stroke-width="3" stroke-linejoin="round"><polygon points="${star(80,96)}"/><polygon points="${star(120,96)}"/><path d="M94 96H106"/></g>`;
    }
    if(kind==='hat'){
      if(id==='beanie')return '<path d="M54 48Q53 12 100 12T146 48" fill="#d66c3e"/><path d="M64 42Q67 21 82 19M84 42 87 16M103 42 103 14M123 42 118 17M138 42 132 25" fill="none" stroke="#bc5331" stroke-width="3"/><rect x="49" y="39" width="102" height="21" rx="8" fill="#e8844e"/><rect x="92" y="43" width="18" height="12" rx="3" fill="#ffdc86"/>';
      if(id==='cap')return '<path d="M55 48Q52 15 99 15Q137 15 145 48Z" fill="#3e856c"/><path d="M100 18Q116 26 116 46M60 46H145" fill="none" stroke="#286a56" stroke-width="3"/><path d="M103 43Q145 37 164 51Q152 62 109 55Z" fill="#286a56"/><circle cx="94" cy="30" r="5" fill="#ffdd75"/>';
      if(id==='wizard')return `<path d="M56 52 105 5 144 53Z" fill="#4b4288"/><path d="M46 52Q98 39 156 53Q154 67 101 65Q47 65 46 52Z" fill="#342e6b"/><polygon points="${star(105,32,8)}" fill="#ffdb66"/><circle cx="86" cy="45" r="3" fill="#ffdb66"/>`;
    }
    if(kind==='prop'){
      if(id==='icepop')return '<g transform="rotate(14 158 151)"><rect x="153" y="148" width="10" height="31" rx="5" fill="#c18d56"/><path d="M139 119Q139 104 158 104T177 119V151Q158 162 139 151Z" fill="#ef7095"/><path d="M139 130H177V144H139Z" fill="#fff4d6"/><path d="M139 144H177V151Q158 162 139 151Z" fill="#6ab9d5"/><path d="M147 116V128" stroke="#fff" stroke-opacity=".6" stroke-width="4" stroke-linecap="round"/></g><path d="M27 65V79M20 72H34M22 67 32 77M22 77 32 67" stroke="#78b8cb" stroke-width="2" stroke-linecap="round"/>';
      if(id==='bulb')return '<g transform="rotate(12 160 135)"><path d="M147 137Q146 130 141 124Q129 103 147 94Q164 84 176 102Q183 116 171 128Q168 132 168 137Z" fill="#ffda6d" stroke="#b88b23" stroke-width="3"/><path d="M150 139H166M151 146H165M154 152H162M154 135 150 113 162 116 161 135" fill="none" stroke="#896b2d" stroke-width="3" stroke-linecap="round"/><path d="M135 86 130 80M158 78V70M180 86 185 80" stroke="#d6a72c" stroke-width="3" stroke-linecap="round"/></g>';
      if(id==='pencil')return '<g transform="rotate(18 158 144)"><path d="M148 119H168V163L158 183 148 163Z" fill="#f5c75c" stroke="#8d6a31" stroke-width="2"/><path d="M149 163H167L158 183Z" fill="#e7bf94"/><path d="M154 175 158 183 162 175Z" fill="#41384c"/><rect x="147" y="106" width="22" height="14" rx="5" fill="#e98c9e"/><path d="M148 124H168M158 128V160" stroke="#b48b32" stroke-width="3"/></g>';
    }
    return '';
  }
  function markup(value,xp=0){
    const v=available(value,xp),skin=color('skin',v.skin),hair=color('hairColor',v.hairColor),shirt=color('shirt',v.shirt),bg=color('background',v.background);
    const back=v.hair==='bob'?`<path d="M53 87Q46 39 101 38Q154 36 148 98L150 139Q99 158 49 138Z" fill="${hair}"/>`:'';
    const hairFront={
      sweep:`<path d="M58 91Q45 36 104 36Q150 35 143 86L131 71Q97 84 77 62Q67 78 58 91Z" fill="${hair}"/>`,
      curls:`<g fill="${hair}"><circle cx="68" cy="64" r="18"/><circle cx="82" cy="48" r="18"/><circle cx="105" cy="46" r="19"/><circle cx="126" cy="53" r="18"/><circle cx="139" cy="69" r="15"/></g>`,
      bob:`<path d="M57 85Q53 38 101 38Q151 39 144 89L130 69Q114 79 94 64Q80 81 57 85Z" fill="${hair}"/>`,
      crop:`<path d="M59 75Q61 37 101 39Q140 40 142 77Q101 58 59 75Z" fill="${hair}"/>`,bald:''
    }[v.hair];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Your illustrated BrainiLab avatar" class="braini-built-avatar"><rect width="200" height="200" rx="100" fill="${bg}"/>${back}<path d="M29 201Q30 153 71 151H129Q169 153 171 201Z" fill="${shirt}"/><path d="M81 130H119V159Q100 176 81 159Z" fill="${skin}"/><path d="M81 136Q100 149 119 136V148Q100 161 81 148Z" fill="#302c46" opacity=".1"/><g fill="${skin}"><ellipse cx="59" cy="101" rx="9" ry="12"/><ellipse cx="141" cy="101" rx="9" ry="12"/><path d="M59 78Q60 48 100 48Q140 48 141 78V108Q139 141 100 147Q62 141 59 108Z"/></g>${hairFront}<path d="M73 84Q81 80 89 84M111 84Q119 80 127 84" fill="none" stroke="${hair}" stroke-width="3.5" stroke-linecap="round"/><g fill="#302c46"><ellipse cx="81" cy="97" rx="3.7" ry="5"/><ellipse cx="119" cy="97" rx="3.7" ry="5"/></g><path d="M100 100 96 113H103" fill="none" stroke="#302c46" stroke-opacity=".25" stroke-width="2.5" stroke-linecap="round"/><path d="M87 123Q100 136 113 123" fill="none" stroke="#673d3c" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="74" cy="114" rx="7" ry="3" fill="#d77971" opacity=".24"/><ellipse cx="126" cy="114" rx="7" ry="3" fill="#d77971" opacity=".24"/>${accessory('glasses',v.glasses)}${accessory('hat',v.hat)}${accessory('prop',v.prop)}</svg>`;
  }
  return Object.freeze({options,metadataKeys,clean,available,fromMetadata,markup});
})();
