-- Share only the equipped, canonically XP-unlocked title via existing avatar_style.
-- Public/friend/group RPCs and all score/XP/visibility logic stay untouched.
begin;
do $cas$ begin
  if (select md5(pg_get_functiondef('brainilab_private.player_avatar(uuid)'::regprocedure))) is distinct from '97d3a8559719901da3829130430ea03c' then
    raise exception 'Concurrent avatar helper edit';
  end if;
end $cas$;
CREATE OR REPLACE FUNCTION brainilab_private.player_avatar(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_catalog constant jsonb := '{"mode":[["picture",0],["built",0]],"skin":[["sand",0],["peach",0],["honey",0],["cocoa",0],["umber",0],["ebony",0]],"hair":[["sweep",0],["curls",0],["bob",0],["crop",0],["bald",0],["ponytail",0],["waves",0],["braids",0]],"hairColor":[["brown",0],["black",0],["blond",0],["auburn",0],["silver",0]],"shirt":[["navy",0],["green",0],["orange",0],["blue",0],["berry",0]],"background":[["lilac",0],["sky",0],["sage",0],["sunshine",0],["coral",0]],"glasses":[["none",0],["round",150],["square",600],["sun",1000],["star",3500],["visor",5000]],"hat":[["none",0],["beanie",500],["egg",1200],["cap",1500],["cloud",4000],["wizard",6000],["graduate",8000]],"prop":[["none",0],["cookie",300],["icepop",800],["peas",1800],["bulb",2500],["pencil",4500],["rocket",7000],["book",9000]],"frame":[["level",0],["blue",100],["green",500],["copper",1500],["gold",3000],["orbit",6000]]}'::jsonb;
  v_titles constant jsonb := '[["none",0],["explorer",250],["curious",750],["detective",2000],["thinker",4500],["sage",10000]]'::jsonb;
  v_title text := 'none';
  v_meta jsonb; v_xp bigint; v_key text; v_choices jsonb; v_item jsonb;
  v_value text; v_default text; v_cost integer; v_render_xp integer := 0; v_frame_cost integer := 0;
  v_design jsonb := '{}'::jsonb; v_frame text := 'level';
begin
  select coalesce(u.raw_user_meta_data,'{}'::jsonb),greatest(0,coalesce(pp.xp,0))
  into v_meta,v_xp from auth.users u left join public.player_progression pp on pp.user_id=u.id
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
    if v_cost is null or v_cost>v_xp then v_value:=v_default; v_cost:=0; end if;
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
  if v_design->>'mode'<>'built' and v_frame='level' and v_title='none' then return null; end if;
  if v_design->>'mode'<>'built' then v_render_xp:=v_frame_cost; end if;
  -- render_xp is only the minimum threshold needed to render these unlocked items.
  -- The public ranking receives neither total XP, auth metadata, email nor user ID.
  return pg_catalog.jsonb_build_object('design',case when v_design->>'mode'='built' then v_design else null end,
    'frame',v_frame,'render_xp',v_render_xp,'title',v_title);
end;
$function$
;
-- CREATE OR REPLACE preserves the private helper's existing owner and ACL.
commit;
