// Work areas reuse the mounted tools. Switching does not reload evidence,
// rebuild forms, write browser storage or change a recorded decision.
const areas=[
 ['overview','Next moves','Resume approved work and review results when matching evidence is ready.',['.growth-workbench']],
 ['seo','SEO Explorer','Review observed searches, known links and the evidence for a specific page.',['#growth-seo-explorer']],
 ['search','Search & indexing','Keep Search Console periods and Google’s saved index observations in view.',['.growth-metrics','.growth-period','.growth-caution','[data-growth-first-report]','#growth-search','#growth-indexing']],
 ['play','Visits & play','Inspect measured arrivals, recorded starts and confirmed accounts with their own dates.',['.growth-tools-grid > [aria-labelledby="growth-measurement-title"]','#growth-play-sessions','[data-growth-confirmations]']],
 ['content','Content','Review articles, Academy lessons and courses using their recorded measurements.',['#growth-content']],
 ['distribution','Distribution','Prepare an invitation and review directory receipts separately from measured referrals.',['#growth-distribution']],
 ['decisions','Decisions','Read the proposal and publication history before recording a decision.',['.growth-toolbar','.growth-proposals','[data-growth-empty]']],
 ['sources','Research & data','Inspect saved research, source limitations and the report import controls.',['.growth-research','.growth-tools-grid','.growth-openseo','.growth-import']]
];

export function bindGrowthNavigation(root,{initial='overview',onChange=()=>{}}={}){
 const surface=root.querySelector('[data-growth]');
 if(!surface||surface.querySelector('[data-growth-areas]')||!surface.querySelector('.growth-workbench'))return ()=>{};
 const doc=root.ownerDocument,nav=doc.createElement('nav');nav.className='growth-area-nav';nav.dataset.growthAreas='';nav.setAttribute('aria-label','Growth work areas');
 const nodes=new Map(areas.map(([key,,,selectors])=>[key,selectors.flatMap(selector=>[...surface.querySelectorAll(selector)].filter(el=>el.parentElement===surface||el.parentElement?.classList.contains('growth-tools-grid')))]));
 const panels=new Map(),buttons=new Map();
 const pickerLabel=doc.createElement('label');pickerLabel.className='growth-area-picker';pickerLabel.textContent='Work area';
 const picker=doc.createElement('select');picker.dataset.growthAreaPicker='';pickerLabel.append(picker);nav.append(pickerLabel);
 surface.querySelector('.growth-lead').insertAdjacentElement('afterend',nav);
 for(const [key,label,description]of areas){
  const option=doc.createElement('option');option.value=key;option.textContent=label;picker.append(option);
  const button=doc.createElement('button');button.type='button';button.className='admin-button';button.dataset.growthArea=key;button.textContent=label;button.setAttribute('aria-controls','growth-area-'+key);button.setAttribute('aria-pressed','false');nav.append(button);buttons.set(key,button);
  const panel=doc.createElement('section');panel.className='growth-area-panel';panel.id='growth-area-'+key;panel.dataset.growthAreaPanel=key;panel.setAttribute('aria-label',label+' work area');
  const header=doc.createElement('header');header.className='growth-area-heading';const heading=doc.createElement('h2');heading.id=panel.id+'-title';heading.tabIndex=-1;heading.textContent=label;
  const text=doc.createElement('p');text.textContent=description;header.append(heading,text);panel.append(header);
  for(const node of nodes.get(key))panel.append(node);
  surface.append(panel);panels.set(key,panel);
 }
 // Status stays after every area and is never hidden with a form or import.
 const status=surface.querySelector(':scope > [data-growth-status]');if(status)surface.append(status);
 const show=(key,focus=false)=>{
  if(!panels.has(key))return;
  for(const [name,panel]of panels){panel.hidden=name!==key;buttons.get(name).setAttribute('aria-pressed',String(name===key));}
  picker.value=key;surface.dataset.growthActiveArea=key;onChange(key);
  if(focus)panels.get(key).querySelector('.growth-area-heading h2').focus();
 };
 for(const [key,button]of buttons)button.onclick=()=>show(key,true);
 picker.onchange=()=>show(picker.value,true);
 // Reveal the destination before existing handlers focus the saved record or
 // search control. Capture also covers programmatically clicked native links.
 const reveal=event=>{
  const button=event.target.closest?.('[data-workbench-open],[data-seo-open-decision],[data-seo-keywords]');if(!button||!surface.contains(button))return;
  if(button.hasAttribute('data-seo-keywords')){show('search');return;}
  const id=Number(button.dataset.workbenchOpen??button.dataset.seoOpenDecision);
  if(Number.isSafeInteger(id)&&root.querySelector(`[data-opportunity="${id}"]`))show('decisions');
 };
 const anchor=event=>{
  const link=event.target.closest?.('a[href="#growth-search"]');if(link&&surface.contains(link))show('search');
 };
 root.addEventListener('click',reveal,true);root.addEventListener('click',anchor,true);
 show(panels.has(initial)?initial:'overview');
 return ()=>{root.removeEventListener('click',reveal,true);root.removeEventListener('click',anchor,true);};
}
