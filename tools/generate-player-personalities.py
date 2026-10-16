"""Generate the original, local SVG portrait collection and its browser catalogue."""
from pathlib import Path
import json,html
root=Path(__file__).resolve().parents[1];out=root/'assets/avatars/knowledge';out.mkdir(parents=True,exist_ok=True)
# Symbolic portraits inspired by familiar features and areas of work; not photographs.
people=[
('socrates','Socrates','Socrates','bald','long','scroll',0,0),('plato','Plato','Plato','curly','short','scroll',1,0),('aristotle','Aristotle','Aristotle','waves','short','scroll',2,0),('hypatia','Hypatia','Hypatia','long','none','compass',3,0),('confucius','Confucius','Confucius','cap','long','scroll',1,0),
('al-khwarizmi','Al-Khwarizmi','Al-Khwarizmi','turban','short','compass',2,0),('avicenna','Avicenna','Avicenna','turban','long','book',3,0),('maimonides','Maimonides','Maimonides','turban','short','scroll',1,0),('fibonacci','Leonardo Fibonacci','Fibonacci','cap','short','compass',0,0),('leonardo','Leonardo da Vinci','Leonardo','cap','long','gear',2,0),
('galileo','Galileo Galilei','Galileo','waves','short','telescope',0,0),('kepler','Johannes Kepler','Kepler','short','pointed','compass',1,0),('newton','Isaac Newton','Newton','wig','none','prism',0,0),('leibniz','Gottfried Leibniz','Leibniz','wig','none','compass',2,0),('descartes','René Descartes','Descartes','waves','moustache','compass',1,0),
('pascal','Blaise Pascal','Pascal','wig','moustache','gear',0,0),('euler','Leonhard Euler','Euler','turban','none','compass',1,0),('gauss','Carl Friedrich Gauss','Gauss','cap','none','compass',0,0),('faraday','Michael Faraday','Faraday','waves','none','magnet',2,0),('darwin','Charles Darwin','Darwin','bald','long','leaf',0,0),
('maxwell','James Clerk Maxwell','Maxwell','curly','long','atom',1,0),('tesla','Nikola Tesla','Tesla','parted','moustache','bolt',0,0),('einstein','Albert Einstein','Einstein','spikes','moustache','atom',0,0),('curie','Marie Curie','Curie','bun','none','flask',0,0),('bohr','Niels Bohr','Bohr','short','none','atom',1,0),
('planck','Max Planck','Planck','bald','moustache','atom',0,1),('schrodinger','Erwin Schrödinger','Schrödinger','parted','none','atom',1,1),('heisenberg','Werner Heisenberg','Heisenberg','short','none','atom',0,0),('dirac','Paul Dirac','Dirac','parted','none','atom',1,0),('feynman','Richard Feynman','Feynman','waves','none','atom',2,0),
('cajal','Santiago Ramón y Cajal','Ramón y Cajal','bald','moustache','neuron',1,0),('pavlov','Ivan Pavlov','Pavlov','bald','long','neuron',0,0),('franklin','Rosalind Franklin','Franklin','bob','none','helix',1,0),('lovelace','Ada Lovelace','Lovelace','curls','none','gear',0,0),('turing','Alan Turing','Turing','parted','none','chip',0,0),
('noether','Emmy Noether','Noether','bun','none','compass',1,1),('ramanujan','Srinivasa Ramanujan','Ramanujan','short','none','compass',4,0),('johnson','Katherine Johnson','Johnson','curls','none','orbit',5,1),('hopper','Grace Hopper','Hopper','bob','none','chip',0,1),('lamarr','Hedy Lamarr','Lamarr','waves','none','signal',1,0),
('wu','Chien-Shiung Wu','Wu','bun','none','atom',3,0),('rubin','Vera Rubin','Rubin','bob','none','orbit',0,1),('mcclintock','Barbara McClintock','McClintock','short','none','leaf',0,1),('hodgkin','Dorothy Hodgkin','Hodgkin','curls','none','helix',1,0),('tu-youyou','Tu Youyou','Tu Youyou','bob','none','flask',3,0),
('maathai','Wangari Maathai','Maathai','wrap','none','leaf',5,0),('tagore','Rabindranath Tagore','Tagore','long','long','pen',4,0),('mistral','Gabriela Mistral','Mistral','bun','none','pen',2,0),('ochoa','Severo Ochoa','Ochoa','parted','none','helix',1,0),('salam','Abdus Salam','Salam','parted','moustache','atom',4,1)]
assert len(people)==50 and len({p[0] for p in people})==50
skins=['#f1c4a6','#e8b38d','#d5a17c','#e4b78f','#b77b55','#89573d']
backgrounds=['#fff1cd','#e7eff5','#eeebfa','#e5f1e4','#f8e6dd','#dceeea','#f6eacb','#e8e9f6']
clothes=['#34306f','#3f786c','#865756','#4e6681','#645181','#53713f']
ink='#252443'
symbols={
 'scroll':'<path d="M-10-8H8v17H-8v-13m0-4c-5 0-5 6 0 6m1 1h10m-10 4h8"/>',
 'book':'<path d="M0-7c-5-3-9-3-12-1v17c4-2 8-2 12 1 4-3 8-3 12-1V-8c-3-2-7-2-12 1v17"/>',
 'compass':'<circle r="10"/><path d="m-4 6 3-12 5 12M-7 4H7"/>',
 'gear':'<circle r="6"/><circle r="2"/><path d="M0-12v4M0 8v4M-12 0h4M8 0h4m-12-8 3 3m10 10 3 3M-8 8l3-3M5-5l3-3"/>',
 'telescope':'<path d="m-10-3 18-7 3 8-18 7Zm10 6-3 10m3-10 7 9"/>',
 'prism':'<path d="M-8 8 0-9 9 8Zm-7-5h11M7 1l10-5M8 3h10M9 5l9 5"/>',
 'magnet':'<path d="M-10-8v12a10 10 0 0 0 20 0V-8H3V4a3 3 0 0 1-6 0V-8Zm0 5h7m6 0h7"/>',
 'leaf':'<path d="M-9 9C-14-7-1-12 11-10 12 3 7 15-9 9Zm-1 3L5-4M-4 6l-1-7M1 1h6"/>',
 'atom':'<ellipse rx="13" ry="5"/><ellipse rx="13" ry="5" transform="rotate(60)"/><ellipse rx="13" ry="5" transform="rotate(-60)"/><circle r="1.5" fill="currentColor"/>',
 'bolt':'<path d="m2-13-11 15H0l-2 11L10-3H1Z"/>',
 'flask':'<path d="M-4-11h8m-6 0v9L-11 10h22L2-2v-9M-7 4H7"/>',
 'neuron':'<circle r="4"/><path d="M0-4v-6m0 2-5-4m5 4 5-4M-4 0h-6m2 0-4-5m4 5-4 5M4 0h6m-2 0 4-5m-4 5 4 5M0 4v8m0-2-4 3m4-3 4 3"/>',
 'helix':'<path d="M-7-12C13-4-13 4 7 12M7-12C-13-4 13 4-7 12M-4-9h8m-7 6h6m-6 6h6m-7 6h8"/>',
 'chip':'<rect x="-8" y="-8" width="16" height="16" rx="2"/><path d="M-4-12v4m8-4v4m-8 16v4M4 8v4M-12-4h4m-4 8h4M8-4h4M8 4h4M-3-3h6v6h-6Z"/>',
 'orbit':'<ellipse rx="14" ry="6" transform="rotate(-28)"/><circle r="5"/><circle cx="11" cy="-6" r="2" fill="currentColor"/>',
 'signal':'<path d="M-12-7a18 18 0 0 1 24 0M-8-2a12 12 0 0 1 16 0M-4 3a6 6 0 0 1 8 0"/><circle cy="9" r="1.7" fill="currentColor"/>',
 'pen':'<path d="m-9 11 2-9L7-12l7 7L0 9Zm2-9 7 7M4-9l7 7M-12 13H9"/>'}
