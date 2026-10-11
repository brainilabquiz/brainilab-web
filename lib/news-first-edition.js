import {freshNews} from './breaking-news.js';

// Manually researched edition, reviewed in Codex on 11 October 2026.
// Dates are fixed, never renewed on deploy. Evidence: docs/news-review-2026-10-11.md.
// Date-only source publications use midnight UTC conservatively.
export const firstEdition = {
  generatedAt:'2026-10-11T09:00:00Z',
  stories:[
    {title:'EU calls on the US to reverse sanctions against the ICC',summary:'In a statement on 10 October, the EU urged the United States to reverse its announced sanctions against the International Criminal Court. It said the delay in their implementation leaves room for diplomacy.',sourceName:'Council of the EU',sourceUrl:'https://www.consilium.europa.eu/en/press/press-releases/2026/10/10/international-criminal-court-statement-by-the-high-representative-on-behalf-of-the-eu-following-the-announcement-of-us-sanctions/',reportedAt:'2026-10-10T00:00:00Z'},
    {title:'WHO urges a bigger role for people with mental health experience',summary:'For World Mental Health Day, WHO called for people with lived experience to help design services and shape policy. Its South-East Asia statement highlights the need for care that is more accessible and responsive to people.',sourceName:'World Health Organization',sourceUrl:'https://www.who.int/southeastasia/news/detail/10-10-2026-world-mental-health-day-2026',reportedAt:'2026-10-10T00:00:00Z'},
    {title:'India and IFAD look to open more markets for small farmers',summary:'In a new report on his India visit, IFAD president Alvaro Lario called for more investment in rural businesses. A shipment of organic spices from Meghalaya to Singapore illustrated the export opportunities being developed.',sourceName:'IFAD / United Nations in India',sourceUrl:'https://india.un.org/en/324195-indias-leadership-rural-transformation-focus-during-ifad-presidents-visit',reportedAt:'2026-10-10T00:00:00Z'},
    {title:'South Sudan families describe the risks girls face getting to school',summary:'A new UNMISS report from Otallo, in Jonglei, describes how insecurity and a lack of nearby upper-level schools restrict girls\u2019 education. Families told peacekeepers they need safer access to learning and stronger protection.',sourceName:'UN Mission in South Sudan',sourceUrl:'https://unmiss.unmissions.org/en/news/stuck-between-bad-choices-girls-in-jonglei-struggle-to-safely-access-education',reportedAt:'2026-10-11T00:00:00Z'}
  ]
};

export function selectNewsEdition(automated,now=Date.now()) {
  const manual=freshNews(firstEdition,now),live=freshNews(automated,now);
  if(live.length && (!manual.length || Date.parse(automated.generatedAt)>=Date.parse(firstEdition.generatedAt)))return automated;
  if(manual.length)return {...firstEdition,stories:manual,serviceStatus:'manual-edition',automationStatus:automated?.serviceStatus||'unavailable'};
  return automated;
}
