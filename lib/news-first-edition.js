import {freshNews} from './breaking-news.js';

// Manually researched edition, reviewed in Codex on 11 October 2026.
// Dates are fixed, never renewed on deploy. Evidence: docs/news-variety-2026-10-11.md.
// Date-only source publications use midnight UTC conservatively.
export const firstEdition = {
  generatedAt:'2026-10-11T10:40:00Z',
  stories:[
    {title:'BBC reports fears of forced army recruitment in Myanmar',summary:'A BBC report describes fears among young men in Myanmar of being seized for military service, as the junta fights ethnic militias and civilian resistance.',sourceName:'BBC News',sourceUrl:'https://www.bbc.com/news/articles/c680zlny0gk4o',reportedAt:'2026-10-10T22:13:08.611Z'},
    {title:'Former Irish Olympic coach George Gibney faces sentencing',summary:'The Guardian reports that George Gibney is due to be sentenced in Dublin on Monday for abusing young athletes, following years of efforts to bring him to court.',sourceName:'The Guardian',sourceUrl:'https://www.theguardian.com/world/2026/oct/11/george-gibney-former-irish-olympic-swimming-coach-to-be-sentenced',reportedAt:'2026-10-11T09:38:01.000Z'},
    {title:'Yandex says a drone attack shut down its Vladimir data centre',summary:'Al Jazeera reports that Yandex shut its data centre in Vladimir, east of Moscow, after a drone attack. The company said no injuries were reported.',sourceName:'Al Jazeera',sourceUrl:'https://www.aljazeera.com/news/2026/10/11/russias-yandex-says-data-centre-in-vladimir-shut-down-after-drone-attack',reportedAt:'2026-10-11T09:33:03.000Z'},
    {title:'WHO calls for lived experience to help shape mental health care',summary:'For World Mental Health Day, WHO South-East Asia called for people with lived experience to help shape care, policies and services, alongside efforts to challenge stigma.',sourceName:'World Health Organization',sourceUrl:'https://www.who.int/southeastasia/news/detail/10-10-2026-world-mental-health-day-2026',reportedAt:'2026-10-10T04:30:00.000Z'},
    {title:'NASA plans a flyover and fan activities at MetLife Stadium',summary:'NASA says its Inspiration Tour will include a flyover and activities for NFL fans at MetLife Stadium, bringing the agency\u2019s outreach to a football audience.',sourceName:'NASA',sourceUrl:'https://www.nasa.gov/news-release/nasa-to-conduct-flyover-engage-nfl-fans-at-metlife-stadium/',reportedAt:'2026-10-10T00:00:00.000Z'}
  ]
};

export function selectNewsEdition(automated,now=Date.now()) {
  const manual=freshNews(firstEdition,now),live=freshNews(automated,now);
  if(live.length && (!manual.length || Date.parse(automated.generatedAt)>=Date.parse(firstEdition.generatedAt)))return automated;
  if(manual.length)return {...firstEdition,stories:manual,serviceStatus:'manual-edition',automationStatus:automated?.serviceStatus||'unavailable'};
  return automated;
}
