// Render the existing home prompt in the first HTML paint. The consent controller
// still owns all choices, persistence and network activation.
export function homeConsent(html,controller){
 const match=controller.match(/panel\.innerHTML='([^'\r\n]+)';/);
 if(!match||match[1].includes('\\'))throw Error('Home consent markup must match the controller literal');
 if(!/<body\b[^>]*class="home-page braini-visual"/.test(html))return html;
 const markup=match[1].replace(/<(button|input)\b/g,'<$1 disabled');
 const prompt='<aside class="marketing-consent" data-static-cookie-prompt hidden aria-label="Optional cookie choices">'+markup+'</aside>';
 const gate='<script data-home-cookie-gate>(()=>{const p=document.currentScript.previousElementSibling;if(!["brainilabgames.com","www.brainilabgames.com"].includes(location.hostname))return;const needs=k=>{try{const c=JSON.parse(localStorage.getItem(k));return !(c&&typeof c.allowed==="boolean"&&c.at<=Date.now()&&Date.now()-c.at<180*86400000)}catch{return true}};p.hidden=!(needs("brainilab_marketing_consent_v1")||needs("brainilab_statistics_consent_v1"));})();</script>';
 return html.replace(/(<body\b[^>]*>)/,'$1'+prompt+gate);
}
