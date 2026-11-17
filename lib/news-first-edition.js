import {freshNews} from './breaking-news.js';

// Manually researched edition, reviewed in Claude Code on 23 October 2026 while
// automation is paused (invalid-key since 19 October). Dates are fixed, never
// renewed on deploy. Evidence: docs/news-manual-2026-10-23.md; earlier editions
// are in Git history. Date-only source publications use midnight UTC conservatively.
export const firstEdition = {
  generatedAt:'2026-10-23T08:30:00Z',
  stories:[
    {title:'First Ebola patients in Nigeria and Kenya may have crossed paths in Uganda',summary:'The first Ebola patients identified in Nigeria and Kenya both travelled through Uganda\u2019s Entebbe airport on 3 October. Africa CDC said investigators are checking whether they could have been exposed there, BBC News reports.',sourceName:'BBC News',sourceUrl:'https://www.bbc.com/news/articles/cmwy4wlzqz3zo',reportedAt:'2026-10-23T04:54:25.358Z'},
    {title:'Storm Adam floods eastern Spain as Storm Austen hits the UK',summary:'Torrential rain from Storm Adam flooded parts of Valencia and Alicante, where at least five people died and about 850,000 people were placed under a temporary lockdown. Storm Austen brought strong gusts to England and Wales, The Guardian reports.',sourceName:'The Guardian',sourceUrl:'https://www.theguardian.com/world/2026/oct/23/spain-floods-storm-adam-uk-storm-austen',reportedAt:'2026-10-23T08:16:30.000Z'},
    {title:'Grenade exercise started deadly fire at Canadian army base',summary:'A Canadian military official said a live-grenade exercise sparked Saturday\u2019s fire at the army base in Wainwright. High winds spread the blaze, which killed four soldiers and injured dozens, Al Jazeera reports.',sourceName:'Al Jazeera',sourceUrl:'https://www.aljazeera.com/news/2026/10/23/grenade-exercise-sparked-deadly-fire-at-canada-military-base-army-says',reportedAt:'2026-10-23T04:41:24.000Z'},
    {title:'BBC investigation finds hospitals were targeted in el-Fasher',summary:'A BBC investigation found evidence that the paramilitary Rapid Support Forces systematically destroyed el-Fasher\u2019s healthcare system during the siege of the Darfur city. UN human rights chief Volker T\u00fcrk said the attacks may amount to war crimes.',sourceName:'BBC News',sourceUrl:'https://www.bbc.com/news/articles/c54g1kxw4nvvo',reportedAt:'2026-10-22T23:16:16.492Z'},
    {title:'NASA\u2019s von Braun symposium will focus on returning to the Moon',summary:'NASA invited media to the 2026 von Braun Space Exploration Symposium, from 26 to 28 October at the University of Alabama in Huntsville. Talks will cover the return to the Moon, lunar infrastructure, propulsion and the space workforce.',sourceName:'NASA',sourceUrl:'https://www.nasa.gov/news-release/nasa-invites-media-to-2026-von-braun-space-exploration-symposium/',reportedAt:'2026-10-22T00:00:00.000Z'}
  ]
};

// Editorial supplements use the source feeds' timestamps and leave the live
// edition to the scheduled refresh.
export const manualNewsArchive = [firstEdition,{
  generatedAt:'2026-11-17T20:10:00Z',
  stories:[
    {title:'Rock Hall honours Afrobeat pioneer Fela Kuti',summary:'The Rock & Roll Hall of Fame gave the Nigerian musician its Early Influence award. Africanews reports that his family accepted it on his behalf.',sourceName:'Africanews',sourceUrl:'https://www.africanews.com/2026/11/17/fela-kuti-becomes-first-african-to-be-inducted-in-rock-roll-hall-of-fame/',reportedAt:'2026-11-17T17:21:26Z'},
    {title:'Wildlife officers free leopard from a snare in Sri Lanka',summary:'Workers at a tea estate found the trapped leopard in the Central Highlands. Mongabay reports that a wildlife team freed the animal and took it for observation.',sourceName:'Mongabay',sourceUrl:'https://news.mongabay.com/2026/11/another-sri-lankan-leopard-caught-in-a-snare-these-big-cats-need-protecting-experts-say/',reportedAt:'2026-11-17T14:02:36Z'}
  ]
},{
  generatedAt:'2026-11-17T20:42:00Z',
  stories:[
    {title:'UN Committee against Torture begins its Geneva session',summary:'The committee opened its session in Geneva on Monday. The UN office there says it will review how Angola, Belize, Norway and Moldova are implementing the Convention against Torture.',sourceName:'UN Geneva',sourceUrl:'https://www.ungeneva.org/en/news-media/meeting-summary/2026/11/le-comite-contre-la-torture-ouvre-les-travaux-de-sa-85e-session',reportedAt:'2026-11-16T10:46:58Z'},
    {title:'USGS records magnitude 6.6 earthquake near Tual, Indonesia',summary:'The U.S. Geological Survey located the earthquake 148 kilometres west-southwest of Tual. The agency lists the event as reviewed in its earthquake catalogue.',sourceName:'U.S. Geological Survey',sourceUrl:'https://earthquake.usgs.gov/earthquakes/eventpage/us7000tymu',reportedAt:'2026-11-16T21:11:20.515Z'},
    {title:'FAA pauses router installations after US flight disruption',summary:'The FAA stopped installing the routers linked to last Friday’s ground stop. G1 reports that the agency is using older equipment while it investigates the failure.',sourceName:'G1 Mundo',sourceUrl:'https://g1.globo.com/mundo/noticia/2026/11/17/eua-suspendem-instalacao-de-roteadores-que-levaram-a-paralisacao-de-voos-no-pais.ghtml',reportedAt:'2026-11-17T19:06:53Z'}
  ]
}];

export function selectNewsEdition(automated,now=Date.now()) {
  const manual=freshNews(firstEdition,now),live=freshNews(automated,now);
  if(live.length && (!manual.length || Date.parse(automated.generatedAt)>=Date.parse(firstEdition.generatedAt)))return automated;
  if(manual.length)return {...firstEdition,stories:manual,serviceStatus:'manual-edition',automationStatus:automated?.serviceStatus||'unavailable'};
  return automated;
}
