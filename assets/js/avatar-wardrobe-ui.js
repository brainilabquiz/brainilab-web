/* Inventory presentation only. Eligibility and saving stay in the reward store. */
window.BrainiWardrobeUI=(()=>{
  const states=new WeakMap(),C=BrainiRewardCatalog;
  const visualKinds=new Set(['skin','hair','hairColor','shirt','background','glasses','hat','prop']);
  function initial(panes){return {panes,categories:{look:'hair',extras:'glasses',rewards:'frame'},views:{extras:'unlocked',rewards:'unlocked',academy:'unlocked',challenges:'unlocked'},context:null,pin:null};}
  function mount(root,panes){
    const state=initial(panes);states.set(root,state);
    for(const [key,pane]of Object.entries(panes)){
      const groups=Object.entries(pane.groups);if(!groups.length&&!['academy','challenges'].includes(key))continue;
      const panel=root.querySelector(`[data-avatar-pane="${key}"]`),toolbar=document.createElement('div');toolbar.className='wardrobe-toolbar';
      if(groups.length){
        const label=document.createElement('label');label.textContent='Choose a detail';
        const select=document.createElement('select');select.dataset.wardrobeCategory=key;select.setAttribute('aria-label','Choose '+pane.label.toLowerCase()+' category');
        for(const [kind,name]of groups){const option=document.createElement('option');option.value=kind;option.textContent=name;select.append(option);}
        select.value=state.categories[key]||groups[0][0];state.categories[key]=select.value;label.append(select);toolbar.append(label);
        select.addEventListener('change',()=>{state.categories[key]=select.value;state.pin=null;apply(root);});
      }
      if(key!=='look'){
        const filters=document.createElement('div');filters.className='wardrobe-filters';filters.setAttribute('role','group');filters.setAttribute('aria-label',pane.label+' availability');
        for(const view of ['unlocked','locked']){
          const button=document.createElement('button');button.type='button';button.dataset.wardrobeView=view;button.dataset.wardrobePane=key;
          button.addEventListener('click',()=>{state.views[key]=view;state.pin=null;apply(root);});filters.append(button);
        }toolbar.append(filters);
      }
      const empty=document.createElement('div');empty.className='wardrobe-empty';empty.dataset.wardrobeEmpty=key;empty.hidden=true;
      empty.innerHTML='<strong></strong><p></p><button type="button"></button>';
      empty.querySelector('button').addEventListener('click',()=>{state.views[key]=state.views[key]==='locked'?'unlocked':'locked';state.pin=null;apply(root);});
      panel.prepend(toolbar);panel.append(empty);
    }
  }
  function itemFor(button){return C.groups[button.dataset.rewardKind]?.find(item=>item.id===button.dataset.rewardId);}
  function apply(root){
    const state=states.get(root),ctx=state?.context;if(!ctx)return;
    const {draft,equipped,total,academy,discovery,loading,error}=ctx,unknown=loading||!!error;
    if(state.pin&&!unknown){const {pane,item}=state.pin;state.views[pane]=C.unlocked(item,total,academy,discovery)?'unlocked':'locked';}
    for(const button of root.querySelectorAll('[data-reward-kind]')){
      const item=itemFor(button);if(!item)continue;
      const kind=button.dataset.rewardKind,unlocked=C.unlocked(item,total,academy,discovery),picked=draft[kind]===item.id;
      const preview=picked&&(draft[kind]!==equipped[kind]||(visualKinds.has(kind)&&draft.mode!==equipped.mode))&&(!visualKinds.has(kind)||draft.mode==='built');
      const inUse=equipped[kind]===item.id&&(!visualKinds.has(kind)||equipped.mode==='built');
      const saved=equipped[kind]===item.id;
      button.dataset.wardrobeState=preview?'preview':inUse?'equipped':saved?'saved':'available';
      button.dataset.wardrobeUnlocked=String(unlocked);
      const status=loading?'Checking…':error?'Unavailable':!unlocked?item.course?'Finish course':item.challenge?'Finish challenge':`${Math.max(0,item.xp-total).toLocaleString('en-GB')} XP to go`:preview?'Preview':inUse?'In use':saved?'Saved choice':kind==='mode'?'Choose':'Try on';
      button.querySelector('small').textContent=status;
      const requirement=item.challenge?'finish '+item.challenge+' to unlock':item.course?'complete '+item.courseTitle+' to unlock':'unlocks at '+item.xp.toLocaleString('en-GB')+' XP';
      button.setAttribute('aria-label',`${item.name}, ${picked?'selected, ':''}${unknown?status:unlocked?status:requirement}${item.description?'. '+item.description:''}`);
    }
    for(const [key,pane]of Object.entries(state.panes)){
      const groups=Object.keys(pane.groups);if(!groups.length&&!['academy','challenges'].includes(key))continue;
      const panel=root.querySelector(`[data-avatar-pane="${key}"]`),kind=state.categories[key];
      const select=panel.querySelector('[data-wardrobe-category]');if(select)select.value=kind;
      for(const fieldset of panel.querySelectorAll('.avatar-option-group'))fieldset.hidden=fieldset.querySelector('[data-reward-kind]')?.dataset.rewardKind!==kind;
      const buttons=Array.from(panel.querySelectorAll('[data-reward-kind]')).filter(button=>['academy','challenges'].includes(key)||button.dataset.rewardKind===kind);
      const ready=buttons.filter(button=>button.dataset.wardrobeUnlocked==='true').length,locked=buttons.length-ready,view=state.views[key]||'unlocked';
      panel.querySelectorAll('[data-wardrobe-view]').forEach(button=>{
        const isReady=button.dataset.wardrobeView==='unlocked',count=isReady?ready:locked;
        button.textContent=(isReady?'Unlocked':'To unlock')+(unknown?' (…)':' ('+count+')');
        button.setAttribute('aria-pressed',String(button.dataset.wardrobeView===view));
      });
      for(const button of panel.querySelectorAll('[data-reward-kind]')){
        const matchesKind=['academy','challenges'].includes(key)||button.dataset.rewardKind===kind;
        const matchesView=key==='look'||button.dataset.wardrobeUnlocked===String(view==='unlocked');
        const visible=matchesKind&&matchesView;
        if(['academy','challenges'].includes(key))button.closest('[data-academy-card],[data-discovery-card]').hidden=!visible;else button.hidden=!visible;
      }
      const visible=key==='look'?buttons.length:view==='unlocked'?ready:locked,empty=panel.querySelector('[data-wardrobe-empty]');
      empty.hidden=visible>0;
      if(!visible){
        empty.querySelector('strong').textContent=loading?'Checking your collection…':error?'Your collection is unavailable.':view==='locked'?'All yours.':key==='academy'?'Your first course reward is waiting.':key==='challenges'?'Your next discovery is waiting.':'No unlocked items here yet.';
        empty.querySelector('p').textContent=unknown?'':view==='locked'?'Every item in this category is unlocked.':key==='academy'?'Finish a course to earn its extra.':key==='challenges'?'Try different games to earn a little extra.':'Play a game to work towards your next reward.';
        const button=empty.querySelector('button');button.hidden=unknown;button.textContent=view==='locked'?'See unlocked items':key==='academy'?'See course rewards':key==='challenges'?'See challenges':'See what’s next';
      }
    }
  }
  function render(root,context){const state=states.get(root);if(!state)return;state.context=context;apply(root);}
  function reset(root){const state=states.get(root);if(!state)return;const fresh=initial(state.panes);state.categories=fresh.categories;state.views=fresh.views;state.pin=null;}
  function reveal(root,item){
    const state=states.get(root);if(!state)return;
    const pane=Object.keys(state.panes).find(key=>Object.hasOwn(state.panes[key].groups,item.kind));
    if(!pane)return;state.categories[pane]=item.kind;state.pin={pane,item};apply(root);
  }
  return Object.freeze({mount,render,reset,reveal});
})();
