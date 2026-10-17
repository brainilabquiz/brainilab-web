-- Transactional fictional rows only; no real account, completion, XP or result writes.
begin;
create temporary table users(id uuid primary key,is_anonymous boolean,raw_user_meta_data jsonb default '{}'::jsonb);
create temporary table player_progression(user_id uuid primary key,xp bigint,total_games int default 0,best_streak int default 0,full_daily_count int default 0);
create temporary table player_personal_bests(user_id uuid,result_id uuid,game_id text);
create temporary table learn_paths(slug text primary key,document jsonb,revision int);
create temporary table learn_publications(slug text primary key,document jsonb);
create temporary table learn_progress(user_id uuid,article_slug text,quiz_version text,score int,total int,completed_at timestamptz,primary key(user_id,article_slug));
create temporary table learn_avatar_unlocks(user_id uuid,reward_id text,course_slug text,course_revision int,lesson_count int,unlocked_at timestamptz default now(),primary key(user_id,reward_id));
insert into pg_temp.learn_paths values('calendars-explained','{"status": "published", "lessons": [{"slug": "days-months-and-years", "level": "1 \u00c2\u00b7 Start with the units", "objective": "Separate the weekday cycle from month and year lengths."}, {"slug": "which-century-is-that-year", "level": "2 \u00c2\u00b7 Foundations", "objective": "Put years into boxes of one hundred."}, {"slug": "why-2100-is-not-a-leap-year", "level": "3 \u00c2\u00b7 Build on it", "objective": "Find out why February sometimes gets an extra day."}, {"slug": "why-britain-skipped-eleven-days-in-1752", "level": "4 \u00c2\u00b7 Add historical context", "objective": "Discover how a date jumped forward while life went on as usual."}]}'::jsonb,3);
insert into pg_temp.learn_paths values('maths-from-zero','{"status": "published", "lessons": [{"slug": "counting-and-zero", "level": "1 \u00c2\u00b7 Count what you see", "objective": "Count each object once and give an empty pile its number."}, {"slug": "tens-and-ones", "level": "2 \u00c2\u00b7 Build bigger numbers", "objective": "Bundle ten counters and see what each digit means."}, {"slug": "addition-putting-things-together", "level": "3 \u00c2\u00b7 Put things together", "objective": "Join two piles and discover what the plus sign means."}, {"slug": "subtraction-how-many-are-left", "level": "4 \u00c2\u00b7 Take some away", "objective": "Remove counters and check what is left."}, {"slug": "multiplication-equal-groups", "level": "5 \u00c2\u00b7 Make equal groups", "objective": "Connect equal groups to a multiplication fact."}, {"slug": "division-sharing-equally", "level": "6 \u00c2\u00b7 Share it fairly", "objective": "Share equal amounts and explain what is left over."}, {"slug": "square-numbers-why-they-make-a-square", "level": "7 \u00c2\u00b7 Grow a little square", "objective": "Explain a square number with equal rows and columns, then spot the odd-number gaps."}, {"slug": "prime-numbers-why-one-is-not-prime", "level": "8 \u00c2\u00b7 Count the factors", "objective": "Identify prime and composite numbers by their different positive factors, and explain why 1 is neither."}, {"slug": "mean-vs-median-biscuit-average", "level": "9 \u00c2\u00b7 Find the middle", "objective": "Calculate a mean and a median, then explain how one unusually large value changes the story."}]}'::jsonb,5);
insert into pg_temp.learn_paths values('mental-maths-foundations','{"status": "published", "lessons": [{"slug": "make-ten-mental-maths", "level": "1 \u00c2\u00b7 Find a friendly ten", "objective": "Split an addition so the first step reaches ten."}, {"slug": "mental-math-round-and-adjust", "level": "2 \u00c2\u00b7 Foundations", "objective": "Move a few counters and see why an awkward sum gets easier."}, {"slug": "doubling-and-halving", "level": "3 \u00c2\u00b7 Keep the total", "objective": "Double one factor and halve the other without changing the product."}, {"slug": "divide-by-five-in-your-head", "level": "4 \u00c2\u00b7 Divide by five", "objective": "Double first, divide by ten, and check the result\u00e2\u20ac\u201deven with decimals."}, {"slug": "multiply-by-11-in-your-head", "level": "5 \u00c2\u00b7 Build on it", "objective": "Count ten bags of sweets, then add the last bag."}, {"slug": "mental-percentages-without-a-calculator", "level": "6 \u00c2\u00b7 Put it together", "objective": "See what half, a quarter and ten percent look like."}, {"slug": "percentage-change-why-twenty-percent-does-not-cancel", "level": "7 \u00c2\u00b7 Check the changing whole", "objective": "Calculate a percentage change using the correct starting amount and explain why equal percentage decreases and increases do not cancel."}]}'::jsonb,6);
insert into pg_temp.learn_paths values('sun-moon-and-time','{"status": "published", "lessons": [{"slug": "why-day-turns-into-night", "level": "1 \u00c2\u00b7 Start with Earth", "objective": "Turn a model Earth and follow a place from light into darkness."}, {"slug": "why-the-moon-changes-shape", "level": "2 \u00c2\u00b7 Foundations", "objective": "Picture a ball beside a lamp to understand the Moon\u00e2\u20ac\u2122s changing face."}, {"slug": "what-really-causes-seasons", "level": "3 \u00c2\u00b7 Build on it", "objective": "See how Earth\u00e2\u20ac\u2122s little lean changes the sunlight we get."}, {"slug": "why-time-zones-get-messy", "level": "4 \u00c2\u00b7 Apply and distinguish", "objective": "Follow three clocks to understand why places use different times."}, {"slug": "solar-eclipse-vs-lunar-eclipse", "level": "5 \u00c2\u00b7 Follow the shadow", "objective": "Distinguish solar and lunar eclipses by alignment, shadow and Moon phase."}, {"slug": "why-we-see-same-side-of-moon", "level": "6 \u00c2\u00b7 Follow the familiar face", "objective": "Explain synchronous rotation, distinguish the far side from darkness and recognise the small change in viewpoint called libration."}]}'::jsonb,5);
insert into pg_temp.learn_paths values('word-detective','{"status": "published", "lessons": [{"slug": "homophones-same-sound-different-meaning", "level": "1 \u00c2\u00b7 Listen for the clue", "objective": "Use a sentence to tell two sound-alike words apart."}, {"slug": "words-that-mean-their-own-opposite", "level": "2 \u00c2\u00b7 Try another meaning", "objective": "Find out why dust can mean adding something or taking it away."}, {"slug": "connections-puzzles-find-the-hidden-link", "level": "3 \u00c2\u00b7 Connect the whole set", "objective": "Test a possible link against every clue in a word puzzle."}, {"slug": "anagrams-rearrange-the-same-letters", "level": "4 \u00c2\u00b7 Shuffle the letters", "objective": "Rearrange a word without adding, losing or duplicating a letter."}, {"slug": "palindromes-words-that-read-both-ways", "level": "5 \u00c2\u00b7 Check both directions", "objective": "Spot a palindrome and distinguish its rule from an anagram."}, {"slug": "portmanteau-words-brunch-smog-spork", "level": "6 \u00c2\u00b7 Unpack a word", "objective": "Find the source words inside a blend and tell it apart from an anagram or a compound."}, {"slug": "what-is-a-pangram-quick-brown-fox", "level": "7 \u00c2\u00b7 Find the whole alphabet", "objective": "Check whether a sentence contains all 26 English letters and explain why repeats are allowed."}, {"slug": "oxymoron-examples-deafening-silence", "level": "8 \u00c2\u00b7 Hear a little contradiction", "objective": "Recognise an oxymoron and explain what the apparently conflicting ideas add to an expression."}]}'::jsonb,6);
insert into pg_temp.learn_paths values('fractions-from-zero','{"status": "published", "lessons": [{"slug": "fractions-equal-parts", "level": "1 \u00c2\u00b7 Check the pieces", "objective": "Recognise equal parts of the same whole."}, {"slug": "reading-a-fraction", "level": "2 \u00c2\u00b7 Read the two numbers", "objective": "Explain the numerator and denominator using a picture."}, {"slug": "equivalent-fractions-same-amount", "level": "3 \u00c2\u00b7 Change the pieces", "objective": "Show why different fractions can describe the same amount."}, {"slug": "comparing-fractions-visually", "level": "4 \u00c2\u00b7 Compare fairly", "objective": "Compare fractions using equal-sized wholes."}, {"slug": "adding-fractions-same-pieces", "level": "5 \u00c2\u00b7 Put it together", "objective": "Add fractions whose pieces have the same size."}, {"slug": "decimals-money-and-parts-of-ten", "level": "6 \u00c2\u00b7 Meet the decimal point", "objective": "Use tenths and hundredths to write the same amount in a new way."}, {"slug": "what-is-a-ratio-juice-and-water", "level": "7 \u00c2\u00b7 Compare a mixture", "objective": "Read a ratio in order, distinguish a part-to-part ratio from a fraction of the whole, and scale both quantities together."}]}'::jsonb,3);
insert into pg_temp.learn_paths values('patterns-and-reasoning','{"status": "published", "lessons": [{"slug": "spotting-repeating-patterns", "level": "1 \u00c2\u00b7 Notice the repeat", "objective": "Find the repeating unit before predicting the next item."}, {"slug": "number-patterns-check-every-step", "level": "2 \u00c2\u00b7 Test the rule", "objective": "Check a proposed number rule against every step."}, {"slug": "rotation-or-reflection", "level": "3 \u00c2\u00b7 Change your viewpoint", "objective": "Distinguish turning a shape from reflecting it."}, {"slug": "sorting-with-two-rules", "level": "4 \u00c2\u00b7 Combine two conditions", "objective": "Sort objects by two rules at once."}, {"slug": "logic-what-must-be-true", "level": "5 \u00c2\u00b7 Draw a conclusion", "objective": "Identify what must follow from the stated facts."}, {"slug": "venn-diagram-examples-pizza-night", "level": "6 \u00c2\u00b7 Count the overlap", "objective": "Read separate Venn-diagram regions and avoid double counting shared members."}, {"slug": "coin-flip-probability-five-heads", "level": "7 \u00c2\u00b7 Question a lucky streak", "objective": "Distinguish the probability of a whole sequence from the next independent flip under a fair-coin model."}]}'::jsonb,3);
insert into pg_temp.learn_paths values('sky-colours','{"status": "published", "lessons": [{"slug": "why-is-the-sky-blue", "level": "1 \u00c2\u00b7 Follow the blue", "objective": "Connect the blue daytime sky to sunlight scattered by air molecules."}, {"slug": "why-are-sunsets-red", "level": "2 \u00c2\u00b7 Follow the evening light", "objective": "Explain how the low Sun\u00e2\u20ac\u2122s longer air path changes the colours reaching us."}, {"slug": "how-are-rainbows-formed", "level": "3 \u00c2\u00b7 Follow a raindrop", "objective": "Distinguish refraction and reflection, and connect a rainbow to the colours already in sunlight."}, {"slug": "why-do-stars-twinkle", "level": "4 \u00c2\u00b7 Watch the starlight", "objective": "Explain atmospheric twinkling, compare low and high stars and understand why planets usually look steadier."}]}'::jsonb,2);
insert into pg_temp.learn_publications values('mean-vs-median-biscuit-average','{"quiz": {"version": "math-mean-median-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('mental-math-round-and-adjust','{"quiz": {"version": "beginner-20260930", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('why-we-see-same-side-of-moon','{"quiz": {"version": "science-moon-tidal-locking-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('divide-by-five-in-your-head','{"quiz": {"version": "academy-oct9-divide-five-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('how-are-rainbows-formed','{"quiz": {"version": "science-rainbow-refraction-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('why-do-stars-twinkle','{"quiz": {"version": "science-star-twinkle-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('venn-diagram-examples-pizza-night','{"quiz": {"version": "patterns-venn-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('oxymoron-examples-deafening-silence','{"quiz": {"version": "word-oxymoron-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('percentage-change-why-twenty-percent-does-not-cancel','{"quiz": {"version": "mental-percent-change-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('multiply-by-11-in-your-head','{"quiz": {"version": "beginner-20260930", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('connections-puzzles-find-the-hidden-link','{"quiz": {"version": "word-detective-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('mental-percentages-without-a-calculator','{"quiz": {"version": "beginner-20260930", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('solar-eclipse-vs-lunar-eclipse','{"quiz": {"version": "sky-eclipses-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('what-is-a-pangram-quick-brown-fox','{"quiz": {"version": "word-pangram-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('what-is-a-ratio-juice-and-water','{"quiz": {"version": "fractions-ratio-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('why-is-the-sky-blue','{"quiz": {"version": "science-blue-sky-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('why-are-sunsets-red','{"quiz": {"version": "science-red-sunset-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('why-2100-is-not-a-leap-year','{"quiz": {"version": "beginner-20260930", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('why-britain-skipped-eleven-days-in-1752','{"quiz": {"version": "beginner-20260930", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('anagrams-rearrange-the-same-letters','{"quiz": {"version": "word-anagrams-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('palindromes-words-that-read-both-ways','{"quiz": {"version": "word-palindromes-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('what-really-causes-seasons','{"quiz": {"version": "beginner-20260930", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('multiplication-equal-groups','{"quiz": {"version": "maths-zero-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('subtraction-how-many-are-left','{"quiz": {"version": "maths-zero-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('which-century-is-that-year','{"quiz": {"version": "beginner-20260930", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('addition-putting-things-together','{"quiz": {"version": "maths-zero-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('why-the-moon-changes-shape','{"quiz": {"version": "beginner-20260930", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('why-time-zones-get-messy','{"quiz": {"version": "beginner-20260930", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('adding-fractions-same-pieces','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('comparing-fractions-visually','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('days-months-and-years','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('decimals-money-and-parts-of-ten','{"quiz": {"version": "decimals-basics-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('spotting-repeating-patterns','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('tens-and-ones','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('division-sharing-equally','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('portmanteau-words-brunch-smog-spork','{"quiz": {"version": "word-portmanteau-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('coin-flip-probability-five-heads','{"quiz": {"version": "reasoning-coin-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('logic-what-must-be-true','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('prime-numbers-why-one-is-not-prime','{"quiz": {"version": "math-primes-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('rotation-or-reflection','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('why-day-turns-into-night','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('doubling-and-halving','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('equivalent-fractions-same-amount','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('homophones-same-sound-different-meaning','{"quiz": {"version": "word-detective-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('number-patterns-check-every-step','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('reading-a-fraction','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('sorting-with-two-rules','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('words-that-mean-their-own-opposite','{"quiz": {"version": "word-detective-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('counting-and-zero','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('fractions-equal-parts','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('make-ten-mental-maths','{"quiz": {"version": "academy-oct-v1", "questions": [{}, {}, {}]}}'::jsonb);
insert into pg_temp.learn_publications values('square-numbers-why-they-make-a-square','{"quiz": {"version": "maths-square-numbers-v1", "questions": [{}, {}, {}]}}'::jsonb);
create function pg_temp.record_academy_avatar_unlocks(p_user_id uuid) returns void
language sql security invoker set search_path='' as $grant$
  insert into pg_temp.learn_avatar_unlocks(user_id,reward_id,course_slug,course_revision,lesson_count)
  select p_user_id,r.reward_id,p.slug,p.revision,jsonb_array_length(p.document->'lessons')
  from (values
      ('academy_calendar','calendars-explained'),
      ('academy_abacus','maths-from-zero'),
      ('academy_mathspecs','mental-maths-foundations'),
      ('academy_moon','sun-moon-and-time'),
      ('academy_detective','word-detective'),
      ('academy_pie','fractions-from-zero'),
      ('academy_puzzle','patterns-and-reasoning'),
      ('academy_rainbow','sky-colours')
  ) r(reward_id,course_slug)
  join pg_temp.learn_paths p on p.slug=r.course_slug
  where p.document->>'status'='published' and jsonb_array_length(p.document->'lessons')>0
    and exists(select 1 from pg_temp.users u where u.id=p_user_id and not coalesce(u.is_anonymous,true))
    and not exists(
      select 1 from jsonb_array_elements(p.document->'lessons') l
      left join pg_temp.learn_publications a on a.slug=l->>'slug'
      left join pg_temp.learn_progress lp on lp.user_id=p_user_id and lp.article_slug=a.slug
      where a.slug is null or a.document->'quiz'->>'version' is null
        or lp.quiz_version is distinct from a.document->'quiz'->>'version'
        or lp.total is distinct from jsonb_array_length(a.document->'quiz'->'questions')
        or lp.total<=0 or lp.score is null or lp.score<0 or lp.score>lp.total or lp.completed_at is null
    )
  on conflict(user_id,reward_id) do nothing;
$grant$;
CREATE OR REPLACE FUNCTION pg_temp.player_avatar(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_catalog constant jsonb := '{"mode":[["picture",0],["built",0]],"skin":[["sand",0],["peach",0],["honey",0],["cocoa",0],["umber",0],["ebony",0]],"hair":[["sweep",0],["curls",0],["bob",0],["crop",0],["bald",0],["ponytail",0],["waves",0],["braids",0]],"hairColor":[["brown",0],["black",0],["blond",0],["auburn",0],["silver",0]],"shirt":[["navy",0],["green",0],["orange",0],["blue",0],["berry",0]],"background":[["lilac",0],["sky",0],["sage",0],["sunshine",0],["coral",0]],"glasses":[["none",0],["round",150],["square",600],["sun",1000],["monocle",2250],["heart",2750],["star",3500],["visor",5000],["doughnut",6500],["camera",8250],["academy_mathspecs",0]],"hat":[["none",0],["beanie",500],["egg",1200],["cap",1500],["corn",2200],["toast",2800],["cloud",4000],["coffee",4750],["wave",5500],["wizard",6000],["graduate",8000],["academy_calendar",0],["academy_detective",0],["academy_rainbow",0]],"prop":[["none",0],["cookie",300],["icepop",800],["peas",1800],["bulb",2500],["train",3200],["owl",3800],["pencil",4500],["nacho",5750],["rocket",7000],["roll",7500],["book",9000],["academy_abacus",0],["academy_moon",0],["academy_pie",0],["academy_puzzle",0]],"frame":[["level",0],["blue",100],["green",500],["copper",1500],["gold",3000],["orbit",6000]]}'::jsonb;
  v_titles constant jsonb := '[["none",0],["explorer",250],["curious",750],["detective",2000],["thinker",4500],["sage",10000]]'::jsonb;
  v_title text := 'none';
  v_meta jsonb; v_xp bigint; v_key text; v_choices jsonb; v_item jsonb;
  v_value text; v_default text; v_cost integer; v_render_xp integer := 0; v_frame_cost integer := 0;
  v_design jsonb := '{}'::jsonb; v_frame text := 'level';
  v_badge_catalog constant jsonb := '{"first_game":[{"totalGames":1},{"totalGames":3},{"totalGames":7},{"totalGames":15},{"totalGames":30},{"totalGames":55},{"totalGames":95},{"totalGames":155},{"totalGames":245},{"totalGames":375}],"ten_games":[{"totalGames":10},{"totalGames":20},{"totalGames":40},{"totalGames":75},{"totalGames":135},{"totalGames":230},{"totalGames":375},{"totalGames":590},{"totalGames":900},{"totalGames":1350}],"fifty_games":[{"totalGames":50},{"totalGames":100},{"totalGames":175},{"totalGames":300},{"totalGames":500},{"totalGames":800},{"totalGames":1250},{"totalGames":1900},{"totalGames":2800},{"totalGames":4000}],"personal_bests_three":[{"totalGames":0,"personalBestGames":3},{"totalGames":10,"personalBestGames":3},{"totalGames":25,"personalBestGames":4},{"totalGames":55,"personalBestGames":4},{"totalGames":110,"personalBestGames":5},{"totalGames":210,"personalBestGames":5},{"totalGames":385,"personalBestGames":6},{"totalGames":680,"personalBestGames":6},{"totalGames":1150,"personalBestGames":7},{"totalGames":1900,"personalBestGames":8}],"daily_first":[{"fullDailyCount":1},{"fullDailyCount":3},{"fullDailyCount":7},{"fullDailyCount":15},{"fullDailyCount":30},{"fullDailyCount":55},{"fullDailyCount":95},{"fullDailyCount":155},{"fullDailyCount":245},{"fullDailyCount":375}],"daily_seven":[{"fullDailyCount":7},{"fullDailyCount":14},{"fullDailyCount":28},{"fullDailyCount":50},{"fullDailyCount":85},{"fullDailyCount":140},{"fullDailyCount":225},{"fullDailyCount":355},{"fullDailyCount":550},{"fullDailyCount":840}],"streak_three":[{"bestStreak":3},{"bestStreak":5},{"bestStreak":9},{"bestStreak":16},{"bestStreak":28},{"bestStreak":47},{"bestStreak":77},{"bestStreak":122},{"bestStreak":187},{"bestStreak":277}],"streak_seven":[{"bestStreak":7},{"bestStreak":10},{"bestStreak":16},{"bestStreak":26},{"bestStreak":42},{"bestStreak":67},{"bestStreak":105},{"bestStreak":160},{"bestStreak":240},{"bestStreak":350}]}'::jsonb;
  v_total_games integer; v_best_streak integer; v_full_daily_count integer; v_personal_best_games integer := 0;
  v_is_account boolean; v_metrics jsonb; v_selection jsonb; v_badge_id text; v_badge_tiers jsonb;
  v_badge_tier integer; v_tier_index integer; v_selected_item jsonb;
  v_seen text[] := array[]::text[]; v_achievements jsonb := '[]'::jsonb;
begin
  select coalesce(u.raw_user_meta_data,'{}'::jsonb),greatest(0,coalesce(pp.xp,0)),
    pp.total_games,pp.best_streak,pp.full_daily_count,not coalesce(u.is_anonymous,false)
  into v_meta,v_xp,v_total_games,v_best_streak,v_full_daily_count,v_is_account from pg_temp.users u left join pg_temp.player_progression pp on pp.user_id=u.id
  where u.id=p_user_id;
  if not found then return null; end if;
  for v_key,v_choices in select key,value from pg_catalog.jsonb_each(v_catalog) loop
    v_default:=v_choices->0->>0;
    v_value:=v_meta->>case when v_key='frame' then 'brainilab_avatar_frame_v1'
      when v_key='hairColor' then 'brainilab_avatar_hair_color_v1'
      else 'brainilab_avatar_'||v_key||'_v1' end;
    v_cost:=null;
    for v_item in select value from pg_catalog.jsonb_array_elements(v_choices) loop
      if v_item->>0=v_value then v_cost:=(v_item->>1)::integer; exit; end if;
    end loop;
    if v_cost is null or v_cost>v_xp or (v_value=any(array['academy_calendar','academy_abacus','academy_mathspecs','academy_moon','academy_detective','academy_pie','academy_puzzle','academy_rainbow']::text[]) and not exists(select 1 from pg_temp.learn_avatar_unlocks au where au.user_id=p_user_id and au.reward_id=v_value)) then v_value:=v_default; v_cost:=0; end if;
    v_render_xp:=greatest(v_render_xp,v_cost);
    if v_key='frame' then v_frame:=v_value; v_frame_cost:=v_cost;
    else v_design:=v_design||pg_catalog.jsonb_build_object(v_key,v_value); end if;
  end loop;
  -- A title is a cosmetic selection; only canonical earned XP can unlock it.
  for v_item in select value from pg_catalog.jsonb_array_elements(v_titles) loop
    if v_item->>0=v_meta->>'brainilab_profile_title_v1' and (v_item->>1)::integer<=v_xp then
      v_title:=v_item->>0; exit;
    end if;
  end loop;
  -- Selected IDs are editable preferences, never proof of an earned tier.
  -- Reject malformed/oversized badge lists without changing avatar appearance.
  v_selection:=v_meta->'brainilab_featured_achievements_v1';
  if v_is_account and v_total_games>=0 and v_best_streak>=0 and v_full_daily_count>=0
    and pg_catalog.jsonb_typeof(v_selection)='array' then
    if pg_catalog.jsonb_array_length(v_selection) between 1 and 3 then
      if v_selection ? 'personal_bests_three' then
        select count(distinct pb.result_id)::integer into v_personal_best_games
        from pg_temp.player_personal_bests pb
        where pb.user_id=p_user_id and pb.game_id=any(array['brainmix','flagdash','orderup','maphunt','topicrush','brainiword',
          'worldflags','worldcapitals','science','history','sports','generalknowledge','connections','survival','oddoneout',
          'higherlower','mathrush','numberroute','sequence']::text[])
          and pb.result_id is not null and pb.result_id<>'00000000-0000-0000-0000-000000000000'::uuid;
      end if;
      v_metrics:=pg_catalog.jsonb_build_object('totalGames',v_total_games,'bestStreak',v_best_streak,
        'fullDailyCount',v_full_daily_count,'personalBestGames',v_personal_best_games);
      for v_selected_item in select value from pg_catalog.jsonb_array_elements(v_selection) loop
        if pg_catalog.jsonb_typeof(v_selected_item)<>'string' then continue; end if;
        v_badge_id:=v_selected_item#>>'{}';
        if v_badge_id=any(v_seen) or not (v_badge_catalog ? v_badge_id) then continue; end if;
        v_seen:=pg_catalog.array_append(v_seen,v_badge_id);
        v_badge_tiers:=v_badge_catalog->v_badge_id; v_badge_tier:=0;
        for v_tier_index in 0..9 loop
          if not exists(select 1 from pg_catalog.jsonb_each_text(v_badge_tiers->v_tier_index) requirement
            where (v_metrics->>requirement.key)::integer<requirement.value::integer) then
            v_badge_tier:=v_tier_index+1;
          end if;
        end loop;
        if v_badge_tier>0 then
          v_achievements:=v_achievements||pg_catalog.jsonb_build_array(
            pg_catalog.jsonb_build_object('id',v_badge_id,'tier',v_badge_tier));
        end if;
      end loop;
    end if;
  end if;
  if v_design->>'mode'<>'built' and v_frame='level' and v_title='none' and v_achievements='[]'::jsonb then return null; end if;
  if v_design->>'mode'<>'built' then v_render_xp:=v_frame_cost; end if;
  -- render_xp is only the minimum threshold needed to render these unlocked items.
  -- The public ranking receives neither total XP, auth metadata, email nor user ID.
  return pg_catalog.jsonb_build_object('design',case when v_design->>'mode'='built' then v_design else null end,
    'frame',v_frame,'render_xp',v_render_xp,'title',v_title,'achievements',v_achievements);
end;
$function$;

create function pg_temp.on_completion() returns trigger language plpgsql security invoker set search_path='' as $$begin perform pg_temp.record_academy_avatar_unlocks(new.user_id);return new;end $$;
create trigger academy_fixture_completion after insert or update of quiz_version,score,total,completed_at on pg_temp.learn_progress for each row execute function pg_temp.on_completion();
insert into pg_temp.users(id,is_anonymous) values('00000000-0000-4000-8000-000000000011',false),('00000000-0000-4000-8000-000000000012',false),('00000000-0000-4000-8000-000000000013',true);
insert into pg_temp.player_progression(user_id,xp) values('00000000-0000-4000-8000-000000000011',0),('00000000-0000-4000-8000-000000000012',100000),('00000000-0000-4000-8000-000000000013',100000);
do $tests$
declare uid uuid:='00000000-0000-4000-8000-000000000011'; other_uid uuid:='00000000-0000-4000-8000-000000000012';anon_uid uuid:='00000000-0000-4000-8000-000000000013';c record;l record;v_saved jsonb;v_count int;v_case int:=0;v_kind text;v_prop text;
begin
 for c in select * from pg_temp.learn_paths order by slug loop
   truncate pg_temp.learn_progress,pg_temp.learn_avatar_unlocks;
   perform pg_temp.record_academy_avatar_unlocks(uid);
   if exists(select 1 from pg_temp.learn_avatar_unlocks) then raise exception 'No quiz cannot unlock';end if;
   -- Finish every lesson except the final one, using genuine current versions.
   for l in select a.slug,a.document->'quiz'->>'version' as version,jsonb_array_length(a.document->'quiz'->'questions') as total from jsonb_array_elements(c.document->'lessons') with ordinality ls(value,n) join pg_temp.learn_publications a on a.slug=ls.value->>'slug' where ls.n<jsonb_array_length(c.document->'lessons') loop
     insert into pg_temp.learn_progress values(uid,l.slug,l.version,0,l.total,now());
   end loop;
   if exists(select 1 from pg_temp.learn_avatar_unlocks where user_id=uid and course_slug=c.slug) then raise exception 'Incomplete course unlocked: %',c.slug;end if;
   select a.slug,a.document->'quiz'->>'version' as version,jsonb_array_length(a.document->'quiz'->'questions') as total into l from pg_temp.learn_publications a where a.slug=c.document->'lessons'->-1->>'slug';
   insert into pg_temp.learn_progress values(uid,l.slug,'wrong-version',0,l.total,now());
   if exists(select 1 from pg_temp.learn_avatar_unlocks where user_id=uid and course_slug=c.slug) then raise exception 'Wrong version unlocked';end if;
   update pg_temp.learn_progress set quiz_version=l.version,total=l.total-1 where user_id=uid and article_slug=l.slug;
   if exists(select 1 from pg_temp.learn_avatar_unlocks where user_id=uid and course_slug=c.slug) then raise exception 'Wrong total unlocked';end if;
   update pg_temp.learn_progress set total=l.total,completed_at=null where user_id=uid and article_slug=l.slug;
   if exists(select 1 from pg_temp.learn_avatar_unlocks where user_id=uid and course_slug=c.slug) then raise exception 'Missing completion unlocked';end if;
   update pg_temp.learn_progress set completed_at=now() where user_id=uid and article_slug=l.slug;
   select count(*),max(reward_id) into v_count,v_prop from pg_temp.learn_avatar_unlocks where user_id=uid and course_slug=c.slug;
   if v_count<>1 then raise exception 'Complete course must unlock once: %',c.slug;end if;
   select to_jsonb(u) into v_saved from pg_temp.learn_avatar_unlocks u where user_id=uid and course_slug=c.slug;
   perform pg_temp.record_academy_avatar_unlocks(uid);
   if v_saved is distinct from (select to_jsonb(u) from pg_temp.learn_avatar_unlocks u where user_id=uid and course_slug=c.slug) then raise exception 'Grant is not idempotent';end if;
   -- Course extensions or new quiz versions never revoke a previously earned item.
   update pg_temp.learn_paths set document=jsonb_set(document,'{lessons}',document->'lessons'||'[{"slug":"future-chapter"}]'::jsonb) where slug=c.slug;
   perform pg_temp.record_academy_avatar_unlocks(uid);
   if v_saved is distinct from (select to_jsonb(u) from pg_temp.learn_avatar_unlocks u where user_id=uid and course_slug=c.slug) then raise exception 'Earned reward revoked by extension';end if;
   update pg_temp.learn_paths set document=c.document where slug=c.slug;
   -- Another account cannot borrow progress; an anonymous identity cannot earn it.
   perform pg_temp.record_academy_avatar_unlocks(other_uid);
   if exists(select 1 from pg_temp.learn_avatar_unlocks where user_id=other_uid) then raise exception 'Cross-owner unlock';end if;
   insert into pg_temp.learn_progress select anon_uid,article_slug,quiz_version,score,total,completed_at from pg_temp.learn_progress where user_id=uid;
   if exists(select 1 from pg_temp.learn_avatar_unlocks where user_id=anon_uid) then raise exception 'Anonymous unlock';end if;
   v_kind:=case when v_prop in ('academy_calendar','academy_detective','academy_rainbow') then 'hat' when v_prop='academy_mathspecs' then 'glasses' else 'prop' end;
   update pg_temp.users set raw_user_meta_data=jsonb_build_object('brainilab_avatar_mode_v1','built','brainilab_avatar_'||v_kind||'_v1',v_prop) where id in(uid,other_uid);
   if pg_temp.player_avatar(uid)->'design'->>v_kind is distinct from v_prop then raise exception 'Valid course artwork stripped';end if;
   if pg_temp.player_avatar(other_uid)->'design'->>v_kind is distinct from 'none' then raise exception 'Forged course metadata exposed socially';end if;
   if (pg_temp.player_avatar(uid)-'design'-'frame'-'render_xp'-'title'-'achievements')<>'{}'::jsonb then raise exception 'Unexpected public detail';end if;
   v_case:=v_case+1;
 end loop;
 if (select xp from pg_temp.player_progression where user_id=uid)<>0 then raise exception 'Course unlock changed XP';end if;
 if v_case<>8 then raise exception 'Expected 8 course contracts';end if;
end $tests$;
select jsonb_build_object('courseContracts',8,'casesPerCourse',12,'realPlayerWrites',0,'transaction','rollback') as fixture_result;
rollback;
