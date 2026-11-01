// Editorial routes through existing readings, not a prediction of search queries.
// Exact slugs keep unrelated title matches out. New readings remain in the directory.
export const questionGroups=new Map([
 ['Science & nature',[
  ['Sky, space and seasons',[
   'solar-eclipse-vs-lunar-eclipse','what-really-causes-seasons','why-day-turns-into-night',
   'why-do-stars-twinkle','why-is-mars-red','why-is-venus-hotter-than-mercury',
   'why-orionids-return-in-october','why-the-moon-changes-shape','why-we-see-same-side-of-moon','solstice-vs-equinox'
  ]],
  ['Water, weather and light',[
   'counting-seconds-after-lightning','how-are-rainbows-formed','what-is-a-dana',
   'why-are-soap-bubbles-round','why-are-sunsets-red','why-is-snow-white',
   'why-is-the-sky-blue','why-is-the-ocean-blue','why-are-clouds-white'
  ]],
  ['Animals, plants and the Earth',[
   'are-bats-blind','can-woolly-bear-caterpillars-predict-winter','stalactites-vs-stalagmites',
   'why-are-flamingos-pink','why-do-leaves-change-colour','why-do-onions-make-you-cry','why-octopuses-have-three-hearts'
  ]]
 ]],
 ['Words & puzzles',[
  ['How words are built',[
   'portmanteau-words-brunch-smog-spork','what-is-a-compound-word','what-is-a-prefix',
   'what-is-a-root-word','what-is-a-suffix','what-is-an-acronym','what-is-etymology','contractions-in-english'
  ]],
  ['Meanings and comparisons',[
   'metaphor-examples-desk-jungle','oxymoron-examples-deafening-silence','what-is-a-euphemism',
   'what-is-a-simile','what-is-an-idiom','words-that-mean-their-own-opposite','what-is-an-antonym','trick-or-treat-meaning-origin'
  ]],
  ['Sounds and sentences',[
   'homophones-same-sound-different-meaning','what-is-a-spoonerism','what-is-alliteration',
   'what-is-onomatopoeia','why-english-has-silent-letters'
  ]],
  ['Letters and puzzles',[
   'anagrams-rearrange-the-same-letters','connections-puzzles-find-the-hidden-link',
   'palindromes-words-that-read-both-ways','repeated-letters-in-five-letter-word-games',
   'what-is-a-pangram-quick-brown-fox','wordplay-examples'
  ]]
 ]],
 ['Curiosity',[
  ['Animals and their habits',[
   'why-do-cats-have-whiskers','why-do-cats-knead','why-do-cats-love-boxes','why-do-cats-purr',
   'why-do-dogs-tilt-their-heads','why-do-dogs-wag-their-tails','why-do-flamingos-stand-on-one-leg','why-do-zebras-have-stripes'
  ]],
  ['Your body and mind',[
   'what-is-face-pareidolia','why-do-we-get-goosebumps','why-do-we-have-fingerprints'
  ]],
  ['Everyday surprises',[
   'curiosity-daily-2026-10-09','why-are-oscars-called-oscars','why-do-bananas-turn-brown','why-does-ice-float','why-does-popcorn-pop'
  ]],
  ['Weather, Earth and sky',[
   'curiosity-weekly-2026-10-09','what-is-petrichor-smell-of-rain','why-a-hurricanes-eye-is-calm',
   'why-do-the-clocks-go-back','why-earthquakes-can-be-felt-far-away','why-northern-lights-have-different-colours'
  ]]
 ]]
]);

export function groupTopicReadings(topic,articles){
 const remaining=new Set(articles.map(a=>a.slug)),groups=[];
 for(const [title,slugs] of questionGroups.get(topic)||[]){
  const wanted=new Set(slugs),matches=articles.filter(a=>remaining.has(a.slug)&&wanted.has(a.slug));
  if(matches.length){groups.push({title,articles:matches});for(const a of matches)remaining.delete(a.slug);}
 }
 const rest=articles.filter(a=>remaining.has(a.slug));
 if(rest.length)groups.push({title:groups.length?'More questions':null,articles:rest});
 return groups;
}
