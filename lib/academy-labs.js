// Reviewed, code-owned activities: article HTML cannot execute arbitrary scripts.
const lessons={
 'addition-putting-things-together':['try-adding','add-basics','Bring the piles together','Choose two small piles. Count the counters, then reveal the total.'],
 'subtraction-how-many-are-left':['try-taking-away','subtract-basics','What is left?','Take away one counter at a time. You can put it back and try again.'],
 'multiplication-equal-groups':['build-groups','groups-basics','Make your own equal groups','Change the groups, count what you see, then reveal the total.'],
 'mental-math-round-and-adjust':['addition','round','Try the sticker trick','Move through the steps. The extra stickers are only pretend.'],
 'multiply-by-11-in-your-head':['small-example','multiply','Make eleven groups','Change the size of a group. Ten groups plus one more make eleven.'],
 'mental-percentages-without-a-calculator':['meaning','percent','Colour a percentage','Move the slider. Each small square is one part out of a hundred.'],
 'which-century-is-that-year':['boundary','century','Find the right century','Choose a year and see which box of 100 it belongs in.'],
 'why-2100-is-not-a-leap-year':['three-checks','leap','Try a year','Follow the checks one at a time. This uses the Gregorian calendar.'],
 'why-britain-skipped-eleven-days-in-1752':['count-the-days','calendar','Turn the calendar page','Follow consecutive days in Britain in September 1752. Watch the label change.'],
 'why-the-moon-changes-shape':['quarter','moon','Explore four Moon phases','Choose a phase to see how much of the bright side faces us.'],
 'what-really-causes-seasons':['light-and-time','seasons','Two halves, different seasons','Choose a time of year. These are simplified examples for places away from the equator.'],
 'why-time-zones-get-messy':['clock-arithmetic','clocks','Set three clocks','Move the UTC clock. These examples use fixed offsets, without daylight saving.']
};
export function activityFor(slug,section){
 const a=lessons[slug];if(!a||a[0]!==section)return '';
 return `<section class="academy-lab" data-academy-lab="${a[1]}" aria-labelledby="lab-${a[1]}"><header class="lab-heading"><span class="lab-emblem" aria-hidden="true">${({'subtract-basics':'−','groups-basics':'×',multiply:'×',percent:'%',moon:'◒',seasons:'☀',clocks:'◷',calendar:'31',leap:'29',century:'100'})[a[1]]||'+'}</span><div><p class="lab-kicker">Try it yourself</p><h3 id="lab-${a[1]}">${a[2]}</h3></div></header><p class="lab-intro">${a[3]}</p><div class="lab-workbench"><div data-lab-controls hidden></div><div data-lab-visual aria-hidden="true"></div></div><p data-lab-output role="status" aria-live="polite"></p><noscript><p>The worked example above explains the same idea. Enable JavaScript to try changing it yourself.</p></noscript></section>`;
}
