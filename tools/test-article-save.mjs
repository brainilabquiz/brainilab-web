import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {articleDraftSignature,acknowledgedArticle} from '../editor/article-save-state.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const tick=()=>new Promise(resolve=>setTimeout(resolve,15));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const sample={slug:'private-save-example',title:'A private save example',description:'An example for editor tests.',authorId:'biel-sarda',topic:'Learning',order:1,sections:[{id:'answer',title:'An answer',html:'<p>Keep this paragraph.</p>'}],sources:[{name:'Example source',url:'https://example.org/source'}],related:[],cover:{src:'/assets/images/learn/example.webp',alt:'An example',credit:'Test fixture'},game:{name:'Connections',url:'/games/connections/'},hub:{name:'Games',url:'/games/'},practice:'Find a connection.'};

async function fixture({fresh=false}={}){
 const dom=new JSDOM('<section id="root"></section>',{url:'https://brainilabgames.com/admin/',runScripts:'outside-only'}),w=dom.window;
 w.structuredClone=structuredClone;w.confirm=()=>false;w.HTMLElement.prototype.scrollIntoView=()=>{};
 const root=w.document.querySelector('#root'),find=selector=>root.querySelector(selector),calls=[];
 let rows=fresh?[]:[{slug:sample.slug,revision:1,published_revision:1,document:structuredClone(sample)}],saveGate=null,listGate=null,listFailure=false,saveFailure=false;
 const rpc=async(name,args)=>{
  calls.push({name,args:structuredClone(args)});
  if(name==='admin_list_learn_articles'){if(listGate)await listGate.promise;if(listFailure)throw Error('List unavailable');return structuredClone(rows);}
  if(name==='admin_list_learning_entities')return[];
  if(name==='admin_learn_article_history')return[];
  if(name!=='admin_save_learn_article')throw Error(name);
  if(saveGate)await saveGate.promise;
  if(saveFailure)throw Error('Save unavailable');
  const previous=rows.find(row=>row.slug===args.p_slug);
  if((previous?.revision||0)!==args.p_revision)throw Error('Changed in another session');
  const revision=args.p_revision+1,document={...structuredClone(args.p_document),status:args.p_action==='publish'?'published':'draft'};
  if(args.p_action==='publish'){document.publishedAt='2026-10-30T12:00:00Z';document.updatedAt='2026-10-30T12:00:01Z';}
  const row={slug:args.p_slug,revision,document,published_revision:args.p_action==='publish'?revision:args.p_action==='unpublish'?null:previous?.published_revision??null};
  rows=rows.filter(item=>item.slug!==row.slug);rows.unshift(row);
  return{slug:row.slug,revision,document:structuredClone(document),action:args.p_action};
 };
 w.eval(readFileSync('assets/js/admin-articles.bundle.js','utf8'));
 await w.BrainiArticles.render({root,rpc,sb:{},toast(){}});
 find(fresh?'#article-new':'[data-open]').click();
 const input=(selector,value)=>{const element=find(selector);if(element.hasAttribute('contenteditable'))element.innerHTML=value;else element.value=value;element.dispatchEvent(new w.Event('input',{bubbles:true}));return element;};
 return{dom,w,root,find,calls,input,saves:()=>calls.filter(call=>call.name==='admin_save_learn_article'),holdSave(){return saveGate=deferred();},holdList(){return listGate=deferred();},failList(value){listFailure=value;},failSave(value){saveFailure=value;},advance(){rows[0].revision++;rows[0].document.title='Another editor changed this';}};
}

// The same editing nodes survive a save, retaining focus, selection and disclosures.
{
 const f=await fixture(),rich=f.input('[data-rich]','<p>A sentence to save.</p>');
 f.find('#article-checks').open=true;f.find('.article-settings').open=true;f.find('#article-focus').click();rich.focus();
 const range=f.w.document.createRange();range.setStart(rich.firstChild.firstChild,2);range.collapse(true);f.w.getSelection().removeAllRanges();f.w.getSelection().addRange(range);
 rich.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true,cancelable:true}));await tick();
 assert.equal(f.find('[data-rich]'),rich,'saving must retain the editing node');assert.equal(f.w.document.activeElement,rich,'saving must retain keyboard focus');
 assert.equal(f.w.getSelection().anchorOffset,2);assert.equal(f.find('#article-checks').open,true);assert.equal(f.find('#article-focus').getAttribute('aria-pressed'),'true');
 assert.equal(f.w.BrainiArticles.canLeave(),true);assert.equal(f.saves()[0].args.p_action,'draft');
 f.find('[data-save=draft]').click();await tick();assert.equal(f.saves().length,1,'unchanged saves create no revision');f.dom.window.close();
}

