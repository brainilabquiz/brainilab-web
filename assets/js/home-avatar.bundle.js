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
  // These IDs describe artwork, not entitlement claims. The profile checks the
  // account's server-earned collection; public social RPCs check it independently.
  const academyRewards=Object.freeze([
    {id:'academy_calendar',kind:'hat',name:'Date night',course:'calendars-explained',courseTitle:'Years and calendars',description:'A tiny calendar hat. Every day is a good day to learn.'},
    {id:'academy_abacus',kind:'prop',name:'Count on me',course:'maths-from-zero',courseTitle:'Maths from zero',description:'A pocket abacus. A friend you can count on.'},
    {id:'academy_mathspecs',kind:'glasses',name:'Sum shades',course:'mental-maths-foundations',courseTitle:'Mental math for beginners',description:'Plus and minus frames. Things are adding up nicely.'},
    {id:'academy_moon',kind:'prop',name:'Over the Moon',course:'sun-moon-and-time',courseTitle:'The Moon and time',description:'A smiling crescent. Over the Moon about what you know.'},
    {id:'academy_detective',kind:'hat',name:'Case closed',course:'word-detective',courseTitle:'Word detective',description:'A detective hat for someone who follows every word of a clue.'},
    {id:'academy_pie',kind:'prop',name:'Piece of cake',course:'fractions-from-zero',courseTitle:'Fractions, one piece at a time',description:'One carefully shared slice. Fractions? A piece of cake.'},
    {id:'academy_puzzle',kind:'prop',name:'Fits the bill',course:'patterns-and-reasoning',courseTitle:'Patterns and reasoning',description:'A duck-shaped puzzle piece. A little logic that fits the bill.'},
    {id:'academy_rainbow',kind:'hat',name:'Sky high',course:'sky-colours',courseTitle:'Sky colours and starlight',description:'A rainbow over your head. Keep your curiosity sky high.'}
  ].map(Object.freeze));
  const discoveryGames=Object.freeze([
    ['brainmix','Brain Mix','/games/brain-mix/'],['brainiword','BrainiWord','/games/brainiword/'],['connections','Connections','/games/connections/'],
    ['numberroute','Number Route','/games/number-route/'],['mathrush','Math Rush','/games/math-rush/'],['sequence','Sequence','/games/sequence/'],
    ['worldflags','World Flags','/geography/world-flags-quiz/'],['worldcapitals','World Capitals','/geography/world-capitals-quiz/'],
    ['science','Science','/science/science-quiz/'],['history','History','/history/history-quiz/'],['sports','Sports','/sports/sports-quiz/'],
    ['generalknowledge','General Knowledge','/general-knowledge/general-knowledge-quiz/'],['orderup','Order Up','/games/order-up/'],
    ['topicrush','Topic Rush','/games/topic-rush/'],['oddoneout','Odd One Out','/games/odd-one-out/'],['higherlower','Higher or Lower','/games/higher-lower/'],['survival','Survival','/games/survival/']
  ].map(([id,name,path])=>Object.freeze({id,name,path})));
  const discoveryRewards=Object.freeze([
    {id:'discovery_trailmix',kind:'prop',name:'Trail mix',challenge:'Try something new',target:3,description:'A little bag of trail mix. A tasty reward for taking a different route.'},
    {id:'discovery_gameface',kind:'glasses',name:'Game face',challenge:'Keep exploring',target:8,description:'Controller-shaped glasses. Put your game face on.'},
    {id:'discovery_paperhat',kind:'hat',name:'Word on the street',challenge:'Follow the words',games:Object.freeze(['brainiword','connections']),description:'A folded newspaper hat. You heard the word here first.'},
    {id:'discovery_crunch',kind:'hat',name:'Number cruncher',challenge:'Make the numbers count',games:Object.freeze(['numberroute','mathrush','sequence']),description:'A bowl of crunchy numbers. Breakfast for a busy brain.'},
    {id:'discovery_globe',kind:'prop',name:'Globe trotter',challenge:'Take a world tour',games:Object.freeze(['worldflags','worldcapitals']),description:'A tiny globe in walking boots. A world of curiosity on the move.'}
  ].map(Object.freeze));
  const dayRewards=Object.freeze([
    {id:'days_daydreamer',kind:'hat',name:'Daydreamer',days:3,description:'A sleepy cloud hat. Make a little room for daydreams.'},
    {id:'days_thyme',kind:'prop',name:'Thyme after thyme',days:10,description:'A little pot of thyme. Good things grow at your own pace.'},
    {id:'days_sunday',kind:'glasses',name:'Sun-day best',days:30,description:'Sunny glasses for any day of the week. Your sun-day best.'},
    {id:'days_smore',kind:'prop',name:'Back for s’more',days:100,description:'A smiling toasted marshmallow sandwich. Always room for s’more.'}
  ].map(Object.freeze));
  const earnedExtras=[...academyRewards,...discoveryRewards,...dayRewards];
  for(const reward of earnedExtras)choices[reward.kind].push([reward.id,reward.name,null,0,reward.description]);
  const options=Object.freeze(Object.fromEntries(Object.entries(choices).map(([key,list])=>[key,Object.freeze(list.map(([id,name,color,xp=0,description=''])=>Object.freeze({id,name,color,xp,description,...(earnedExtras.find(r=>r.id===id)||{})})))])));
  // Seasonal items are earned separately. No amount of XP or editable metadata
  // can grant them; callers must supply the server's sanitized entitlement IDs.
  const eventOptions=Object.freeze({
    hat:Object.freeze([Object.freeze({id:'pumpkin-thinker',name:'Pumpkin thinker',xp:0,event:'halloween-2026',description:'A little pumpkin for a bright idea.',requirement:'Complete one Halloween game'})]),
    prop:Object.freeze([Object.freeze({id:'little-bat',name:'Little bat',xp:0,event:'halloween-2026',description:'A tiny bat to keep your ideas company.',requirement:'Play on three different days'})])
  });
  const eventIds=Object.freeze(['pumpkin-thinker','midnight','little-bat']);
  const earnedIds=value=>Array.isArray(value)?value.filter(id=>typeof id==='string'&&eventIds.includes(id)):[];
  const allOptions=Object.fromEntries(Object.entries(options).map(([key,list])=>[key,[...list,...(eventOptions[key]||[])]]));
  const metadataKeys=Object.freeze(Object.fromEntries(Object.keys(options).map(key=>[key,'brainilab_avatar_'+key.replace(/[A-Z]/g,c=>'_'+c.toLowerCase())+'_v1'])));
  function clean(value={}){
    return Object.fromEntries(Object.entries(allOptions).map(([key,list])=>[key,list.some(item=>item.id===value?.[key])?value[key]:list[0].id]));
  }
  function available(value,xp=0,entitlements=window.BrainiHalloweenEntitlements?.snapshot?.().entitlements||[]){
    const result=clean(value),total=Number.isFinite(Number(xp))?Math.max(0,Number(xp)):0,owned=earnedIds(entitlements);
    for(const [key,list] of Object.entries(allOptions)){
      const item=list.find(item=>item.id===result[key]);
      if(item.event?!owned.includes(item.id):item.xp>total)result[key]=list[0].id;
    }
    return result;
  }
  function fromMetadata(meta={}){return clean(Object.fromEntries(Object.entries(metadataKeys).map(([key,name])=>[key,meta?.[name]])));}
  // Public RPCs supply only sanitized cosmetics and their minimum render threshold,
  // never another player's auth metadata or total XP. Legacy payloads stay valid.
  const frameXp=Object.freeze({level:0,blue:100,green:500,copper:1500,prism:2500,gold:3000,aurora:4750,orbit:6000,nova:8500});
  const profileTitles=Object.freeze({explorer:'Explorer',curious:'Curious Mind',detective:'Puzzle Detective',thinker:'Deep Thinker',sage:'BrainiLab Sage'});
  function fromPublicStyle(style){
    if(!style||typeof style!=='object'||Array.isArray(style))return {};
    const value=Number(style.render_xp),renderXp=Number.isFinite(value)?Math.max(0,Math.min(9000,value)):0;
    const entitlements=earnedIds(style.earned_items);
    const frame=style.frame==='midnight'&&entitlements.includes('midnight')?'midnight':Object.hasOwn(frameXp,style.frame)&&renderXp>=frameXp[style.frame]?style.frame:'level';
    return {avatarDesign:style.design?.mode==='built'?available(style.design,renderXp,entitlements):null,
      ...(entitlements.length?{avatarEntitlements:entitlements}:{}),
      avatarRenderXp:renderXp,avatarFrame:frame,
      profileTitle:typeof style.title==='string'&&Object.hasOwn(profileTitles,style.title)?style.title:'none',
      profileAchievements:window.BrainiAchievementDisplay?.publicChoices(style.achievements)||[]};
  }
  const color=(kind,id)=>options[kind].find(item=>item.id===id).color;
  const backdropArt=Object.freeze({
    lilac:['#9a85d0','#fff4ff','<path d="M-15 145 105-14h42L0 181ZM115 214 219 78v46l-68 90Z"/><circle cx="155" cy="60" r="22"/>'],
    sky:['#5ba9d0','#f4feff','<path d="M-8 72Q20 24 63 48T142 40Q171 20 210 32v24q-25-13-60 7T67 74Q19 57-8 101ZM-10 162q47-29 85-13t137-16v39q-58 45-130 27t-92 12Z"/>'],
    sage:['#578f70','#f5ffd8','<path d="M26 171C2 130 3 96 21 65q20 43 13 89C39 87 66 55 98 32q-4 64-56 133ZM173 177q-7-56 27-97-1 60-27 97Z"/>'],
    sunshine:['#e6a840','#fffbea','<path d="m100 102-87-91L0 42ZM100 102l20-110H82ZM100 102l102-47 6-43ZM100 102l34 105h45ZM100 102l-105 23v43Z"/><circle cx="100" cy="102" r="55"/>'],
    coral:['#dd8478','#fff0de','<path d="M-12 99C38 46 93 81 128 53S168 11 207 21v30c-56-3-47 45-115 50S14 103-12 137ZM-15 166q57-34 100-12t126-30v52q-68 39-136 27t-90 10Z"/>']
  });
  function backdrop(id){
    const [shade,light,pattern]=backdropArt[id]||backdropArt.lilac;
    return '<rect width="200" height="200" rx="100" fill="'+color('background',Object.hasOwn(backdropArt,id)?id:'lilac')+'"/>'+
      '<g fill="'+shade+'" opacity=".27">'+pattern+'</g><circle cx="88" cy="81" r="66" fill="'+light+'" opacity=".55"/>'+
      '<path d="M28 68 32 58l4 10-4 10ZM168 110l4-10 4 10-4 10Z" fill="'+light+'" opacity=".9"/><circle cx="160" cy="44" r="3" fill="'+light+'"/>';
  }
  function star(cx,cy,r=13){
    return Array.from({length:10},(_,i)=>{const a=(i*36-90)*Math.PI/180,n=i%2?r*.46:r;return `${(cx+Math.cos(a)*n).toFixed(2)},${(cy+Math.sin(a)*n).toFixed(2)}`;}).join(' ');
  }
  function baseAccessory(kind,id){
    if(kind==='glasses'){
      if(id==='days_sunday')return '<g fill="none" stroke="#c28b31" stroke-width="2.5" stroke-linecap="round"><path d="M76 76V71M76 119V124M55 97H50M97 97H102M60 81 56 77M92 113 96 117M60 113 56 117M92 81 96 77M125 76V71M125 119V124M104 97H99M146 97H151M109 81 105 77M141 113 145 117M109 113 105 117M141 81 145 77"/><path d="M93 96Q100 92 108 96M57 89 51 85M144 89 150 85" stroke-width="4"/></g><g fill="#e4b95e" stroke="#ac782e" stroke-width="2.5"><circle cx="76" cy="97" r="17"/><circle cx="125" cy="97" r="17"/></g><g fill="#638f9c"><circle cx="76" cy="97" r="12"/><circle cx="125" cy="97" r="12"/></g><path d="m68 93 6-5M117 93l6-5" stroke="#d3ebec" stroke-width="3" stroke-linecap="round"/>';
      if(id==='discovery_gameface')return '<g fill="#3c375f" stroke="#252342" stroke-width="2.5" stroke-linejoin="round"><path d="M64 87Q80 81 94 88L97 108Q93 117 85 107H73Q62 118 61 108Z M106 88Q121 81 136 87L139 108Q137 118 127 107H115Q107 117 103 108Z"/><path d="M96 94Q100 91 104 94M62 90 52 85M138 90 148 85" fill="none" stroke-width="4"/></g><path d="M72 91V101M67 96H77" stroke="#f0cf76" stroke-width="2.5" stroke-linecap="round"/><circle cx="125" cy="92" r="2.5" fill="#8cbe9b"/><circle cx="131" cy="99" r="2.5" fill="#d58a91"/><path d="M79 104H86M112 104H119" stroke="#8e84b0" stroke-width="2" stroke-linecap="round"/>';
      if(id==='academy_mathspecs')return '<g fill="#fff" fill-opacity=".3" stroke="#376b6a" stroke-width="4" stroke-linejoin="round"><rect x="62" y="82" width="33" height="29" rx="8"/><rect x="105" y="82" width="33" height="29" rx="8"/><path d="M95 94Q100 90 105 94M62 90 53 86M138 90 147 86" fill="none"/></g><path d="M72 88V104M64 96H80M119 96H131" fill="none" stroke="#e3ad38" stroke-width="3" stroke-linecap="round"/>';
      const arms='<path d="M65 94 53 89M135 94 147 89" fill="none" stroke="#302c46" stroke-width="4" stroke-linecap="round"/>';
      if(id==='round')return `${arms}<g fill="#eff7fa" fill-opacity=".18" stroke="#39334f" stroke-width="3.5"><circle cx="80" cy="96" r="15"/><circle cx="120" cy="96" r="15"/><path d="M95 94Q100 89 105 94" fill="none"/></g><g fill="none" stroke="#fff7e4" stroke-width="2" stroke-linecap="round" opacity=".8"><path d="M70 92Q73 85 80 85M110 92Q113 85 120 85"/></g><path d="M66 98Q69 110 81 111M106 98Q109 110 121 111" fill="none" stroke="#776347" stroke-width="1.5"/><g fill="#d5ad64"><circle cx="64" cy="93" r="2"/><circle cx="136" cy="93" r="2"/></g>`;
      if(id==='square')return `${arms}<g fill="#edf8ef" fill-opacity=".2" stroke="#286756" stroke-width="3.5" stroke-linejoin="round"><rect x="64" y="83" width="31" height="27" rx="7"/><rect x="105" y="83" width="31" height="27" rx="7"/><path d="M95 94Q100 89 105 94" fill="none"/></g><path d="M69 89Q70 87 75 87H84M110 89Q111 87 116 87H125" fill="none" stroke="#d3ead7" stroke-width="2" stroke-linecap="round"/><path d="M139 87 143 91 148 79H156" fill="none" stroke="#286756" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><g fill="#d5ad64"><circle cx="65" cy="91" r="1.8"/><circle cx="135" cy="91" r="1.8"/></g>`;
      if(id==='sun')return `${arms}<g stroke="#302c46" stroke-width="3.5" stroke-linejoin="round"><path d="M62 87Q78 84 96 87L93 105Q81 116 66 104ZM104 87Q122 84 138 87L134 104Q120 116 107 105Z" fill="#302c46"/><path d="M96 93Q100 90 104 93" fill="none"/></g><path d="M68 91 91 90 88 99 72 105Z M110 91 133 90 130 99 114 105Z" fill="#5d628a" opacity=".8"/><path d="M71 92H85M113 92H127" stroke="#e3e7f2" stroke-opacity=".8" stroke-width="2.5" stroke-linecap="round"/><g fill="#d2ac64"><circle cx="65" cy="91" r="1.7"/><circle cx="135" cy="91" r="1.7"/></g>`;
      if(id==='star')return `${arms}<g fill="#ffe5a1" fill-opacity=".4" stroke="#9c772e" stroke-width="3" stroke-linejoin="round"><polygon points="${star(80,96,15)}"/><polygon points="${star(120,96,15)}"/><path d="M95 96H105"/></g><path d="M73 92 78 88M113 92 118 88" stroke="#fff9df" stroke-width="2.5" stroke-linecap="round"/><path d="M70 104 76 103M110 104 116 103" stroke="#d9ac4d" stroke-width="1.5" stroke-linecap="round"/>`;
      if(id==='visor')return '<path d="M55 89Q100 77 145 89L138 110Q100 119 62 110Z" fill="#347f8a" stroke="#263f60" stroke-width="4" stroke-linejoin="round"/><path d="M65 91Q100 84 135 91L131 104Q100 110 69 104Z" fill="#a7e6de"/><path d="M75 91 82 105M87 89 94 107" stroke="#fff" stroke-opacity=".6" stroke-width="4"/><path d="M52 90H61M139 90H148" stroke="#263f60" stroke-width="4" stroke-linecap="round"/>';
      if(id==='monocle')return '<circle cx="119" cy="97" r="17" fill="#eff9ff" fill-opacity=".14" stroke="#997025" stroke-width="4"/><path d="M109 89 116 85" stroke="#fff7d5" stroke-width="3" stroke-linecap="round"/><path d="M132 109Q151 122 142 140Q137 149 149 155" fill="none" stroke="#997025" stroke-width="2.5" stroke-linecap="round"/><circle cx="149" cy="156" r="3" fill="#e5bf5c"/>';
      if(id==='doughnut')return `${arms}<g fill="#fff" fill-opacity=".12" stroke="#c58c54" stroke-width="10"><circle cx="80" cy="96" r="13"/><circle cx="120" cy="96" r="13"/></g><path d="M63 92Q66 76 80 78Q94 77 97 92M103 92Q106 76 120 78Q134 77 137 92" fill="none" stroke="#e88fa7" stroke-width="6" stroke-linecap="round"/><path d="M71 80 73 84M85 81 88 78M111 80 114 83M125 80 128 77" stroke="#fff0bd" stroke-width="2.5" stroke-linecap="round"/><path d="M97 95H103" stroke="#6b4a39" stroke-width="4"/>`;
      if(id==='heart')return `${arms}<g fill="#f1a3b9" fill-opacity=".18" stroke="#a94068" stroke-width="3.5" stroke-linejoin="round"><path d="M80 112 64 97C53 86 68 75 80 86C92 75 107 86 96 97ZM120 112 104 97C93 86 108 75 120 86C132 75 147 86 136 97Z"/><path d="M98 94Q100 92 102 94" fill="none"/></g><path d="M66 87Q70 82 74 86M106 87Q110 82 114 86" fill="none" stroke="#fff4ed" stroke-width="2.5" stroke-linecap="round"/>`;
      if(id==='camera')return `${arms}<g fill="#579588" fill-opacity=".25" stroke="#285d59" stroke-width="3.5" stroke-linejoin="round"><rect x="61" y="83" width="37" height="29" rx="7"/><rect x="102" y="83" width="37" height="29" rx="7"/><path d="M98 95Q100 93 102 95" fill="none"/></g><path d="M67 82V78H77V82M125 82V78H135V82" fill="#d49a55" stroke="#285d59" stroke-width="2.5" stroke-linejoin="round"/><g fill="#fff" fill-opacity=".12" stroke="#285d59" stroke-width="3"><circle cx="80" cy="97" r="10"/><circle cx="120" cy="97" r="10"/></g><path d="M73 91 77 88M113 91 117 88" stroke="#fff4df" stroke-width="2" stroke-linecap="round"/><circle cx="94" cy="87" r="1.5" fill="#f2c969"/><circle cx="135" cy="87" r="1.5" fill="#f2c969"/>`;
    }
    if(kind==='hat'){
      if(id==='pumpkin-thinker')return '<path d="M96 15Q95 5 105 5L109 18" fill="#679151" stroke="#3f6840" stroke-width="3"/><path d="M51 44Q49 20 75 19Q100 9 125 19Q151 20 149 44Q144 67 101 63Q57 67 51 44Z" fill="#e7893e" stroke="#b8622a" stroke-width="2"/><path d="M79 22Q67 43 80 60M100 20V62M121 23Q135 44 121 60" fill="none" stroke="#c96d2e" stroke-width="3"/><path d="M72 35 84 32 80 42ZM117 32 130 35 121 42Z" fill="#49384e"/><path d="M89 48Q101 56 113 48" fill="none" stroke="#49384e" stroke-width="3" stroke-linecap="round"/>';
      if(id==='days_daydreamer')return '<path d="M59 49Q44 48 48 34Q50 23 62 26Q63 11 79 12Q91 7 101 17Q113 8 124 18Q140 17 141 31Q155 32 153 43Q153 52 140 53H64Z" fill="#fff5e9" stroke="#ab9ec6" stroke-width="2.5"/><path d="M109 24Q99 26 103 36Q108 43 117 37Q109 39 107 32Q105 27 109 24Z" fill="#e9c46a" stroke="#be9b50" stroke-width="1.2"/><path d="m78 23 2 4 4 1-3 3v4l-3-2-4 2 1-4-3-3 4-1Z" fill="#b6a6d5"/><path d="M62 42Q66 46 70 42M84 42Q88 46 92 42" fill="none" stroke="#86749d" stroke-width="2" stroke-linecap="round"/>';
      if(id==='discovery_paperhat')return '<path d="M49 54 99 9 152 54 99 65Z" fill="#eee9db" stroke="#8a8091" stroke-width="2" stroke-linejoin="round"/><path d="M99 9V58L73 35M99 9 124 35" fill="none" stroke="#bbb0ad" stroke-width="2"/><path d="M43 52H157V64H43Z" fill="#f8f3e7" stroke="#8a8091" stroke-width="2"/><path d="M54 57H79M118 57H145M80 37H91M108 35H120M69 44H91M108 43H132" stroke="#aca3ae" stroke-width="2" stroke-linecap="round"/><path d="m96 56 4-5 4 5-4 5Z" fill="#bf9272"/>';
      if(id==='discovery_crunch')return '<path d="M61 29H139L133 53Q100 68 67 53Z" fill="#82b4aa" stroke="#497d78" stroke-width="2.5"/><ellipse cx="100" cy="29" rx="39" ry="10" fill="#fff3d5" stroke="#497d78" stroke-width="2.5"/><g fill="#e3b569" stroke="#b38343" stroke-width="1.5"><circle cx="79" cy="26" r="5"/><circle cx="98" cy="31" r="5"/><circle cx="118" cy="27" r="5"/><circle cx="88" cy="33" r="4"/><circle cx="108" cy="24" r="4"/></g><path d="M135 27 148 7" stroke="#817891" stroke-width="4" stroke-linecap="round"/><ellipse cx="149" cy="7" rx="5" ry="7" fill="#b1abc1" transform="rotate(32 149 7)"/><path d="M77 43 81 40V52M93 42Q103 37 103 44L94 52H104M115 41Q124 39 124 44L119 46Q128 48 120 53H115" fill="none" stroke="#fff4cf" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      if(id==='academy_calendar')return '<g transform="rotate(-8 100 36)"><rect x="66" y="8" width="69" height="53" rx="6" fill="#fff6de" stroke="#926c56" stroke-width="2"/><path d="M67 14Q67 8 73 8H129Q135 8 135 14V24H67Z" fill="#c7655b"/><path d="M81 5V16M120 5V16" stroke="#634968" stroke-width="4" stroke-linecap="round"/><path d="M78 34H85M96 34H103M114 34H121M78 45H85M96 45H103" stroke="#b8a8a4" stroke-width="3" stroke-linecap="round"/><path d="m113 44 4 4 7-9" fill="none" stroke="#438461" stroke-width="3" stroke-linecap="round"/></g>';
      if(id==='academy_detective')return '<path d="M55 51 64 24Q67 17 77 21L97 28 118 19Q128 16 133 26L145 52Z" fill="#b88b60" stroke="#755642" stroke-width="2"/><path d="M71 22 77 49M89 26 91 48M111 23 109 48M127 22 123 48" fill="none" stroke="#e2bf8d" stroke-width="3"/><path d="M51 49Q99 43 149 49L157 58Q142 66 101 59Q61 66 43 58Z" fill="#99724e" stroke="#755642" stroke-width="2"/><path d="m92 49 8-5 8 5-8 5Z" fill="#526c58"/>';
      if(id==='academy_rainbow')return '<path d="M53 58A47 47 0 0 1 147 58" fill="none" stroke="#ce7970" stroke-width="10"/><path d="M63 58A37 37 0 0 1 137 58" fill="none" stroke="#efc76d" stroke-width="10"/><path d="M73 58A27 27 0 0 1 127 58" fill="none" stroke="#79ac91" stroke-width="10"/><path d="M83 58A17 17 0 0 1 117 58" fill="none" stroke="#7e9fce" stroke-width="10"/><path d="M39 60Q33 48 45 46Q49 34 60 43Q75 39 77 52Q88 60 74 65H45Z M127 60Q120 49 133 46Q138 35 149 44Q162 42 164 54Q174 62 159 66H133Z" fill="#fff7ea" stroke="#9baac4" stroke-width="2"/>';
      if(id==='beanie')return `<path d="M53 48Q52 12 100 11Q147 11 147 48Z" fill="#d66c3e" stroke="#9d4f35" stroke-width="2.5"/><path d="M57 45Q59 24 80 18Q68 27 68 45Z" fill="#ef9b61" opacity=".65"/><g fill="none" stroke="#b85434" stroke-width="2" stroke-linecap="round"><path d="M71 40Q72 24 84 17M87 40 91 14M103 40V14M120 40 116 16M135 40 130 23"/></g><rect x="48" y="39" width="104" height="23" rx="8" fill="#e68550" stroke="#9d4f35" stroke-width="2.5"/><path d="M54 44H146M57 57H143" fill="none" stroke="#f5b57c" stroke-width="1.5" stroke-linecap="round"/><path d="M62 45V56M72 45V56M82 45V56M119 45V56M129 45V56M139 45V56" stroke="#bb5a39" stroke-width="1.5"/><rect x="91" y="43" width="19" height="14" rx="3" fill="#ffdf8d" stroke="#b6753e" stroke-width="1.5"/><path d="m96 50 3 3 6-7" fill="none" stroke="#9e683a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      if(id==='cap')return `<path d="M54 48Q52 14 99 14Q138 14 146 48Z" fill="#438c73" stroke="#28634f" stroke-width="2.5"/><path d="M60 42Q65 23 87 19Q73 29 74 45Z" fill="#79ad8a" opacity=".65"/><path d="M100 17Q115 25 117 45M63 46H144" fill="none" stroke="#28634f" stroke-width="2"/><path d="M103 43Q145 37 164 51Q152 63 109 55Z" fill="#286a56" stroke="#245c4b" stroke-width="2"/><path d="M116 47Q143 43 155 50" fill="none" stroke="#78a78a" stroke-width="2" stroke-linecap="round"/><path d="M89 24Q95 21 101 25V35Q95 40 89 35Z" fill="#f7d776" stroke="#bca252" stroke-width="1.2"/><path d="m92 29 3 4 4-6" fill="none" stroke="#37684d" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="99" cy="14" rx="4" ry="2" fill="#28634f"/>`;
      if(id==='wizard')return `<path d="M56 52Q78 20 105 5Q104 24 120 32L145 53Z" fill="#5b4d96" stroke="#342e6b" stroke-width="2.5" stroke-linejoin="round"/><path d="M65 48Q83 21 101 12Q88 36 90 48Z" fill="#8978b5" opacity=".6"/><path d="M100 17Q105 32 121 37" fill="none" stroke="#3b326b" stroke-width="2" stroke-linecap="round"/><path d="M46 52Q98 39 156 53Q154 67 101 65Q47 65 46 52Z" fill="#342e6b" stroke="#2d2856" stroke-width="2"/><path d="M59 52Q98 45 142 53" stroke="#9380be" stroke-width="2" stroke-linecap="round" fill="none"/><polygon points="${star(107,32,8)}" fill="#ffdb66" stroke="#c5a044" stroke-width="1"/><circle cx="83" cy="44" r="2.5" fill="#ffdb66"/><path d="m126 47 2-3 2 3-2 2Z" fill="#e9c774"/>`;
      if(id==='egg')return '<path d="M49 48Q39 32 58 27Q66 8 83 20Q104 6 117 20Q142 13 146 31Q166 39 148 53Q142 65 123 58Q105 67 89 58Q64 67 55 54Z" fill="#fff7e8" stroke="#dfcbaa" stroke-width="2"/><ellipse cx="102" cy="38" rx="20" ry="16" fill="#f4bf41"/><path d="M91 32Q96 26 104 28" fill="none" stroke="#ffe48a" stroke-width="4" stroke-linecap="round"/>';
      if(id==='cloud')return '<path d="M52 51Q42 28 65 27Q73 9 94 21Q116 7 130 27Q154 25 153 45Q163 62 139 63H62Q45 63 52 51Z" fill="#eff7ff" stroke="#a7b8d0" stroke-width="2"/><path d="M98 50 86 67H99L94 80 114 59H101L110 50Z" fill="#f5c94e" stroke="#b58a28" stroke-width="1.5" stroke-linejoin="round"/><path d="M61 69 57 76M139 69 135 76" stroke="#669fc4" stroke-width="3" stroke-linecap="round"/>';
      if(id==='graduate')return `<path d="M75 34H129V57Q102 70 75 57Z" fill="#504777" stroke="#302b58" stroke-width="2"/><path d="M80 48Q102 57 125 48V54Q103 64 80 55Z" fill="#6e6597"/><path d="M38 30 101 9 165 30 101 52Z" fill="#393260" stroke="#211e46" stroke-width="2.5" stroke-linejoin="round"/><path d="M48 30 101 13 151 29" fill="none" stroke="#8d82ae" stroke-width="2" stroke-linecap="round"/><path d="M101 30 146 39V65" fill="none" stroke="#efc653" stroke-width="3" stroke-linecap="round"/><path d="M143 65H150L153 78H140Z" fill="#efc653" stroke="#b58b35" stroke-width="1.5" stroke-linejoin="round"/><path d="M146 68V75M149 69 150 75" stroke="#ffe7a0" stroke-width="1.2" stroke-linecap="round"/><circle cx="101" cy="30" r="4" fill="#efc653" stroke="#b58b35" stroke-width="1.2"/>`;
      if(id==='corn')return '<ellipse cx="101" cy="30" rx="22" ry="27" fill="#f5c34a" stroke="#c28d2e" stroke-width="2"/><path d="M83 17H119M80 28H122M81 39H121M93 5V52M104 4V54M114 9V48" stroke="#d39a30" stroke-width="2" fill="none"/><path d="M101 61Q68 64 53 31Q82 31 101 61Z" fill="#548b48" stroke="#376b3b" stroke-width="2"/><path d="M100 61Q121 25 150 29Q139 65 100 61Z" fill="#77a956" stroke="#376b3b" stroke-width="2"/><path d="M63 39Q84 43 100 59M138 37Q117 45 101 59" fill="none" stroke="#abc978" stroke-width="2.5" stroke-linecap="round"/>';
      if(id==='wave')return '<path d="M48 58Q63 51 70 31Q78 5 109 9Q141 12 137 34Q133 46 118 42Q132 27 115 25Q96 25 106 43Q118 58 154 53L153 65Q96 72 48 65Z" fill="#5caec1" stroke="#327a98" stroke-width="2" stroke-linejoin="round"/><path d="M64 44Q71 13 100 10Q129 7 137 25Q128 13 112 17Q91 22 99 40Q106 52 128 55" fill="none" stroke="#e7f7f8" stroke-width="6" stroke-linecap="round"/><path d="M57 59Q82 65 103 58M115 63Q133 67 146 60" fill="none" stroke="#b6e1e3" stroke-width="3" stroke-linecap="round"/>';
      if(id==='toast')return '<path d="M71 29Q62 20 71 12Q83 1 100 7Q117 1 129 12Q138 20 129 29V58Q100 65 71 58Z" fill="#bf834d" stroke="#8b5737" stroke-width="2.5" stroke-linejoin="round"/><path d="M77 29Q69 21 77 16Q87 9 100 14Q113 9 123 16Q131 21 123 29V53Q100 58 77 53Z" fill="#ffe0a0"/><path d="M87 27Q94 20 103 23" fill="none" stroke="#fff2c6" stroke-width="3" stroke-linecap="round"/><g fill="#6b4b38"><circle cx="90" cy="36" r="2.5"/><circle cx="111" cy="36" r="2.5"/></g><path d="M94 44Q100 49 107 44" fill="none" stroke="#6b4b38" stroke-width="2" stroke-linecap="round"/><ellipse cx="84" cy="42" rx="4" ry="2" fill="#e3a16d"/><ellipse cx="117" cy="42" rx="4" ry="2" fill="#e3a16d"/>';
      if(id==='coffee')return '<path d="M93 16Q86 11 92 5M108 16Q115 11 109 5" fill="none" stroke="#a7a9b8" stroke-width="2.5" stroke-linecap="round"/><path d="M128 29H135Q148 29 145 41Q143 50 128 48" fill="none" stroke="#a3523a" stroke-width="6" stroke-linecap="round"/><path d="M72 27H130L126 52Q101 64 77 52Z" fill="#e58a62" stroke="#a3523a" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="101" cy="27" rx="29" ry="9" fill="#fff5de" stroke="#a3523a" stroke-width="2.5"/><ellipse cx="101" cy="27" rx="22" ry="5.5" fill="#c38b57"/><path d="M101 30Q88 24 94 22Q98 20 101 24Q105 20 109 22Q115 24 101 30Z" fill="#fff5de"/><path d="M79 35 82 47" stroke="#fbb794" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="101" cy="60" rx="40" ry="4" fill="#f2c796" stroke="#a3523a" stroke-width="2"/>';
    }
    if(kind==='prop'){
      if(id==='little-bat')return '<g transform="rotate(8 157 132)"><path d="M154 125Q138 107 122 112L127 132 139 128 145 143 156 137M162 125Q178 107 194 112L190 132 178 128 172 143 161 137" fill="#62527f" stroke="#403651" stroke-width="2" stroke-linejoin="round"/><path d="M150 123 149 111 158 118 167 111 166 125Q175 147 158 151Q142 147 150 123Z" fill="#403651"/><g fill="#fff1d3"><ellipse cx="153" cy="129" rx="2.6" ry="3"/><ellipse cx="163" cy="129" rx="2.6" ry="3"/></g><path d="M154 139Q158 143 162 139" fill="none" stroke="#d1a7bc" stroke-width="2" stroke-linecap="round"/></g>';
      if(id==='days_thyme')return '<path d="M141 143H177L173 175H146Z" fill="#cf8d67" stroke="#9d634a" stroke-width="2.5"/><rect x="138" y="139" width="42" height="9" rx="3" fill="#e3a87e" stroke="#9d634a" stroke-width="2"/><g fill="none" stroke="#527f53" stroke-width="2.5" stroke-linecap="round"><path d="M157 139V105M154 139 145 111M162 139l11-29"/></g><g fill="#8db67c" stroke="#527f53" stroke-width="1.5"><ellipse cx="150" cy="111" rx="7" ry="3.5" transform="rotate(35 150 111)"/><ellipse cx="164" cy="118" rx="7" ry="3.5" transform="rotate(-30 164 118)"/><ellipse cx="150" cy="125" rx="7" ry="3.5" transform="rotate(30 150 125)"/><ellipse cx="171" cy="110" rx="6" ry="3" transform="rotate(-45 171 110)"/><ellipse cx="142" cy="119" rx="6" ry="3" transform="rotate(40 142 119)"/></g><circle cx="159" cy="160" r="8" fill="#fff2d8" stroke="#a57552" stroke-width="1.5"/><path d="M159 155V160L163 162" fill="none" stroke="#8d6c51" stroke-width="1.5" stroke-linecap="round"/>';
      if(id==='days_smore')return '<g transform="rotate(10 158 143)"><path d="M134 158H183V173H134Z" fill="#d7aa70" stroke="#a27647" stroke-width="2"/><path d="M131 151H186V161H131Z" fill="#79513f" stroke="#573d33" stroke-width="2"/><path d="M138 120Q133 112 143 110H176Q185 113 180 123L181 147Q186 157 174 156H143Q131 158 137 147Z" fill="#fff2da" stroke="#cda977" stroke-width="2"/><path d="M140 126Q158 132 179 125" fill="none" stroke="#ead0a8" stroke-width="5" stroke-linecap="round"/><path d="M132 107H186V118H132Z" fill="#e6bf86" stroke="#a27647" stroke-width="2"/><path d="M140 111H143M152 111H155M165 111H168M177 111H180M141 167H145M154 167H158M169 167H173" stroke="#bb8d55" stroke-width="2" stroke-linecap="round"/><circle cx="148" cy="138" r="2" fill="#705043"/><circle cx="168" cy="138" r="2" fill="#705043"/><path d="M152 146Q158 151 164 146" fill="none" stroke="#9f6957" stroke-width="2" stroke-linecap="round"/></g>';
      if(id==='discovery_trailmix')return '<g transform="rotate(9 157 142)"><path d="M138 116 144 108H175L182 118 177 171H141Z" fill="#ecd7b2" stroke="#a17c52" stroke-width="2"/><path d="M140 119H181M144 112H175" stroke="#b28b62" stroke-width="3"/><path d="M144 133 160 125 177 134 173 157 149 160Z" fill="#759d7f"/><path d="m148 148 8-13 6 10 5-7 8 15Z" fill="#e7dfb2"/><g fill="#bd8b59"><ellipse cx="149" cy="164" rx="3" ry="2"/><ellipse cx="160" cy="164" rx="3" ry="2"/></g><circle cx="170" cy="164" r="2" fill="#93657c"/></g>';
      if(id==='discovery_globe')return '<path d="M147 156 144 169H137Q131 170 132 176H151L155 157M169 157 172 168H180Q186 169 184 175H166L162 158" fill="#b68459" stroke="#77533d" stroke-width="2" stroke-linejoin="round"/><circle cx="158" cy="131" r="29" fill="#83bed0" stroke="#527e9b" stroke-width="2.5"/><path d="m140 111 12-7 10 7-5 8 6 8-11 5-3-9-10-2ZM172 127l11-2 3 11-8 12-11-5-3-8ZM138 138l10 1 4 10-7 5-8-8Z" fill="#78a883"/><path d="M137 126Q158 133 181 125M143 110Q154 131 148 154M169 109Q179 132 167 155" fill="none" stroke="#f4f1cf" stroke-width="1.5" opacity=".6"/>';
      if(id==='academy_abacus')return '<g transform="rotate(9 158 143)"><rect x="134" y="109" width="49" height="65" rx="5" fill="#e8c297" stroke="#926a4c" stroke-width="3"/><path d="M138 126H179M138 143H179M138 160H179" stroke="#795e51" stroke-width="2"/><g fill="#6c9f88" stroke="#446f5b" stroke-width="1.5"><rect x="143" y="120" width="7" height="12" rx="3"/><rect x="152" y="120" width="7" height="12" rx="3"/></g><g fill="#efc064" stroke="#b08234" stroke-width="1.5"><rect x="155" y="137" width="7" height="12" rx="3"/><rect x="164" y="137" width="7" height="12" rx="3"/></g><g fill="#ca7d7b" stroke="#93545d" stroke-width="1.5"><rect x="143" y="154" width="7" height="12" rx="3"/><rect x="152" y="154" width="7" height="12" rx="3"/><rect x="161" y="154" width="7" height="12" rx="3"/></g></g>';
      if(id==='academy_moon')return `<path d="M167 104Q132 103 134 137Q136 166 164 165Q181 164 187 149Q153 154 152 128Q151 113 167 104Z" fill="#f1cc71" stroke="#b78c38" stroke-width="2.5"/><path d="M143 136Q147 133 150 136M145 146Q150 151 156 147" fill="none" stroke="#80613b" stroke-width="2" stroke-linecap="round"/><polygon points="${star(174,119,8)}" fill="#9a91c8"/><polygon points="${star(126,101,5)}" fill="#d7b75f"/>`;
      if(id==='academy_pie')return '<g transform="rotate(8 159 142)"><path d="M134 143 168 115 187 150 153 172Z" fill="#f5e0b0" stroke="#a87953" stroke-width="2"/><path d="M134 143 153 155 187 135 168 115Z" fill="#fff0cd" stroke="#a87953" stroke-width="2"/><path d="M153 155V172L187 150V135Z" fill="#e8bb7d"/><path d="M154 162 184 144" stroke="#c85d78" stroke-width="5"/><path d="M135 144 153 155 187 135" fill="none" stroke="#fff9e9" stroke-width="5" stroke-linejoin="round"/><circle cx="163" cy="131" r="6" fill="#c65c70"/><path d="M163 125Q162 118 169 119" fill="none" stroke="#5a875c" stroke-width="2" stroke-linecap="round"/><path d="M161 143 164 142M172 137 175 135M148 142 150 141" stroke="#b396c4" stroke-width="2" stroke-linecap="round"/></g>';
      if(id==='academy_puzzle')return '<g transform="rotate(9 157 140)"><path d="M133 133H144Q136 119 148 117Q159 116 155 130H166V117Q181 111 182 124Q182 132 172 130V144H181V167H164Q170 154 158 154Q148 155 153 167H133V153Q121 159 121 148Q121 136 133 143Z" fill="#82b6b0" stroke="#477b7e" stroke-width="2.5" stroke-linejoin="round"/><path d="M148 120Q148 108 160 109Q172 110 167 122L181 126 165 131H151Z" fill="#f1ca6d" stroke="#b18a3d" stroke-width="2"/><circle cx="160" cy="117" r="2" fill="#463c54"/><path d="M143 147Q151 143 160 147" stroke="#c3e2cf" stroke-width="3" stroke-linecap="round" fill="none"/></g>';
      if(id==='icepop')return '<g transform="rotate(14 158 151)"><rect x="153" y="148" width="10" height="31" rx="5" fill="#c18d56"/><path d="M139 119Q139 104 158 104T177 119V151Q158 162 139 151Z" fill="#ef7095"/><path d="M139 130H177V144H139Z" fill="#fff4d6"/><path d="M139 144H177V151Q158 162 139 151Z" fill="#6ab9d5"/><path d="M147 116V128" stroke="#fff" stroke-opacity=".6" stroke-width="4" stroke-linecap="round"/></g><path d="M27 65V79M20 72H34M22 67 32 77M22 77 32 67" stroke="#78b8cb" stroke-width="2" stroke-linecap="round"/>';
      if(id==='bulb')return `<g transform="rotate(12 160 135)"><path d="M147 137Q146 130 141 124Q129 103 147 94Q164 84 176 102Q183 116 171 128Q168 132 168 137Z" fill="#ffdc77" stroke="#b88b23" stroke-width="2.5"/><path d="M143 111Q141 102 150 99" fill="none" stroke="#fff3c7" stroke-width="4" stroke-linecap="round"/><path d="M150 136 148 115 154 119 159 114 164 119 166 114 163 136" fill="none" stroke="#b18a36" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M147 137H168V147Q158 154 148 147Z" fill="#b9b5ac" stroke="#746d64" stroke-width="2"/><path d="M150 140H166M150 145H166M155 152H161" fill="none" stroke="#f4ebce" stroke-width="2" stroke-linecap="round"/><path d="M135 86 130 80M158 78V70M180 86 185 80" stroke="#d6a72c" stroke-width="3" stroke-linecap="round"/></g>`;
      if(id==='pencil')return `<g transform="rotate(18 158 144)"><path d="M148 119H168V163L158 183 148 163Z" fill="#f5c75c" stroke="#8d6a31" stroke-width="2" stroke-linejoin="round"/><path d="M149 120H155V163H149Z" fill="#ffe69a"/><path d="M161 120H167V163H161Z" fill="#d8a33e"/><path d="M149 163H167L158 183Z" fill="#e7bf94" stroke="#8d6a31" stroke-width="1.5" stroke-linejoin="round"/><path d="M154 175 158 183 162 175Z" fill="#41384c"/><rect x="147" y="106" width="22" height="14" rx="5" fill="#e98c9e" stroke="#b96e7e" stroke-width="2"/><path d="M151 109H163" stroke="#ffc1c6" stroke-width="2" stroke-linecap="round"/><path d="M148 120H168V128H148Z" fill="#c9c5bb" stroke="#8f8c86" stroke-width="1.5"/><path d="M151 121V126M156 121V126M161 121V126M166 121V126" stroke="#eee9dd" stroke-width="1.2"/><path d="M158 132V159" stroke="#b48b32" stroke-width="1.5" stroke-linecap="round"/></g>`;
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
  // Finish for the line-drawn glasses and the paler hats: tinted lenses with a glare, and soft
  // shade or light on hats. Drawn around the original art, so geometry and framing are unchanged.
  const glare=(a,b)=>`<path d="M${a-7} ${b+4}L${a+2} ${b-5}M${a-3} ${b+8}L${a} ${b+5}" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2.6" stroke-linecap="round"/>`;
  const tint=(shape,fill='#cfe8f3')=>`<g fill="${fill}" opacity=".42">${shape}</g>`;
  const polish=Object.freeze({
    round:{under:tint('<circle cx="80" cy="96" r="13.5"/><circle cx="120" cy="96" r="13.5"/>'),over:glare(80,96)+glare(120,96)},
    square:{under:tint('<rect x="66" y="85" width="27" height="23" rx="5.5"/><rect x="107" y="85" width="27" height="23" rx="5.5"/>','#d6eedc'),over:glare(80,97)+glare(120,97)},
    heart:{under:tint('<path d="M80 112 64 97C53 86 68 75 80 86C92 75 107 86 96 97ZM120 112 104 97C93 86 108 75 120 86C132 75 147 86 136 97Z"/>','#f7c6d4'),over:glare(76,93)+glare(116,93)},
    camera:{under:tint('<circle cx="80" cy="97" r="9"/><circle cx="120" cy="97" r="9"/>','#cfe6e1'),over:glare(80,97)+glare(120,97)},
    academy_mathspecs:{under:tint('<rect x="64" y="84" width="29" height="25" rx="6"/><rect x="107" y="84" width="29" height="25" rx="6"/>','#d3ebe9'),over:'<path d="M85 90 90 85M128 90 133 85" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2.6" stroke-linecap="round"/>'},
    egg:{over:'<path d="M57 55Q100 67 147 52" fill="none" stroke="#e3cfa8" stroke-opacity=".9" stroke-width="4" stroke-linecap="round"/><ellipse cx="103" cy="49" rx="17" ry="3.5" fill="#d9b067" opacity=".35"/>'},
    academy_detective:{over:'<path d="M70 31Q98 24 127 29" fill="none" stroke="#f0d2a6" stroke-opacity=".65" stroke-width="3" stroke-linecap="round"/><path d="M50 56Q99 51 150 56" fill="none" stroke="#5e4330" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>'},
    discovery_paperhat:{over:'<path d="M49 54 99 9V58Z" fill="#2d296e" opacity=".07"/><path d="M45 61H155" stroke="#8a8091" stroke-opacity=".4" stroke-width="2"/>'},
    days_daydreamer:{over:'<path d="M62 50Q100 57 141 51" fill="none" stroke="#cfc3e3" stroke-width="4" stroke-linecap="round"/>'},
    cloud:{over:'<path d="M58 59Q70 62 84 63M116 63Q130 62 143 59" fill="none" stroke="#c7d5ea" stroke-width="4.5" stroke-linecap="round"/>'}
  });
  function accessory(kind,id){
    const art=baseAccessory(kind,id),extra=art&&Object.hasOwn(polish,id)?polish[id]:null;
    return extra?(extra.under||'')+art+(extra.over||''):art;
  }
  // Safe framing measured from the original local SVG geometry; no runtime layout reads.
  const previewBoxes=Object.freeze({"pumpkin-thinker":"40 -5 120 85","little-bat":"105 95 100 80","round":"40.6 68.6 118.8 54.8","square":"39.7 65.7 129.6 57.6","sun":"40.6 73.1 118.8 49.6","monocle":"91.1 69.1 71.8 100.8","heart":"40.6 69 118.8 55.4","star":"40.6 68.6 118.8 51.9","visor":"39.4 70.4 121.2 56.7","doughnut":"40.6 64.6 118.8 56.8","camera":"40.6 65.6 118.8 58.8","academy_mathspecs":"40.6 69.6 118.8 53.8","discovery_gameface":"39.4 71.6 121.2 53.7","days_sunday":"36.9 57.9 127.2 79.2","beanie":"34.6 -2.4 130.8 77.8","egg":"31.5 -1.1 139.2 77.7","cap":"39.9 -2 138.1 74.2","corn":"40.3 -9.7 122.4 83.8","toast":"56.8 -4.8 86.4 76","cloud":"35.3 1.5 134.4 92.2","coffee":"49.5 -6.5 107.5 81.9","wave":"34.4 -5.1 133.2 87.2","wizard":"32 -9 138 88.3","graduate":"22.3 -6.7 158.4 100.4","academy_calendar":"51.9 -8.1 96.8 84.1","academy_detective":"28.6 3.9 142.8 72.8","academy_rainbow":"20.9 -5.1 163.2 87.2","discovery_paperhat":"28.6 -5.4 142.8 84.8","discovery_crunch":"48.4 -14.2 121.1 87.3","days_daydreamer":"33.5 -3.3 133.3 69.9","cookie":"118.8 96.4 77.5 78.8","icepop":"127.4 89.9 71.3 100.3","peas":"117.9 84.6 78 107.1","bulb":"124.5 53.4 85.2 111.2","train":"118.5 71.5 75.4 114.4","owl":"126.9 99.4 61.7 73.4","pencil":"125.5 93.5 65.7 101.7","nacho":"122.4 95.6 72.4 78","rocket":"126.2 84.4 65.5 110.1","roll":"117.7 106.7 81.2 83.5","book":"124.3 92.3 70.4 98.4","academy_abacus":"119.3 95.5 78.9 92.2","academy_moon":"111.3 86.1 85.6 88.8","academy_pie":"120.7 102.4 79.2 82.6","academy_puzzle":"107.4 98.1 88 82.4","discovery_trailmix":"123.8 95.5 73.1 88.9","discovery_globe":"118.6 91.6 78.8 94.8","days_thyme":"125.3 93.5 64.8 91.6","days_smore":"117.9 92.6 84.3 94.6"});
  // Catalogue previews isolate the chosen object; equipped portraits keep the full character.
  function preview(kind,id,draft={}){
    if(!['glasses','hat','prop'].includes(kind))return '';
    const item=allOptions[kind].find(option=>option.id===id);
    if(!item)return '';
    if(id==='none')return markup({...draft,mode:'built',glasses:'none',hat:'none',prop:'none'},0);
    const box=previewBoxes[id]||(kind==='glasses'?'40 64 120 104':kind==='hat'?'26 -8 150 100':'112 66 86 124');
    let drawing=accessory(kind,id);
    if(id==='icepop')drawing=drawing.slice(0,drawing.lastIndexOf('</g>')+4);
    const label=item.name.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="120" height="120" role="img" aria-label="${label}" class="braini-cosmetic-preview" data-cosmetic-kind="${kind}" data-cosmetic-id="${id}">${drawing}</svg>`;
  }
  function markup(value,xp=0,entitlements=window.BrainiHalloweenEntitlements?.snapshot?.().entitlements||[]){
    const v=available(value,xp,entitlements),skin=color('skin',v.skin),hair=color('hairColor',v.hairColor),shirt=color('shirt',v.shirt);
    const dark=v.skin==='umber'||v.skin==='ebony',mouth=dark?'#efbdab':'#673d3c',nose=dark?'#f4d0b0':'#302c46';
    const back={bob:`<path d="M53 87Q46 39 101 38Q154 36 148 98L150 139Q99 158 49 138Z" fill="${hair}"/>`,
      ponytail:`<ellipse cx="145" cy="108" rx="22" ry="42" fill="${hair}"/><path d="M131 75Q144 65 157 77" fill="none" stroke="#e9bd5e" stroke-opacity="1" stroke-width="5"/>`,
      waves:`<path d="M52 81Q46 36 101 35Q155 35 148 84Q167 105 152 122Q171 144 151 159Q142 173 126 159H75Q57 175 44 157Q29 143 47 121Q31 101 52 81Z" fill="${hair}"/>`}[v.hair]||'';
    const hairFront={
      sweep:`<path d="M58 91Q45 36 104 36Q150 35 143 86L131 71Q97 84 77 62Q67 78 58 91Z" fill="${hair}"/>`,
      curls:`<g fill="${hair}"><circle cx="68" cy="64" r="18"/><circle cx="82" cy="48" r="18"/><circle cx="105" cy="46" r="19"/><circle cx="126" cy="53" r="18"/><circle cx="139" cy="69" r="15"/></g>`,
      bob:`<path d="M57 85Q53 38 101 38Q151 39 144 89L130 69Q114 79 94 64Q80 81 57 85Z" fill="${hair}"/>`,
      crop:`<path d="M59 75Q61 37 101 39Q140 40 142 77Q101 58 59 75Z" fill="${hair}"/>`,bald:'',
      ponytail:`<path d="M57 88Q47 38 101 36Q150 37 143 87L132 71Q104 80 81 62Q71 79 57 88Z" fill="${hair}"/>`,
      waves:`<path d="M54 89Q49 37 101 35Q152 37 147 88Q133 93 131 70Q112 82 92 61Q80 83 65 79L62 115Q48 111 54 89Z" fill="${hair}"/>`,
      braids:`<path d="M57 86Q49 37 100 36Q152 37 143 86L131 69Q100 78 76 65L66 84Z" fill="${hair}"/><g fill="${hair}"><path d="M57 78Q44 89 52 99Q42 108 51 118Q42 130 50 139Q44 149 55 154Q68 149 61 138Q70 127 61 117Q70 107 61 98Q70 87 57 78Z"/><path d="M57 78Q44 89 52 99Q42 108 51 118Q42 130 50 139Q44 149 55 154Q68 149 61 138Q70 127 61 117Q70 107 61 98Q70 87 57 78Z" transform="translate(200 0) scale(-1 1)"/></g><path d="M50 147H61M139 147H150" stroke="#e9bd5e" stroke-opacity="1" stroke-width="4" stroke-linecap="round"/>`
    }[v.hair];
    // Finish layers: soft light and shade drawn with opacity only (no gradient IDs), so
    // every portrait stays deterministic and the accessory geometry above is unchanged.
    const line='stroke="#241c2e" stroke-opacity=".16" stroke-width="1.6" stroke-linejoin="round"';
    const shine={sweep:'M84 47Q104 40 124 46',bob:'M80 48Q100 42 122 48',crop:'M80 47Q100 42 121 47',ponytail:'M82 46Q102 40 124 46',waves:'M80 45Q101 39 124 45',braids:'M80 46Q100 41 122 46',curls:'M61 59Q64 52 71 51M98 40Q104 36 111 40M121 47Q127 44 132 49'}[v.hair];
    const hairShine=v.hair==='bald'?'<ellipse cx="86" cy="58" rx="11" ry="5" fill="#fff" opacity=".22" transform="rotate(-14 86 58)"/>':`<path d="${shine}" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="${v.hair==='curls'?3:4.5}" stroke-linecap="round"/>`;
    const finish={
      shirt:'<path d="M29 201Q30 166 54 156Q43 178 45 201Z M171 201Q170 166 146 156Q157 178 155 201Z" fill="#000" opacity=".13"/><path d="M70 153Q100 181 130 153" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="6" stroke-linecap="round"/><path d="M57 172Q64 162 75 159" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="4" stroke-linecap="round"/>',
      face:`<path d="M141 88V108Q139 141 100 147Q127 137 132 109Q135 96 141 88Z" fill="#5a2e1e" opacity=".1"/><path d="M59 78Q60 48 100 48Q140 48 141 78V108Q139 141 100 147Q62 141 59 108Z" fill="none" ${line}/><path d="M57 95Q53 101 57 107M143 95Q147 101 143 107" fill="none" stroke="#5a2e1e" stroke-opacity=".24" stroke-width="2" stroke-linecap="round"/>`,
      eyes:'<path d="M75.4 92.4Q81 88.6 86.6 92.4M113.4 92.4Q119 88.6 124.6 92.4" fill="none" stroke="#302c46" stroke-width="1.7" stroke-linecap="round"/><g fill="#fff"><circle cx="82.6" cy="94.6" r="1.5"/><circle cx="120.6" cy="94.6" r="1.5"/></g>'
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Your illustrated BrainiLab avatar" class="braini-built-avatar"><g style="clip-path:circle(50%)">${backdrop(v.background)}</g><g ${line}>${back}</g><path d="M29 201Q30 153 71 151H129Q169 153 171 201Z" fill="${shirt}"/>${finish.shirt}<path d="M81 130H119V159Q100 176 81 159Z" fill="${skin}"/><path d="M81 136Q100 149 119 136V148Q100 161 81 148Z" fill="#302c46" opacity=".1"/><g fill="${skin}"><ellipse cx="59" cy="101" rx="9" ry="12"/><ellipse cx="141" cy="101" rx="9" ry="12"/><path d="M59 78Q60 48 100 48Q140 48 141 78V108Q139 141 100 147Q62 141 59 108Z"/></g>${finish.face}<g ${line}>${hairFront}</g>${hairShine}<path d="M73 84Q81 80 89 84M111 84Q119 80 127 84" fill="none" stroke="${hair}" stroke-width="3.5" stroke-linecap="round"/><g fill="#fff8ed"><ellipse cx="81" cy="97" rx="5.4" ry="6.5"/><ellipse cx="119" cy="97" rx="5.4" ry="6.5"/></g><g fill="#302c46"><ellipse cx="81" cy="97" rx="3.7" ry="5"/><ellipse cx="119" cy="97" rx="3.7" ry="5"/></g>${finish.eyes}<path d="M100 100 96 113H103" fill="none" stroke="${nose}" stroke-opacity=".35" stroke-width="2.5" stroke-linecap="round"/><path d="M87 123Q100 136 113 123" fill="none" stroke="${mouth}" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="74" cy="114" rx="7" ry="3" fill="#d77971" opacity=".24"/><ellipse cx="126" cy="114" rx="7" ry="3" fill="#d77971" opacity=".24"/>${accessory('glasses',v.glasses)}${accessory('hat',v.hat)}${accessory('prop',v.prop)}</svg>`;
  }
  return Object.freeze({options,eventOptions,eventIds,earnedIds,academyRewards,discoveryGames,discoveryRewards,dayRewards,metadataKeys,clean,available,fromMetadata,fromPublicStyle,frameXp,profileTitles,markup,preview,accessory,backdrop});
})();