hair_shapes={
 'bald':'<path d="M38 48q-4-21 11-28m41 28q4-21-11-28" fill="none" stroke="HAIR" stroke-width="6"/>',
 'curly':'<path d="M36 51Q22 15 47 16q5-16 21-6 21-8 25 15 14 12-1 30L83 33Q66 40 45 29Z" fill="HAIR"/>',
 'waves':'<path d="M37 59Q22 8 57 13 91 5 94 35l-4 26-9-29Q64 45 45 33Z" fill="HAIR"/>',
 'parted':'<path d="M37 55Q28 20 46 16 79 1 93 29l-3 27-8-24-19-6-18 15Z" fill="HAIR"/>',
 'short':'<path d="M37 53Q27 10 58 14q28-11 35 16l-4 26-7-24-37 2Z" fill="HAIR"/>',
 'long':'<path d="M32 88V42Q30 9 63 10q34 0 34 33v45l-20-4V35L48 35l1 49Z" fill="HAIR"/>',
 'wig':'<path d="M31 86Q20 69 31 57 21 35 35 23q9-24 29-12 22-10 31 12 12 13 2 33 12 21 0 31l-17-3V31H48v53Z" fill="HAIR"/>',
 'bob':'<path d="M31 78V43Q29 10 64 12q34-1 34 34v32H81V32l-35 3v43Z" fill="HAIR"/>',
 'bun':'<circle cx="65" cy="13" r="15" fill="HAIR"/><path d="M36 56Q24 16 62 19q37-5 32 36L82 30q-20 14-36 3Z" fill="HAIR"/>',
 'curls':'<path d="M31 77Q17 65 30 54q-13-16 0-26 6-25 29-14 24-13 35 9 17 13 3 29 15 13 1 26H80V32H48v45Z" fill="HAIR"/>',
 'spikes':'<path d="m31 62-16-11 15-7-14-15 20 1-4-19 20 10 10-19 10 19 21-10-4 20 20-1-14 15 15 8-17 12-11-28H45Z" fill="HAIR"/>',
 'cap':'<path d="M35 36q-5-28 29-28 31 0 30 28Z" fill="HAIR"/><path d="M32 35h64" stroke="#c4a269" stroke-width="7"/>',
 'turban':'<path d="M32 39Q24 9 58 8q42-6 39 32Z" fill="#e9dfca" stroke="#c8b999" stroke-width="2"/><path d="M34 27 79 11M34 36l57-17M59 38l35-10" stroke="#c0af8d" stroke-width="3"/>',
 'wrap':'<path d="M31 45Q22 8 58 10q29-17 41 13l-6 25-13-18-34 3Z" fill="#567e68"/><path d="m43 15 37 19M35 27l40 12" stroke="#ffe19d" stroke-width="4"/>'}
