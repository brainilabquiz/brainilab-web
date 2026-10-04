import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href),db=new PGlite();
const uid='10000000-0000-4000-8000-000000000001',id=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
try{
 await db.exec(`create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table connections_puzzles(id uuid,external_key text,category text,prompt text,clues jsonb,is_active boolean default true);
 create table connections_choices(id uuid,puzzle_id uuid,choice_text text,is_correct boolean);
 create table player_connections_history(user_id uuid,puzzle_id uuid,times_played int,last_played_at timestamptz);
 create table sequence_puzzles(id uuid,external_key text,category text,sequence_values numeric[],options numeric[],is_active boolean default true);
 create table player_sequence_history(user_id uuid,puzzle_id uuid,times_played int,last_played_at timestamptz);`);
 const migration=(await readFile('supabase/migrations/20261004102308_deduplicate_anytime_puzzles.sql','utf8')).replace(/do \$guard\$[\s\S]*?end;\$guard\$;/,'');await db.exec(migration);
 // Two copies of one puzzle plus enough distinct puzzles for a full game.
 for(let n=0;n<22;n++){
  const group=n<2?0:n;
  await db.query("insert into connections_puzzles(id,external_key,category,prompt,clues) values($1,$2,'test','Connect these',$3)",[id(n),'p'+String(n).padStart(2,'0'),JSON.stringify([group,'a','b','c'])]);
  for(let j=0;j<4;j++)await db.query('insert into connections_choices values($1,$2,$3,$4)',[id(100+n*4+j),id(n),'Choice '+j,j===0]);
  if(n<12)await db.query("insert into sequence_puzzles(id,external_key,category,sequence_values,options)values($1,$2,'test',$3,array[1,2,3,4])",[id(n),'p'+String(n).padStart(2,'0'),[group,group+1,group+2]]);
 }
 const draw=game=>scalar('select get_brainilab_'+game+'_game()');
 for(let i=0;i<20;i++)for(const [game,count,field]of [['connections',20,'clues'],['sequence',10,'sequence']]){
  const result=await draw(game);assert.equal(result.puzzles.length,count);assert.equal(new Set(result.puzzles.map(x=>JSON.stringify(x[field]))).size,count);
 }
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
 for(const game of ['connections','sequence']){
  await db.query(`insert into player_${game}_history values($1,$2,8,now())`,[uid,id(1)]);
  const result=await draw(game);assert.ok(result.puzzles.every(x=>x.puzzle_id!==id(0)&&x.puzzle_id!==id(1)),'A played duplicate cannot bypass history: '+game);
 }
 await db.query("select set_config('request.jwt.claim.sub','',false)");
 for(const game of ['connections','sequence']){
  const result=await scalar(`select get_brainilab_${game}_game($1::uuid[])`,[[id(1)]]);
  assert.ok(result.puzzles.every(x=>x.puzzle_id!==id(0)&&x.puzzle_id!==id(1)),'Guest exclusion follows both aliases: '+game);
 }
 assert.equal(await scalar('select count(*) from connections_puzzles'),22,'History content stays available');
 console.log('PASS: 40 full draws without duplicate visible puzzles; registered and guest histories combine duplicate aliases; content remains intact.');
}finally{await db.close();}
