// Isolated PostgreSQL tests of the production function definitions. No live player data.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href),db=new PGlite();
const uid='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002';
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const id=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function result(key,game,daily=null){const session=await scalar('insert into game_sessions(user_id,client_result_id,game_id,daily_number)values($1,$2,$3,$4) returning id',[uid,key,game,daily]);return scalar('insert into game_results(user_id,session_id)values($1,$2)returning id',[uid,session]);}
const verify=(name,key,rows)=>scalar(`select ${name}($1,$2::jsonb)`,[key,JSON.stringify(rows)]);
try{
 await db.exec(`create schema auth;create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
 await db.exec(await readFile('tools/fixtures/rewards-schema.sql','utf8'));
 await db.exec(`create table connections_puzzles(id uuid,is_active boolean,explanation text);create table connections_choices(id uuid,puzzle_id uuid,is_correct boolean,choice_text text);
 create table daily_rotating_content(daily_challenge_id uuid,game_id text,content_id uuid,position int);
 create table number_route_puzzles(id uuid,solution text[]);
 create table daily_topic_rush(daily_challenge_id uuid,topic_id uuid);create table topic_rush_topics(id uuid,target_count int);create table topic_rush_answers(id uuid,topic_id uuid,normalized_answer text,normalized_aliases text[]);
 create function brainilab_daily_game_ids(date)returns text[] language sql as $$select array['connections','numberroute','mathrush']$$;
 create function brainilab_assert_daily_verification(uuid,uuid)returns void language sql as $$select$$;
 create function brainilab_normalize_topic_rush_answer(text)returns text language sql as $$select lower(trim($1))$$;
 create function brainilab_math_rush_operation(text,int)returns jsonb language sql as $$select '{"answer":0}'::jsonb$$;
 alter table verified_question_answers add unique(result_id,question_version_id);`);
 await db.exec(await readFile('supabase/migrations/20261002050038_game_answer_integrity.sql','utf8'));
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
 const rows=[];
 for(let n=1;n<=20;n++){
  await db.query("insert into connections_puzzles values($1,true,'Drinks connect the clues')",[id(n)]);
  await db.query("insert into connections_choices values($1,$3,true,'Drinks'),($2,$3,false,'Planets')",[id(100+n),id(200+n),id(n)]);
  rows.push({puzzle_id:id(n),attempts:1,attempted_choice_ids:[id((n%2?100:200)+n)]});
 }
 const check=await scalar('select check_brainilab_connections_guess($1,$2)',[id(1),id(201)]);assert.equal(check.correct,false);assert.equal(check.answer,'Drinks');assert.equal(check.correct_choice_id,id(101));
 await result('connections-mixed','connections');let r=await verify('verify_brainilab_connections_result','connections-mixed',rows);assert.equal(r.score,10000);assert.equal(r.correct_answers,10);assert.equal(r.accuracy,50);
 assert.deepEqual(await verify('verify_brainilab_connections_result','connections-mixed',[]),r,'verified result remains immutable');
 await result('connections-zero','connections');const wrong=rows.map((x,i)=>({...x,attempted_choice_ids:[id(201+i)]}));r=await verify('verify_brainilab_connections_result','connections-zero',wrong);assert.equal(r.score,0);assert.equal(r.correct_answers,0);
 await result('connections-oldtab','connections');const old=rows.map((x,i)=>({...x,attempts:2,attempted_choice_ids:[id(201+i),id(101+i)]}));r=await verify('verify_brainilab_connections_result','connections-oldtab',old);assert.equal(r.score,0,'old open tab cannot turn a wrong first answer into points');
 await result('connections-invalid','connections');await assert.rejects(()=>verify('verify_brainilab_connections_result','connections-invalid',null));await assert.rejects(()=>verify('verify_brainilab_connections_result','connections-invalid',[]));await assert.rejects(()=>verify('verify_brainilab_connections_result','connections-invalid',[...rows.slice(0,19),rows[0]]),/Duplicate/);
 const daily=id(500);await db.query("insert into daily_challenges(id,challenge_date,daily_number,status)values($1,current_date,42,'published')",[daily]);
 for(let n=1;n<=3;n++)await db.query("insert into daily_rotating_content values($1,'connections',$2,$3)",[daily,id(n),n]);
 await result('connections-daily','connections',42);r=await verify('verify_brainilab_connections_result','connections-daily',rows.slice(0,3));assert.equal(r.score,2000);assert.equal(r.total_questions,3);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);await assert.rejects(()=>verify('verify_brainilab_connections_result','connections-mixed',rows),/not found/);await db.query("select set_config('request.jwt.claim.sub','',false)");await assert.rejects(()=>verify('verify_brainilab_connections_result','connections-mixed',rows),/Authentication/);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
 console.log('PASS DB Connections: wrong/correct reveal, real score, Daily/Anytime, old tabs, immutable history, malformed/duplicate input, ownership.');
 const routes=[];
 for(let n=1;n<=10;n++){await db.query("insert into number_route_puzzles values($1,array['−','×','+'])",[id(n)]);routes.push({puzzle_id:id(n),operators:['−','×','+'],attempts:1,skipped:false});}
 await result('route-valid','numberroute');r=await verify('verify_brainilab_number_route_result','route-valid',routes);assert.equal(r.score,2500);
 await result('route-invalid','numberroute');for(const operators of [[],null,['+'],['+','+','+']])await assert.rejects(()=>verify('verify_brainilab_number_route_result','route-invalid',routes.map((x,i)=>i?x:{...x,operators})),/Invalid Number Route/);
 await assert.rejects(()=>verify('verify_brainilab_number_route_result','route-invalid',null));
 await result('route-skipped','numberroute');r=await verify('verify_brainilab_number_route_result','route-skipped',routes.map(x=>({...x,operators:[],skipped:true})));assert.equal(r.score,0);assert.equal(r.correct_answers,0);
 console.log('PASS DB Number Route: valid solution, empty/null/incorrect operators rejected, skip gives zero.');
 await db.query('insert into daily_topic_rush values($1,$2)',[daily,id(600)]);await db.query('insert into topic_rush_topics values($1,2)',[id(600)]);
 for(const [i,word] of ['red','blue','green'].entries())await db.query('insert into topic_rush_answers values($1,$2,$3,$4)',[id(610+i),id(600),word,[word+' alias']]);
 await result('topic-over-target','topicrush');r=await scalar('select verify_brainilab_topic_rush_result($1,$2,$3)', ['topic-over-target',daily,JSON.stringify(['red','red alias','blue','green'])]);assert.equal(r.correct,3);assert.equal(r.total,3);assert.equal(r.score,2500);assert.equal(r.accuracy,100);
 console.log('PASS DB Topic Rush: over-target accepted, aliases deduplicated, score capped.');
 for(const [key,answers,score] of [['zero',[{position:1,answer:0}],100],['skip',[{position:1,answer:null,skipped:true}],0]]){await result('math-'+key,'mathrush');r=await scalar('select verify_brainilab_math_rush_result($1,$2,$3)',['math-'+key,'fixture',JSON.stringify(answers)]);assert.equal(r.score,score);assert.equal(r.answers_verified,true);}
 await result('math-invalid','mathrush');for(const answers of [[],null,[{position:2,answer:0}],[{position:1,answer:0},{position:1,answer:0}],[{answer:0}]])await assert.rejects(()=>scalar('select verify_brainilab_math_rush_result($1,$2,$3)',['math-invalid','fixture',JSON.stringify(answers)]));
 console.log('PASS DB Math Rush: idle timeout cannot earn rewards, zero answer, skip, sequential positions and malformed input.');
 const answers=[];
 for(let n=1;n<=30;n++){await db.query("insert into questions(id,status)values($1,'active')",[id(n)]);await db.query("insert into question_versions(id,question_id,primary_topic_id,status,difficulty)values($1,$2,$3,'published','easy')",[id(700+n),id(n),id(600)]);await db.query('insert into question_options(id,question_version_id,is_correct)values($1,$2,true)',[id(800+n),id(700+n)]);answers.push({question_version_id:id(700+n),selected_option_id:id(800+n)});}
 await result('survival-short','survival');await assert.rejects(()=>verify('verify_brainilab_survival_result','survival-short',answers.slice(0,2)),/not complete/);
 await result('survival-loss','survival');r=await verify('verify_brainilab_survival_result','survival-loss',answers.slice(0,3).map(x=>({...x,selected_option_id:null})));assert.equal(r.score,0);assert.equal(r.total_questions,3);
 await result('survival-complete','survival');r=await verify('verify_brainilab_survival_result','survival-complete',answers);assert.equal(r.correct_answers,30);
 await result('survival-after-loss','survival');await assert.rejects(()=>verify('verify_brainilab_survival_result','survival-after-loss',answers.slice(0,4).map(x=>({...x,selected_option_id:null}))),/third lost life/);
 console.log('PASS DB Survival: cannot finish early, three lives end game, full 30-question run, no answers after loss.');
}catch(error){console.error(error.message,error.where||'',error.position||'');process.exitCode=1;}finally{await db.close();}