// Edits and structural changes made during the request remain unsaved and can be saved next.
{
 const f=await fixture(),gate=f.holdSave();f.input('#article-title','Submitted title');f.find('[data-save=draft]').click();
 f.input('#article-title','Newer title');f.input('[data-rich]','<p>Typed while saving.</p>');f.find('#article-add-section').click();
 gate.resolve();await tick();
 assert.equal(f.find('#article-title').value,'Newer title');assert.match(f.find('[data-rich]').textContent,/Typed while saving/);assert.equal(f.root.querySelectorAll('[data-section]').length,2);
 assert.equal(f.w.BrainiArticles.canLeave(),false);assert.match(f.find('#article-save-state').textContent,/Newer changes are not saved/);assert.equal(f.saves().length,1);
 f.find('[data-save=draft]').click();await tick();assert.equal(f.saves().length,2);assert.equal(f.saves()[1].args.p_revision,2);assert.equal(f.saves()[1].args.p_document.title,'Newer title');assert.equal(f.saves()[1].args.p_document.sections.length,2);assert.equal(f.w.BrainiArticles.canLeave(),true);f.dom.window.close();
}

// Changes during the catalogue refresh are preserved too; a refresh failure is not a failed save.
{
 const f=await fixture(),gate=f.holdList();f.input('#article-title','Saved title');f.find('[data-save=draft]').click();await tick();f.input('#article-description','Typed during refresh');gate.resolve();await tick();
 assert.equal(f.find('#article-description').value,'Typed during refresh');assert.equal(f.w.BrainiArticles.canLeave(),false);
 f.failList(true);f.find('[data-save=draft]').click();await tick();assert.match(f.find('#article-save-state').textContent,/Draft saved/);assert.match(f.find('#article-save-state').textContent,/Could not refresh/);assert.equal(f.w.BrainiArticles.canLeave(),true);
 f.find('[data-save=draft]').click();await tick();assert.equal(f.saves().length,2,'a failed refresh cannot duplicate a confirmed save');
 f.input('#article-title','Next change');f.find('[data-save=draft]').click();await tick();assert.equal(f.saves().at(-1).args.p_revision,3);f.dom.window.close();
}

// A failed save keeps copy and revision. A concurrent remote revision is never silently adopted.
{
 const f=await fixture();f.failSave(true);f.input('#article-title','Keep after error');f.find('[data-save=draft]').click();await tick();assert.equal(f.find('#article-title').value,'Keep after error');assert.equal(f.w.BrainiArticles.canLeave(),false);
 f.failSave(false);f.find('[data-save=draft]').click();await tick();assert.equal(f.saves().at(-1).args.p_revision,1);
 const gate=f.holdList();f.input('#article-title','My next change');f.find('[data-save=draft]').click();await tick();f.advance();gate.resolve();await tick();
 f.input('#article-title','My still newer change');f.find('[data-save=draft]').click();await tick();assert.equal(f.saves().at(-1).args.p_revision,3,'use the acknowledged revision, not a later catalogue revision');assert.match(f.find('#article-save-state').textContent,/Changed in another session/);assert.equal(f.find('#article-title').value,'My still newer change');f.dom.window.close();
}

// First save fixes the URL when accepted, while later title edits and a failed first save stay recoverable.
{
 const f=await fixture({fresh:true}),gate=f.holdSave();f.input('#article-title','My first draft');f.find('[data-save=draft]').click();
 assert.equal(f.find('#article-slug').readOnly,true);f.input('#article-title','A newer draft title');assert.equal(f.find('#article-slug').value,'my-first-draft');gate.resolve();await tick();
 assert.equal(f.find('#article-title').value,'A newer draft title');assert.equal(f.find('#article-slug').readOnly,true);assert.equal(f.find('#article-history').disabled,false);assert.equal(f.w.BrainiArticles.canLeave(),false);
 f.find('[data-save=draft]').click();await tick();assert.equal(f.saves().at(-1).args.p_slug,'my-first-draft');assert.equal(f.saves().at(-1).args.p_revision,1);f.dom.window.close();
 const failure=await fixture({fresh:true});failure.failSave(true);failure.input('#article-title','Recover my URL');failure.find('[data-save=draft]').click();await tick();assert.equal(failure.find('#article-slug').readOnly,false);failure.dom.window.close();
}