/* ===== avatar-studio-art.js ===== */

/* Shared character portrait for the studio and saved avatar surfaces. */
window.BrainiAvatarStudioArt=(()=>{
  const A=BrainiAvatarDesign;
  const sceneVersions={library:'bc2e29e50a79',lab:'c24336b91bc0',stars:'9236b09fa514'};
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
  const frameEffects=Object.freeze({
    level:glide(108,'#fff0a2',1.6,'9 91','avatar-frame-glint'),
    blue:glide(104,'#e7fbff',3.8,'15 85','avatar-frame-tide')+
      glide(110,'#a9dfff',1.2,'5 95','avatar-frame-reverse'),
    green:'<g class="avatar-frame-canopy" fill="#dbfa91"><ellipse cx="22" cy="44" rx="8" ry="3.5" transform="rotate(-45 22 44)"/><ellipse cx="184" cy="160" rx="8" ry="3.5" transform="rotate(-45 184 160)"/><circle cx="166" cy="183" r="2.6"/></g>'+
      glide(105,'#c9f78d',2.4,'12 88','avatar-frame-tide'),
    copper:glide(113,'#ffc494',2.6,'1 2 1 4 1 91','avatar-frame-etch')+
      glide(104,'#ffe0bb',2.1,'9 91','avatar-frame-glint'),
    gold:glide(105,'#fff9cb',4,'9 91','avatar-frame-glint')+
      '<g class="avatar-frame-starlight" fill="#fff8d4"><path d="m16 55 1.6 4.4 4.4 1.6-4.4 1.6L16 67l-1.6-4.4L10 61l4.4-1.6Z"/><circle cx="185" cy="36" r="2.8"/><circle cx="180" cy="160" r="2.3"/></g>',
    orbit:glide(109,'#b7abff',2.4,'15 20 9 56','avatar-frame-reverse')+
      '<g class="avatar-frame-spin avatar-orbit"><path d="M68-8a113 113 0 0 1 32-5M-10 125a113 113 0 0 0 12 31M210 124a113 113 0 0 1-12 32" fill="none" stroke="#9d8ffa" stroke-width="2" stroke-linecap="round"/><circle cx="100" cy="-13" r="7" fill="#ffd813" stroke="#2d296e" stroke-width="2"/><circle cx="98" cy="-15" r="2.1" fill="#fff7c8"/><circle cx="2" cy="156" r="5.5" fill="#f09b65" stroke="#2d296e" stroke-width="2"/><circle cx="198" cy="156" r="5" fill="#76d68a" stroke="#2d296e" stroke-width="2"/></g>',
    midnight:glide(110,'#ffd089',2,'7 93','avatar-frame-glint'),
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
  function markup(look,{instance,level=1,levelPct=0,stickerScale=1,cropHair=false,scene,transparentBackdrop=false}){
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
    const sticker='translate(170 170) scale('+stickerScale+') translate(-170 -170)';
    const frame=look.frame==='midnight'?'level':look.frame;
    const prop=look.prop==='none'?'':A.preview('prop',look.prop);
    const viewBox=cropHair?'46 42 148 148':'0 0 240 240';
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

    ${hair.longBack||''}
    ${hair.bobBack||''}
    ${hair.braids||''}
    ${hair.pony||''}
    ${hair.curlsBack||''}

    <path d="M28 206 C30 166 60 148 100 148 C140 148 170 166 172 206 Z" fill="${palette.shirt}"></path>
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
    <ellipse cx="100" cy="92" rx="42" ry="46" fill="${palette.skin}"></ellipse>
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
    <path d="M89 117 Q100 127 111 117" stroke="${['umber','ebony'].includes(look.skin)?'#f2c5ad':'#392533'}" stroke-width="3" fill="none" stroke-linecap="round"></path>

    ${hair.sweep||''}
    ${hair.crop||''}
    ${hair.part||''}
    ${hair.curls||''}
    ${hair.none||''}
    ${A.accessory('glasses',look.glasses)}
    </g>
    ${cropHair?'':(frames[frame]||'')+(frameDetails[frame]||'')+(frameEffects[look.frame]||'')}
    <g transform="translate(0 11)">${A.accessory('hat',look.hat)}</g>
    ${look.prop==='none'?'':`<g transform="${sticker}">
      <circle cx="171" cy="174" r="24" fill="#181729" opacity=".2"></circle>
      <circle cx="170" cy="170" r="24" fill="#2d296e"></circle>
      <circle cx="170" cy="170" r="21.5" fill="#fffaf1" stroke="#e0c082" stroke-width="1.5"></circle>
      ${prop.replace('width="120" height="120"','x="149" y="149" width="42" height="42"')}
    </g>`}
    </g>
    </svg>`;
  }
  return Object.freeze({markup,sceneSource,frameOverlay});
})();

/* ===== profile-rewards-model.js ===== */

/* Cosmetic rewards only. Never used for scores, permissions or XP awards. */
window.BrainiRewardCatalog=(function(){
  const frames=Object.freeze([
    ['level','Your level'],
    ['blue','Blue sky'],
    ['green','Fresh green'],
    ['copper','Copper glow'],
    ['prism','Prism'],
    ['gold','Golden hour'],
    ['aurora','Aurora'],
    ['orbit','Orbit'],
    ['nova','Supernova']
  ].map(([id,name])=>Object.freeze({id,name,xp:BrainiAvatarDesign.frameXp[id]})));
  const titles=Object.freeze([
    {id:'none',name:'No title',xp:0},
    {id:'explorer',name:'Explorer',xp:250},
    {id:'curious',name:'Curious Mind',xp:750},
    {id:'detective',name:'Puzzle Detective',xp:2000},
    {id:'thinker',name:'Deep Thinker',xp:4500},
    {id:'sage',name:'BrainiLab Sage',xp:10000}
  ].map(Object.freeze));
  const scenes=Object.freeze([
    {id:'none',name:'Plain & simple',xp:0,description:'Your usual clean profile.'},
    {id:'library',name:'Booked in',xp:1500,description:'A quiet library corner for a curious mind.'},
    {id:'lab',name:'In your element',xp:3500,description:'A little laboratory for your bright ideas.'},
    {id:'stars',name:'Night thinker',xp:6000,description:'A calm sky full of possibilities.'}
  ].map(Object.freeze));
  const eventFrame=Object.freeze({id:'midnight',name:'Midnight',xp:0,event:'halloween-2026',description:'A quiet midnight frame, with a little Halloween sparkle.',requirement:'Complete both Halloween games'});
  const groups=Object.freeze({frame:Object.freeze([...frames,eventFrame]),title:titles,...Object.fromEntries(Object.entries(BrainiAvatarDesign.options).map(([key,list])=>[key,Object.freeze([...list,...(BrainiAvatarDesign.eventOptions[key]||[])])])),scene:scenes});
  const eventOwned=()=>BrainiAvatarDesign.earnedIds(window.BrainiHalloweenEntitlements?.snapshot?.().entitlements);
  function visibleGroups(){const state=window.BrainiHalloweenEntitlements?.snapshot?.(),active=window.BrainiLabHalloween?.availability?.().allowed===true;return Object.fromEntries(Object.entries(groups).map(([key,list])=>[key,list.filter(item=>!item.event||state?.visible||active||eventOwned().includes(item.id))]));}
  const metadataKeys=Object.freeze({frame:'brainilab_avatar_frame_v1',title:'brainilab_profile_title_v1',...BrainiAvatarDesign.metadataKeys,scene:'brainilab_profile_scene_v1'});
  const xp=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
  function clean(value={}){
    return Object.fromEntries(Object.entries(groups).map(([key,list])=>[key,list.some(item=>item.id===value?.[key])?value[key]:list[0].id]));
  }
  const academyRewards=BrainiAvatarDesign.academyRewards;
  const discoveryRewards=BrainiAvatarDesign.discoveryRewards,discoveryGames=BrainiAvatarDesign.discoveryGames,dayRewards=BrainiAvatarDesign.dayRewards;
  const dayCount=value=>Number.isSafeInteger(value)&&value>=0?value:0;
  function academyIds(value){return Array.isArray(value)?[...new Set(value.filter(id=>academyRewards.some(item=>item.id===id)))]:[];}
  function gameIds(value){return Array.isArray(value)?discoveryGames.map(g=>g.id).filter(id=>value.includes(id)):[];}
  function discoveryProgress(item,value=[]){
    const played=gameIds(value),required=item.games||discoveryGames.map(g=>g.id),target=item.target||required.length;
    const completed=Math.min(target,required.filter(id=>played.includes(id)).length);
    return {completed,target,earned:completed===target,missing:required.filter(id=>!played.includes(id))};
  }
  const unlocked=(item,earned,academy=[],discovery=[],activeDays=0)=>item.event?eventOwned().includes(item.id):item.course?academyIds(academy).includes(item.id):item.challenge?discoveryProgress(item,discovery).earned:item.days?dayCount(activeDays)>=item.days:item.xp<=xp(earned);
  function available(value,earned,academy=[],discovery=[],activeDays=0){
    const result=clean(value),total=xp(earned);
    for(const [key,list] of Object.entries(groups))if(!unlocked(list.find(item=>item.id===result[key]),total,academy,discovery,activeDays))result[key]=list[0].id;
    return result;
  }
  function next(earned){
    const total=xp(earned);
    return Object.entries(groups).flatMap(([kind,list])=>list.map(item=>({...item,kind})))
      .filter(r=>!r.course&&!r.challenge&&!r.days&&r.xp>total).sort((a,b)=>a.xp-b.xp)[0]||null;
  }
  function xpStep(earned){
    const total=xp(earned),item=next(total);if(!item)return null;
    const thresholds=Object.values(groups).flat().filter(r=>!r.course&&!r.challenge&&!r.days&&r.xp>0&&r.xp<=total).map(r=>r.xp);
    const start=Math.max(0,...thresholds),max=item.xp-start,value=total-start;
    return {type:'xp',item,start,value,max,remaining:item.xp-total};
  }
  // One useful target, using the collection already checked for this account.
  // Days played are cumulative: they are never a claim about an unbroken streak.
  function collectionGoal(earned,state={}){
    const step=xpStep(earned),known=state.cloud&&state.owner&&!state.loading&&!state.error&&Number.isSafeInteger(state.activeDays)&&state.activeDays>=0;
    if(!known)return step;
    const days=dayCount(state.activeDays),day=dayRewards.find(r=>r.days>days);
    if(day&&(!step||day.days-days===1))return {type:'days',item:day,value:days,max:day.days,remaining:day.days-days};
    if(step)return step;
    const challenges=discoveryRewards.map(item=>({item,...discoveryProgress(item,state.discovery)})).filter(r=>!r.earned).sort((a,b)=>(a.target-a.completed)-(b.target-b.completed));
    if(challenges.length){const r=challenges[0];return {type:'discovery',item:r.item,value:r.completed,max:r.target,remaining:r.target-r.completed};}
    const courses=academyIds(state.academy),course=academyRewards.find(r=>!courses.includes(r.id));
    return course?{type:'academy',item:course,value:0,max:1,remaining:1}:null;
  }
  function surprise(style,earned,random=Math.random,academy=[],discovery=[],activeDays=0){
    const total=xp(earned),current=available(style,total,academy,discovery,activeDays),result={...current,mode:'built'};
    const kinds=['hair','hairColor','shirt','background','glasses','hat','prop'];
    // Skin tone, frame and title stay intentional. Extras stay absent in most draws.
    for(const kind of kinds){
      const earnedItems=groups[kind].filter(item=>unlocked(item,total,academy,discovery,activeDays));
      const roll=Math.min(1-Number.EPSILON,Math.max(0,Number(random())||0));
      const extra=['glasses','hat','prop'].includes(kind);
      const pool=extra?earnedItems.filter(item=>item.id!=='none'):earnedItems;
      result[kind]=extra&&(roll<.65||!pool.length)?'none':pool[Math.min(pool.length-1,Math.floor((extra?(roll-.65)/.35:roll)*pool.length))].id;
    }
    if(kinds.every(kind=>result[kind]===current[kind]))result.hair=groups.hair.find(item=>item.xp<=total&&item.id!==current.hair)?.id||current.hair;
    return result;
  }
  function fromMetadata(meta={}){return clean(Object.fromEntries(Object.entries(metadataKeys).map(([key,name])=>[key,meta?.[name]])));}
  return Object.freeze({frames,titles,scenes,item:(kind,id)=>groups[kind]?.find(item=>item.id===id),get groups(){return visibleGroups();},isUnlocked:unlocked,academyRewards,academyIds,discoveryGames,discoveryRewards,dayRewards,dayCount,gameIds,discoveryProgress,unlocked,metadataKeys,xp,clean,available,next,xpStep,collectionGoal,surprise,fromMetadata});
})();
