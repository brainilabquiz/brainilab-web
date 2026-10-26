import {playerActivity} from './growth-seo-actions.js';
import {publicPageURL} from './growth-seo-page.js';
import {pagePlayContext} from './growth-page-play.js';

const number=v=>Number.isSafeInteger(v)&&v>=0?String(v):'Not measured';

export function acquisitionCheck(lead,report){
 const url=publicPageURL(lead?.url),activity=url?playerActivity(report,url):null;
 const lines=['## Validate a useful visit before expanding','',
  'This is a plan to validate, not a measured audience profile or proof that the page needs changing.',
  `- Existing destination: ${url||'Not a validated public URL; check the destination before acting.'}`,
  '- Audience and need: read the exact query/page evidence and current content. State who this page helps and what they came to do as a hypothesis; do not invent personas or demand.',
  '- Value and first action: choose one useful result on the existing page, such as understanding the answer, trying an example or playing a round. Verify the route works before adding features or asking for an account.',
  '- Decision gate: check current Growth decisions and recent changes. Preserve a working page; if no specific friction or unmet need is supported, record why no edit is needed.',
  '- Feedback question to prepare: What, if anything, stopped you from doing what you came for?',
  '- Distribution: choose one relevant existing destination and channel, reconcile earlier launches, contacts and exclusions, and prepare the invitation. Send or publish only under the specific existing authorisation; do not restart stopped outreach.',
  '- Success criterion: choose an existing, verified usage signal before acting. Keep exposure, clicks, useful activity and voluntary feedback separate; a click is not a player or a paying customer.','',
  '## Organic landing baseline — separate from search evidence',''];
 if(!activity)lines.push('No single validated google / organic landing-path observation matches this URL. Sessions and game starts are Not measured here, not zero. Do not borrow another page\'s counts.');
 else{
  lines.push(`GA4 google / organic; ${activity.period.start} to ${activity.period.end}; ${activity.timezone}; collected ${activity.observedAt}.`,
   `- Landing sessions: ${number(activity.sessions)}`,
   `- Game start events in those sessions: ${number(activity.events.game_start)}`,
   `- Practice start events in those sessions: ${number(activity.events.practice_start)}`);
  const quality=activity.quality;
  lines.push(!quality?'Quality flags were not supplied.':Object.values(quality).some(Boolean)?'Quality limitation: Google reported thresholding, sampling or grouped data.':'No thresholding, sampling or grouping reported for this observation.');
 }
 lines.push('','These are event counts within sessions that began on this normalised path, possibly on later pages. They are not distinct playing sessions, unique players or keyword conversions. Consent and coverage limit the sample. Do not divide game events by sessions to invent a conversion rate.',
  pagePlayContext(report,url).text,'',
  'After a verified change, compare complete equal, non-overlapping periods and preserve the original baseline. Feedback remains voluntary and separate from measured attribution. No forecast, new tracking or automatic publication is created by this brief.');
 return lines.join('\n');
}
