-- V41.11: repair the shifted Connections CSV batch without changing puzzle/choice IDs.
-- Keep original content for rollback; do not rewrite historical player results.
begin;
create table if not exists public.connections_repair_backup_v4111 (
 puzzle_id uuid primary key, puzzle jsonb not null, choices jsonb not null,
 backed_up_at timestamptz not null default now()
);
alter table public.connections_repair_backup_v4111 enable row level security;
revoke all on public.connections_repair_backup_v4111 from anon, authenticated;
insert into public.connections_repair_backup_v4111(puzzle_id,puzzle,choices)
select p.id,to_jsonb(p),(select jsonb_agg(to_jsonb(c) order by c.position) from public.connections_choices c where c.puzzle_id=p.id)
from public.connections_puzzles p where p.is_active and btrim(p.explanation)=''
on conflict(puzzle_id) do nothing;
do $$
declare r record; recovered integer:=0; quarantined integer:=0;
begin
 for r in select p.*, c1.choice_text as old1,c2.choice_text as old2,c3.choice_text as old3,c4.choice_text as old4
 from public.connections_puzzles p
 join public.connections_choices c1 on c1.puzzle_id=p.id and c1.position=1 and c1.is_correct
 join public.connections_choices c2 on c2.puzzle_id=p.id and c2.position=2 and not c2.is_correct
 join public.connections_choices c3 on c3.puzzle_id=p.id and c3.position=3 and not c3.is_correct
 join public.connections_choices c4 on c4.puzzle_id=p.id and c4.position=4 and not c4.is_correct
 where p.is_active and btrim(p.explanation)=''
 loop
  if char_length(r.old4)<15 then raise exception 'Unexpected explanation field for %',r.external_key; end if;
  if jsonb_array_length(r.clues)=4 then
   -- Three real clues plus the misplaced answer cannot meet the four-clue rule.
   update public.connections_puzzles set is_active=false,updated_at=now() where id=r.id;
   quarantined:=quarantined+1;
  else
   update public.connections_puzzles set clues=r.clues - (jsonb_array_length(r.clues)-1),explanation=r.old4,updated_at=now() where id=r.id;
   update public.connections_choices set choice_text=case position when 1 then r.clues->>(jsonb_array_length(r.clues)-1) when 2 then r.old1 when 3 then r.old2 when 4 then r.old3 end where puzzle_id=r.id;
   recovered:=recovered+1;
  end if;
 end loop;
 if recovered+quarantined not in (0,91) then raise exception 'Unexpected batch size: %',recovered+quarantined; end if;
 if exists(select 1 from public.connections_puzzles where is_active and btrim(explanation)='') then raise exception 'Unrepaired active rows'; end if;
 if (select count(*) from public.connections_puzzles where is_active)<20 then raise exception 'Insufficient active Connections pool'; end if;
end $$;
commit;
select count(*) filter(where is_active) as active_puzzles, count(*) filter(where not is_active) as inactive_puzzles, count(*) filter(where is_active and btrim(explanation)='') as active_missing_explanation from public.connections_puzzles;
