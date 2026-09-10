-- Preserve existing admin authorization; reject incomplete/shifted imports.
create or replace function public.admin_create_connections_puzzle(
  p_external_key text,p_category text,p_prompt text,p_clues jsonb,
  p_correct_connection text,p_distractors jsonb,p_explanation text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid; v_id uuid; v_text text; v_pos integer:=1;
begin
  v_uid:=public.require_brainilab_admin(array['owner','editor']::text[]);
  if lower(btrim(coalesce(p_external_key,''))) !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Invalid external key'; end if;
  if jsonb_typeof(p_clues)<>'array' or jsonb_array_length(p_clues) not between 4 and 8 then raise exception 'Connections needs between 4 and 8 clues'; end if;
  if jsonb_typeof(p_distractors)<>'array' or jsonb_array_length(p_distractors)<>3 then raise exception 'Connections needs exactly 3 distractors'; end if;
  if char_length(btrim(coalesce(p_correct_connection,'')))<2 then raise exception 'Correct connection is required'; end if;

  if char_length(btrim(coalesce(p_explanation,'')))<10 then raise exception 'An explanation is required; check the CSV column alignment'; end if;
  if exists(select 1 from jsonb_array_elements_text(p_clues) q where lower(btrim(q))=lower(btrim(p_correct_connection))) then raise exception 'A clue cannot reveal the correct connection'; end if;
  if (select count(distinct lower(btrim(x))) from jsonb_array_elements_text(p_distractors || jsonb_build_array(p_correct_connection)) x)<>4 then raise exception 'All four choices must differ'; end if;
  insert into public.connections_puzzles(external_key,category,prompt,clues,explanation,is_active)
  values(lower(btrim(p_external_key)),lower(btrim(coalesce(p_category,'general'))),btrim(coalesce(p_prompt,'What connects these?')),p_clues,btrim(coalesce(p_explanation,'')),true)
  returning id into v_id;

  insert into public.connections_choices(puzzle_id,position,choice_text,is_correct) values(v_id,1,btrim(p_correct_connection),true);
  v_pos:=2;
  for v_text in select value from jsonb_array_elements_text(p_distractors) loop
    insert into public.connections_choices(puzzle_id,position,choice_text,is_correct) values(v_id,v_pos,btrim(v_text),false);
    v_pos:=v_pos+1;
  end loop;

  perform public.log_brainilab_admin_action('CONNECTIONS_PUZZLE_CREATED','connections_puzzle',v_id::text,jsonb_build_object('external_key',p_external_key));
  return jsonb_build_object('id',v_id,'created',true);
end;
$$;
revoke execute on function public.admin_create_connections_puzzle(text,text,text,jsonb,text,jsonb,text) from public,anon;
grant execute on function public.admin_create_connections_puzzle(text,text,text,jsonb,text,jsonb,text) to authenticated;

