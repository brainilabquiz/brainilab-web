import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE||'jsdom').href);
const source=readFileSync('assets/js/play-feedback.js','utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function page({reduced=false}={}){
  const dom=new JSDOM(`<body class="braini-visual"><article class="labgame-shell"><div class="odd-items"><button class="labgame-answer" id="a">A</button><button class="labgame-answer" id="b">B</button></div><div class="labgame-feedback" data-feedback aria-live="polite"></div></article></body>`,{runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom;
  window.matchMedia=query=>({matches:reduced&&/reduce/.test(query),media:query,addEventListener(){},removeEventListener(){}});
  window.eval(source);
  const doc=window.document;
  const pick=id=>{const button=doc.getElementById(id);const Pointer=window.PointerEvent||window.MouseEvent;button.dispatchEvent(new Pointer('pointerdown',{bubbles:true}));return button;};
  return {dom,window,doc,pick,feedback:doc.querySelector('[data-feedback]')};
}

// A right answer the player picked: confetti and the points from the feedback line.
{
  const {window,doc,pick,feedback,dom}=page();
  const button=pick('a');
  button.classList.add('correct');
  feedback.innerHTML='<strong>✓ Correct · +100 pts</strong><span>Because.</span>';
  await wait(120);
  const fx=doc.querySelector('.bl-fx');
  assert.ok(fx,'the celebration layer is created');
  assert.equal(fx.getAttribute('aria-hidden'),'true','the celebration is decorative');
  assert.ok(fx.querySelectorAll('.bl-confetti').length>=12,'confetti bursts from the picked answer');
  assert.equal(fx.querySelector('.bl-float')?.textContent,'+100','the floating points match the feedback');
  assert.equal(window.BrainiPlayFeedback.streak(),1,'one celebration for one right answer (class and text are not counted twice)');
  dom.window.close();
}

// Three right answers in a row show the streak badge; a wrong answer resets it.
{
  const {window,doc,pick,feedback,dom}=page();
  for(let round=0;round<3;round++){
    feedback.innerHTML='';
    await wait(20);
    pick('a');
    feedback.innerHTML=`<strong>✓ Correct · +100 pts</strong>`;
    await wait(520);
  }
  assert.equal(window.BrainiPlayFeedback.streak(),3);
  await wait(300);
  assert.ok([...doc.querySelectorAll('.bl-float')].some(node=>node.textContent==='3 in a row!'),'the third right answer in a row is celebrated');
  feedback.innerHTML='';
  await wait(20);
  pick('b');
  feedback.innerHTML='<strong style="color:#ff9b96">Not this one</strong><span>The outsider was A.</span>';
  await wait(60);
  assert.equal(window.BrainiPlayFeedback.streak(),0,'a wrong answer resets the streak');
  assert.ok(feedback.classList.contains('bl-nudge'),'the feedback line shakes when no answer button shows the miss');
  dom.window.close();
}

// After a miss, revealing the right answer or "Correct connection: …" never celebrates.
{
  const {window,doc,pick,feedback,dom}=page();
  pick('b');
  doc.getElementById('b').classList.add('wrong');
  doc.getElementById('a').classList.add('correct');
  feedback.innerHTML='<strong>Correct connection: Herbs</strong><span>Basil, mint and sage are herbs.</span>';
  await wait(120);
  assert.equal(doc.querySelectorAll('.bl-confetti').length,0,'no confetti for a revealed answer');
  assert.equal(window.BrainiPlayFeedback.streak(),0);
  assert.ok(!feedback.classList.contains('bl-nudge'),'the wrong button already shakes, so the feedback line stays still');
  dom.window.close();
}

// Reduced motion: the streak is still tracked, but nothing moves.
{
  const {window,doc,pick,feedback,dom}=page({reduced:true});
  pick('a');
  feedback.innerHTML='<strong>✓ Correct · +100 pts</strong>';
  await wait(120);
  assert.equal(doc.querySelectorAll('.bl-confetti,.bl-float').length,0,'no confetti or floating points with reduced motion');
  assert.equal(window.BrainiPlayFeedback.streak(),1);
  dom.window.close();
}

// The shell bundles carry the module, and the stylesheet keeps the motion behind prefers-reduced-motion.
const lf=text=>text.replace(/\r\n/g,'\n');
for(const bundle of ['assets/js/shell.bundle.js','assets/js/home-shell.bundle.js']){
  assert.ok(lf(readFileSync(bundle,'utf8')).includes(lf(source).trim()),`${bundle} includes play-feedback.js`);
}
const css=readFileSync('assets/css/visual-system.css','utf8');
assert.match(css,/@media \(prefers-reduced-motion:no-preference\)\{\s*body\.braini-visual :is\(\.answer/,'press, pop and shake only run when motion is allowed');
assert.match(css,/@media \(prefers-reduced-motion:reduce\)\{\.bl-fx\{display:none\}\}/,'the celebration layer is hidden with reduced motion');

console.log('PASS play feedback: confetti and points for a picked right answer, streak badge at three, no celebration for revealed answers, reduced motion respected, shipped in both shell bundles.');
