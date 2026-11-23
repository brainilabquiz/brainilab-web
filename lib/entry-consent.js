import {initialConsentPrompt} from './home-consent.js';
import {inlineConsentController} from './home-first-paint.js';
const entries=new Set(['games/math-rush/index.html','games/sequence/index.html','learn/index.html']);
// Reuse the homepage's exact prompt, gate and controller. Decisions, expiry,
// account exclusion and tag activation continue to belong to that controller.
export function entryConsent(html,file,controller,bundle){
 if(!entries.has(file)||html.includes('data-home-consent-controller'))return html;
 return inlineConsentController(initialConsentPrompt(html,controller),bundle);
}