// A video address entered during a save remains an unsaved edit until checked.
{
 const f=await fixture(),gate=f.holdSave();f.input('#article-title','Saved title');f.find('[data-save=draft]').click();f.input('#article-video-url','https://www.youtube.com/watch?v=abcdefghijk');gate.resolve();await tick();
 assert.equal(f.find('#article-video-url').value,'https://www.youtube.com/watch?v=abcdefghijk');assert.equal(f.w.BrainiArticles.canLeave(),false,'an unchecked video input is still an unsaved edit');
 f.find('[data-save=draft]').click();await tick();assert.equal(f.saves().length,1);assert.match(f.find('#article-save-state').textContent,/Load and check/);f.dom.window.close();
}

// Publication metadata cannot dirty unchanged copy. Publish and unpublish acknowledge only their snapshot.
{
 const f=await fixture();f.w.confirm=()=>true;
 f.find('[data-save=unpublish]').click();await tick();
 assert.equal(f.saves().at(-1).args.p_action,'unpublish');assert.equal(f.find('[data-save=unpublish]'),null);assert.equal(f.w.BrainiArticles.canLeave(),true);
 f.w.confirm=()=>false;
 const cover=f.find('#article-cover-preview');Object.defineProperties(cover,{complete:{value:true},naturalWidth:{value:1200}});
 const gate=f.holdSave();f.find('[data-save=publish]').click();f.input('[data-rich]','<p>New words after publishing started.</p>');gate.resolve();await tick();
 assert.equal(f.saves().at(-1).args.p_revision,2);assert.equal(f.saves().at(-1).args.p_action,'publish');assert.match(f.find('#article-save-state').textContent,/Published.*Newer changes are not saved/);
 assert.ok(f.find('[data-save=unpublish]'));assert.equal(f.w.BrainiArticles.canLeave(),false);
 f.find('[data-save=draft]').click();await tick();assert.equal(f.saves().at(-1).args.p_revision,3);assert.equal(f.saves().at(-1).args.p_action,'draft');assert.equal(f.w.BrainiArticles.canLeave(),true);
 f.find('[data-save=draft]').click();await tick();assert.equal(f.saves().length,3);f.dom.window.close();
}

// Only the matching next revision is accepted; object-key order and server dates are not edits.
{
 const previous={slug:sample.slug,revision:1,published_revision:1,document:sample};
 const result={slug:sample.slug,revision:2,document:{...sample,status:'published',publishedAt:'2026-10-30',updatedAt:'2026-10-30'}};
 assert.equal(articleDraftSignature(result.document),articleDraftSignature(sample));
 assert.equal(articleDraftSignature({a:{b:1,c:2}}),articleDraftSignature({a:{c:2,b:1}}));
 assert.notEqual(articleDraftSignature({a:[1,2]}),articleDraftSignature({a:[2,1]}));
 assert.equal(acknowledgedArticle(previous,result,sample,'publish').published_revision,2);
 for(const invalid of [{...result,revision:3},{...result,revision:'2'},{...result,slug:'other'},{...result,document:null},{...result,document:{slug:'other'}}])assert.throws(()=>acknowledgedArticle(previous,invalid,sample,'draft'),/save response is incomplete/);
}

// Leaving/resetting an editor prevents a late save from rebuilding it or dirtying another view.
{
 const f=await fixture(),gate=f.holdSave();f.input('#article-title','Late save');f.find('[data-save=draft]').click();f.w.BrainiArticles.reset();f.root.innerHTML='<p>Another admin view</p>';gate.resolve();await tick();assert.equal(f.root.innerHTML,'<p>Another admin view</p>');assert.equal(f.w.BrainiArticles.canLeave(),true);f.dom.window.close();
}
console.log('PASS article saves: retained focus/caret, in-flight edits, refresh errors, revision conflicts, first-save URL and late-response isolation.');
