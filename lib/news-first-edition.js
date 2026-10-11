import {freshNews} from './breaking-news.js';

// Manually researched edition, reviewed in Codex on 11 October 2026.
// Dates are fixed, never renewed on deploy. Evidence: docs/news-variety-2026-10-11.md
// and docs/news-verification-2026-10-11.md (editorial correction after 12 UTC).
// Date-only source publications use midnight UTC conservatively.
export const firstEdition = {
  generatedAt:'2026-10-11T12:20:00Z',
  stories:[
    {title:'Pope Leo XIV announces surgery after a lung nodule was found',summary:'Pope Leo XIV said doctors had found a nodule on his lung during a checkup and that he would have surgery in the coming days, BBC News reports.',sourceName:'BBC News',sourceUrl:'https://www.bbc.com/news/articles/c6m2dnngvw8xo',reportedAt:'2026-10-11T10:53:52.087Z'},
    {title:'IOM reports deadly migrant boat sinking off Djibouti',summary:'The IOM reported at least 109 deaths after a migrant boat capsized off Djibouti while heading to Yemen. More than 116 people were still missing.',sourceName:'The Guardian',sourceUrl:'https://www.theguardian.com/world/2026/oct/11/deaths-migrant-boat-capsizes-djibouti',reportedAt:'2026-10-11T11:33:53.000Z'},
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
