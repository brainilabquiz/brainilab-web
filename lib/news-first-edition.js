import {freshNews} from './breaking-news.js';

// Manually researched launch edition. Dates are fixed, never renewed on deploy.
// Date-only source publications use midnight UTC conservatively.
export const firstEdition = {
  generatedAt:'2026-10-09T17:22:07Z',
  stories:[
    {title:'Navi Pillay wins the Nobel Peace Prize',summary:'The Norwegian Nobel Committee has awarded the 2026 prize to Navi Pillay for her work supporting peace and international law.',sourceName:'Nobel Peace Prize',sourceUrl:'https://www.nobelpeaceprize.org/press/press-releases/nobel-peace-prize-for-2026',reportedAt:'2026-10-09T00:00:00Z'},
    {title:'Nepal families still need help after devastating floods',summary:'In a new update, UNICEF and the Red Cross say families are still struggling six weeks after the disaster. Some isolated communities depend on supplies delivered by air.',sourceName:'UN Geneva',sourceUrl:'https://www.unognewsroom.org/story/en/3294/nepal-disaster-update-unicef-ifrc',reportedAt:'2026-10-09T00:00:00Z'},
    {title:'UN report warns of deepening poverty in Myanmar',summary:'UNDP says more than two in three people face poverty or are at risk of it. Conflict and repeated crises are making healthcare, education and basic services harder to access.',sourceName:'UNDP',sourceUrl:'https://www.undp.org/asia-pacific/press-releases/two-three-people-myanmar-are-poor-or-one-shock-away-falling-poverty-new-undp-report-finds',reportedAt:'2026-10-08T00:00:00Z'},
    {title:'New UN report shows how global trade is changing',summary:'UNCTAD says trade and technology rules are increasingly shaped by national security. Its new report warns that many developing countries are struggling to share in the gains.',sourceName:'UNCTAD / UN Geneva',sourceUrl:'https://www.unognewsroom.org/story/en/3291/unctad-press-conference-trade-and-development-report-2026-09-october-2026',reportedAt:'2026-10-09T00:00:00Z'},
    {title:'EU adopts rules to limit sharp carbon-price swings',summary:'The Council approved changes to the reserve supporting its emissions market for buildings and road transport. The rules aim to make prices more stable before the planned 2028 launch.',sourceName:'Council of the EU',sourceUrl:'https://www.consilium.europa.eu/en/press/press-releases/2026/10/09/ets2-council-signs-off-on-rules-strengthening-the-market-stability-reserve/',reportedAt:'2026-10-09T00:00:00Z'}
  ]
};

export function selectNewsEdition(automated,now=Date.now()) {
  const manual=freshNews(firstEdition,now),live=freshNews(automated,now);
  if(live.length && (!manual.length || Date.parse(automated.generatedAt)>=Date.parse(firstEdition.generatedAt)))return automated;
  if(manual.length)return {...firstEdition,stories:manual,serviceStatus:'manual-edition',automationStatus:automated?.serviceStatus||'unavailable'};
  return automated;
}
