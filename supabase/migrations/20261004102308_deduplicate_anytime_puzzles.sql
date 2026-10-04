-- Select one representative per visible puzzle; combine history across duplicate records.
-- Do not delete or deactivate content referenced by Daily archives.
begin;
do $guard$ begin
 if exists(select 1 from (values ('get_brainilab_connections_game','8022652df12753ec04855fb2db3dffc3'),('get_brainilab_sequence_game','b6591c797e9a132b64eed239da649d46')) expected(name,fingerprint)
 left join pg_proc p on p.proname=expected.name and p.pronamespace='public'::regnamespace
 where p.oid is null or md5(pg_get_functiondef(p.oid))<>expected.fingerprint)
 then raise exception 'Puzzle selector changed since audit; rebase this migration';end if;
end;$guard$;
CREATE OR REPLACE FUNCTION public.get_brainilab_connections_game(p_exclude_puzzle_ids uuid[] DEFAULT ARRAY[]::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_puzzles jsonb;
begin
  with canonical as (
    select distinct on (cp.clues) cp.*
    from public.connections_puzzles cp
    where cp.is_active and (select count(*) from public.connections_choices cc where cc.puzzle_id=cp.id)=4
      and (select count(*) from public.connections_choices cc where cc.puzzle_id=cp.id and cc.is_correct)=1
    order by cp.clues,cp.external_key,cp.id
  ), ranked as (
    select
      cp.*,
      coalesce(ph.times_played,0)
        +case
          when exists(select 1 from public.connections_puzzles duplicate where duplicate.clues=cp.clues and duplicate.id=any(coalesce(p_exclude_puzzle_ids,array[]::uuid[]))) then 1
          else 0
        end as effective_play_count,
      case
        when exists(select 1 from public.connections_puzzles duplicate where duplicate.clues=cp.clues and duplicate.id=any(coalesce(p_exclude_puzzle_ids,array[]::uuid[]))) then now()
        else ph.last_played_at
      end as effective_last_played
    from canonical cp
    left join lateral (
      select sum(h.times_played) as times_played,max(h.last_played_at) as last_played_at
      from public.player_connections_history h join public.connections_puzzles duplicate on duplicate.id=h.puzzle_id
      where v_uid is not null and h.user_id=v_uid and duplicate.clues=cp.clues
    ) ph on true
    where cp.is_active=true
      and (
        select count(*)
        from public.connections_choices cc
        where cc.puzzle_id=cp.id
      )=4
    order by
      effective_play_count asc,
      effective_last_played asc nulls first,
      random()
    limit 20
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'puzzle_id',r.id,
        'external_key',r.external_key,
        'category',r.category,
        'prompt',r.prompt,
        'clues',r.clues,
        'choices',(
          select jsonb_agg(
            jsonb_build_object('id',x.id,'text',x.choice_text)
          )
          from (
            select cc.id,cc.choice_text
            from public.connections_choices cc
            where cc.puzzle_id=r.id
            order by random()
          ) x
        )
      )
    ),
    '[]'::jsonb
  )
  into v_puzzles
  from ranked r;

  return jsonb_build_object(
    'rounds',20,
    'puzzles',v_puzzles
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_brainilab_sequence_game(p_exclude_puzzle_ids uuid[] DEFAULT ARRAY[]::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid:=auth.uid(); v_payload jsonb;
begin
  with canonical as (
    select distinct on (p.sequence_values) p.*
    from public.sequence_puzzles p where p.is_active
    order by p.sequence_values,p.external_key,p.id
  ), ranked as (
    select p.*,
      coalesce(h.times_played,0)+case when exists(select 1 from public.sequence_puzzles duplicate where duplicate.sequence_values=p.sequence_values and duplicate.id=any(coalesce(p_exclude_puzzle_ids,array[]::uuid[]))) then 1 else 0 end as play_weight,
      case when exists(select 1 from public.sequence_puzzles duplicate where duplicate.sequence_values=p.sequence_values and duplicate.id=any(coalesce(p_exclude_puzzle_ids,array[]::uuid[]))) then now() else h.last_played_at end as last_weight
    from canonical p
    left join lateral (
      select sum(history.times_played) as times_played,max(history.last_played_at) as last_played_at
      from public.player_sequence_history history join public.sequence_puzzles duplicate on duplicate.id=history.puzzle_id
      where v_uid is not null and history.user_id=v_uid and duplicate.sequence_values=p.sequence_values
    ) h on true
    where p.is_active=true
    order by play_weight,last_weight asc nulls first,random()
    limit 10
  )
  select jsonb_build_object('puzzles',coalesce(jsonb_agg(jsonb_build_object(
    'puzzle_id',r.id,'external_key',r.external_key,'category',r.category,'sequence',to_jsonb(r.sequence_values),
    'options',(select jsonb_agg(x order by md5(x::text||':'||r.id::text)) from unnest(r.options) x)
  )),'[]'::jsonb)) into v_payload from ranked r;
  return v_payload;
end;$function$;

commit;