catalog=[]
for i,(slug,name,short,hair,face,symbol,skin,glasses) in enumerate(people):
 skin=skins[skin];cloth=clothes[i%len(clothes)];hair_colour=('#e8e3da' if slug in ['einstein','darwin','tagore','pavlov','planck','cajal','leonardo','confucius'] else '#d9d3c8' if hair=='wig' else '#352c2c')
 back=hair_shapes[hair].replace('HAIR',hair_colour)
 beard=''
 if face=='long':beard=f'<path d="M39 64q6 5 8 4 17 12 34 0l8-4q1 34-25 43Q38 95 39 64Z" fill="{hair_colour}"/>'
 if face in ['short','pointed']:beard=f'<path d="M40 64q5 7 8 5 16 9 32 0l8-5q-1 24-24 {36 if face=="pointed" else 25}Q42 86 40 64Z" fill="{hair_colour}"/>'
 moustache=f'<path d="M51 68q7-9 13-2 6-7 13 2-14 8-26 0Z" fill="{hair_colour}"/>' if face!='none' else ''
 specs='<g fill="none" stroke="#353451" stroke-width="2.5"><circle cx="52" cy="55" r="10"/><circle cx="77" cy="55" r="10"/><path d="M62 55h5M42 52l-6-2m51 2 5-2"/></g>' if glasses else ''
 collar='<path d="m44 94 20 12 20-12-4 21H48Z" fill="#f5eddb"/>' if hair not in ['turban','wrap'] and i>9 else f'<path d="m42 94 22 17 22-17-9 29H51Z" fill="#e6d9c0"/>'
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img"><title>Illustrated avatar inspired by {html.escape(name)}</title><defs><clipPath id="portrait"><circle cx="64" cy="64" r="64"/></clipPath></defs><g clip-path="url(#portrait)"><path fill="{backgrounds[i%8]}" d="M0 0h128v128H0z"/><circle cx="103" cy="23" r="18" fill="#fff" opacity=".45"/><path d="M15 132q0-40 33-42h32q33 2 33 42" fill="{cloth}"/>{collar}{back}<ellipse cx="38" cy="57" rx="5" ry="8" fill="{skin}"/><ellipse cx="90" cy="57" rx="5" ry="8" fill="{skin}"/><path d="M39 40q1-17 25-18 24 1 25 18v22q-2 25-25 30-23-5-25-30Z" fill="{skin}"/>{beard}<path d="M45 48q7-4 14-1m10 0q7-3 14 1" fill="none" stroke="{hair_colour}" stroke-width="2.7" stroke-linecap="round"/><ellipse cx="52" cy="55" rx="2.5" ry="3.2" fill="{ink}"/><ellipse cx="77" cy="55" rx="2.5" ry="3.2" fill="{ink}"/><path d="m63 55-3 10h7" fill="none" stroke="#a86e54" stroke-width="1.8" stroke-linecap="round"/>{specs}<path d="M58 74q6 4 12 0" fill="none" stroke="#7b4940" stroke-width="2" stroke-linecap="round"/>{moustache}<circle cx="104" cy="103" r="23" fill="#fff8e8" stroke="{cloth}" stroke-width="2"/><g transform="translate(104 103) scale(.85)" color="{cloth}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{symbols[symbol]}</g></g></svg>'''
 (out/(slug+'.svg')).write_text(svg,encoding='utf-8')
 catalog.append(dict(id=slug,name=name,short=short,symbol=symbol,avatar='/assets/avatars/knowledge/'+slug+'.svg'))
(root/'content/player-personalities.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
js='''/* Original BrainiLab knowledge portraits. Assignment is a game nickname, not a real identity. */
window.BrainiPeople=(function(){
 const PEOPLE=CATALOG;
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
'''.replace('CATALOG',json.dumps(catalog,ensure_ascii=False,separators=(',',':')))
(root/'assets/js/player-personalities.js').write_text(js,encoding='utf-8')
print('Generated50originalSVGportraits and a stable local nickname catalogue;',sum(p.stat().st_size for p in out.glob('*.svg')),'bytes total.')
