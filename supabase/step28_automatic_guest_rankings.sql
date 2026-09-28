-- BrainiLab Step 28: automatic public aliases + persistent guest players.
-- Apply after Step 27, then enable Anonymous Sign-Ins in Supabase Auth.
begin;

alter table public.profiles
  alter column leaderboard_enabled set default true,
  add column if not exists leaderboard_visibility_explicit boolean not null default false,
  add column if not exists guest_claimed_by uuid references auth.users(id);

-- Existing public names were chosen explicitly. Preserve those identities.
update public.profiles set leaderboard_visibility_explicit=true
where leaderboard_display_name is not null;

create or replace function public.brainilab_ranking_profile_defaults()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_guest boolean;
begin
  if tg_op='UPDATE' and auth.uid()=old.user_id then
    if old.guest_claimed_by is not null then
      raise exception 'Guest progress has already been linked to an account';
    end if;
  end if;
  if new.leaderboard_enabled and nullif(btrim(new.leaderboard_display_name),'') is null then
    select u.is_anonymous into v_guest from auth.users u where u.id=new.user_id;
    -- Never publish an email-derived name, OAuth full name or user UUID by default.
    new.leaderboard_display_name:=case when coalesce(v_guest,false) then 'Guest ' else 'Player ' end
      || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    if tg_op='INSERT' and coalesce(v_guest,false) then
      new.display_name:=new.leaderboard_display_name;
      new.avatar_url:=null;
      new.country_code:=null;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.brainilab_ranking_profile_defaults() from public,anon,authenticated;
create trigger brainilab_ranking_profile_defaults
before insert or update on public.profiles for each row
execute function public.brainilab_ranking_profile_defaults();

-- Visibility changes are explicit only through this user-scoped RPC. Automatic
-- activation must not accidentally publish the private OAuth profile photo.
revoke update(leaderboard_enabled,leaderboard_display_name) on public.profiles from authenticated;
create or replace function public.set_brainilab_ranking_visibility(p_enabled boolean,p_display_name text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile public.profiles%rowtype; v_name text:=nullif(btrim(p_display_name),'');
begin
  if auth.uid() is null or p_enabled is null then raise exception 'Authentication required'; end if;
  if v_name is not null and char_length(v_name) not between 2 and 30 then
    raise exception 'Ranking name must be between 2 and 30 characters';
  end if;
  update public.profiles set leaderboard_enabled=p_enabled,
    leaderboard_display_name=coalesce(v_name,leaderboard_display_name),
    leaderboard_visibility_explicit=true
  where user_id=auth.uid() and guest_claimed_by is null returning * into v_profile;
  if not found then raise exception 'Player profile unavailable'; end if;
  return to_jsonb(v_profile);
end $$;
revoke all on function public.set_brainilab_ranking_visibility(boolean,text) from public,anon;
grant execute on function public.set_brainilab_ranking_visibility(boolean,text) to authenticated;

create table public.brainilab_guest_claims (
  guest_user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz
);
alter table public.brainilab_guest_claims enable row level security;
revoke all on public.brainilab_guest_claims from anon,authenticated;

create or replace function public.prepare_brainilab_guest_claim(p_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();
begin
  if not exists(select 1 from auth.users where id=v_uid and is_anonymous=true)
     or p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'A guest session and a valid claim token are required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('brainilab-player:'||v_uid::text,0));
  if exists(select 1 from public.profiles where user_id=v_uid and guest_claimed_by is not null) then
    raise exception 'Guest progress has already been linked to an account';
  end if;
  insert into public.brainilab_guest_claims(guest_user_id,token_hash,expires_at)
  values(v_uid,encode(sha256(convert_to(p_token,'UTF8')),'hex'),now()+interval '30 days')
  on conflict(guest_user_id) do update
    set token_hash=excluded.token_hash,expires_at=excluded.expires_at;
  return jsonb_build_object('prepared',true);
end $$;
revoke all on function public.prepare_brainilab_guest_claim(text) from public,anon;
grant execute on function public.prepare_brainilab_guest_claim(text) to authenticated;

create or replace function public.brainilab_auto_rank_completed_player()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('brainilab-player:'||new.user_id::text,0));
  if exists(select 1 from public.profiles where user_id=new.user_id and guest_claimed_by is not null) then
    raise exception 'Guest progress has already been linked to an account';
  end if;
  if coalesce((new.result_payload->>'practice')::boolean,false)
     or coalesce((new.result_payload->>'tryFirst')::boolean,false) then
    raise exception 'Practice games do not submit ranked results';
  end if;
  -- Existing accounts become visible on their next completed game. A later
  -- deliberate Hide action remains respected on subsequent games.
  update public.profiles set leaderboard_enabled=true
  where user_id=new.user_id and not leaderboard_enabled
    and not leaderboard_visibility_explicit;
  return new;
end $$;
revoke all on function public.brainilab_auto_rank_completed_player() from public,anon,authenticated;
create trigger brainilab_auto_rank_completed_player
before insert on public.game_results for each row
execute function public.brainilab_auto_rank_completed_player();

-- Serialize session creation with account claiming before the existing Daily lock.
create or replace function public.brainilab_lock_player_session()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('brainilab-player:'||new.user_id::text,0));
  if exists(select 1 from public.profiles where user_id=new.user_id and guest_claimed_by is not null) then
    raise exception 'Guest progress has already been linked to an account';
  end if;
  return new;
end $$;
revoke all on function public.brainilab_lock_player_session() from public,anon,authenticated;
create trigger brainilab_lock_player_session before insert on public.game_sessions
for each row execute function public.brainilab_lock_player_session();

create or replace function public.claim_brainilab_guest_results(p_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid();
  v_claim public.brainilab_guest_claims%rowtype;
  v_sessions uuid[];
  v_skipped text[];
begin
  if not exists(select 1 from auth.users where id=v_uid and is_anonymous=false)
     or p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'Sign in to link guest progress';
  end if;
  select * into v_claim from public.brainilab_guest_claims
  where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
  if not found then raise exception 'Guest claim not found'; end if;
  if v_claim.claimed_by is not null then
    if v_claim.claimed_by=v_uid then return jsonb_build_object('claimed',true,'already_claimed',true); end if;
    raise exception 'Guest progress belongs to another account';
  end if;
  if v_claim.expires_at<now() then raise exception 'Guest claim expired'; end if;
  if not exists(select 1 from auth.users where id=v_claim.guest_user_id and is_anonymous=true) then
    raise exception 'Only guest progress can be linked';
  end if;
  -- Deterministic order also prevents two claims deadlocking over one account.
  perform pg_advisory_xact_lock(hashtextextended('brainilab-player:'||least(v_uid::text,v_claim.guest_user_id::text),0));
  perform pg_advisory_xact_lock(hashtextextended('brainilab-player:'||greatest(v_uid::text,v_claim.guest_user_id::text),0));

  select coalesce(array_agg(gs.id),array[]::uuid[]) into v_sessions
  from public.game_sessions gs where gs.user_id=v_claim.guest_user_id
    and not exists(select 1 from public.game_sessions target where target.user_id=v_uid
      and (target.client_result_id=gs.client_result_id or
        (gs.daily_number is not null and target.daily_number=gs.daily_number
          and target.game_id=gs.game_id and target.status='completed')));
  select coalesce(array_agg(gs.client_result_id),array[]::text[]) into v_skipped
  from public.game_sessions gs where gs.user_id=v_claim.guest_user_id and not(gs.id=any(v_sessions));

  -- The signed-in account's already-completed Daily wins. Duplicate guest rows
  -- remain as history on the retired guest, rather than scoring twice.
  update public.game_sessions set user_id=v_uid where id=any(v_sessions);
  update public.game_answers set user_id=v_uid where session_id=any(v_sessions);
  update public.verified_question_answers set user_id=v_uid where session_id=any(v_sessions);
  update public.game_results set user_id=v_uid where session_id=any(v_sessions);
  insert into public.player_connections_history(user_id,puzzle_id,times_played,first_played_at,last_played_at)
  select v_uid,puzzle_id,times_played,first_played_at,last_played_at
  from public.player_connections_history where user_id=v_claim.guest_user_id
  on conflict(user_id,puzzle_id) do update set
    times_played=player_connections_history.times_played+excluded.times_played,
    first_played_at=least(player_connections_history.first_played_at,excluded.first_played_at),
    last_played_at=greatest(player_connections_history.last_played_at,excluded.last_played_at);
  update public.content_play_sessions cps set user_id=v_uid
  where cps.user_id=v_claim.guest_user_id and not exists(
    select 1 from public.content_play_sessions target
    where target.user_id=v_uid and target.client_play_id=cps.client_play_id);

  update public.profiles set leaderboard_enabled=false,guest_claimed_by=v_uid
  where user_id=v_claim.guest_user_id;
  if cardinality(v_sessions)>0 then
    update public.profiles set leaderboard_enabled=true
    where user_id=v_uid and not leaderboard_enabled and not leaderboard_visibility_explicit;
  end if;
  perform public.refresh_brainilab_player_progression(v_claim.guest_user_id);
  perform public.refresh_brainilab_player_progression(v_uid);
  perform public.refresh_brainilab_player_analytics(v_claim.guest_user_id);
  perform public.refresh_brainilab_player_analytics(v_uid);
  update public.brainilab_guest_claims set claimed_by=v_uid,claimed_at=now()
  where guest_user_id=v_claim.guest_user_id;
  return jsonb_build_object('claimed',true,'transferred',cardinality(v_sessions),'skipped_client_result_ids',v_skipped);
end $$;
revoke all on function public.claim_brainilab_guest_results(text) from public,anon;
grant execute on function public.claim_brainilab_guest_results(text) to authenticated;

-- Ranking function is appended below before COMMIT.

create or replace function public.get_brainilab_individual_rankings(
  p_region text default 'global',
  p_country_code text default null,
  p_period text default 'daily',
  p_game_id text default 'all',
  p_metric text default 'score',
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_me uuid:=auth.uid();
  v_region text:=lower(coalesce(p_region,'global'));
  v_country text:=upper(nullif(btrim(coalesce(p_country_code,'')),''));
  v_period text:=lower(coalesce(p_period,'daily'));
  v_game text:=lower(coalesce(p_game_id,'all'));
  v_metric text:=lower(coalesce(p_metric,'score'));
  v_limit integer:=least(100,greatest(10,coalesce(p_limit,100)));
  v_my_country text;
  v_my_enabled boolean:=false;
  v_my_public_name text;
  v_rows jsonb;
  v_user jsonb;
  v_total integer:=0;
  v_user_eligible boolean:=false;
begin
  if v_region not in ('global','country') then
    raise exception 'Invalid ranking region';
  end if;

  if v_period not in ('daily','weekly','monthly') then
    raise exception 'Invalid ranking period';
  end if;

  if v_metric not in ('score','streak') then
    raise exception 'Invalid ranking metric';
  end if;

  if v_me is not null then
    select
      p.country_code,
      p.leaderboard_enabled,
      p.leaderboard_display_name
    into
      v_my_country,
      v_my_enabled,
      v_my_public_name
    from public.profiles p
    where p.user_id=v_me;

    if v_country is null then
      v_country:=v_my_country;
    end if;
  end if;

  if v_region='country'
     and (v_country is null or v_country !~ '^[A-Z]{2}$') then
    return jsonb_build_object(
      'rows','[]'::jsonb,
      'user',null,
      'total_players',0,
      'metric_label',case
        when v_metric='streak' then 'Streak'
        when v_game='all' then 'Brain Score'
        when v_game in ('brainmix','flagdash','maphunt','topicrush','brainiword')
          then 'Daily points'
        else 'Points'
      end,
      'leaderboard_enabled',v_my_enabled,
      'leaderboard_display_name',v_my_public_name,
      'user_eligible',false,
      'country_required',true,
      'my_country',v_my_country,
      'generated_at',now()
    );
  end if;

  with candidates as (
    select
      p.user_id,
      p.leaderboard_display_name as public_name,
      p.country_code,
      case when p.leaderboard_visibility_explicit then p.avatar_url else null end as avatar_url,
      public.brainilab_player_rank_value(
        p.user_id,
        v_period,
        v_game,
        v_metric
      ) as rank_value
    from public.profiles p
    where p.leaderboard_enabled=true
      and p.guest_claimed_by is null
      and p.leaderboard_display_name is not null
      and char_length(btrim(p.leaderboard_display_name))>=2
      and (
        v_region='global'
        or p.country_code=v_country
      )
      and not exists(
        select 1
        from public.admin_ranking_suspensions ars
        where ars.entity_type='user'
          and ars.entity_id=p.user_id
          and ars.active=true
          and (
            ars.expires_at is null
            or ars.expires_at>now()
          )
      )
  ),
  eligible as (
    select *
    from candidates
    where rank_value>0 or (v_metric='score' and exists(
      select 1 from public.game_sessions gs
      join public.game_results gr on gr.session_id=gs.id
      where gs.user_id=candidates.user_id and gs.status='completed'
        and not coalesce((gr.result_payload->>'practice')::boolean,false)
        and (gs.completed_at at time zone 'UTC')::date between
          case v_period when 'weekly' then date_trunc('week',now() at time zone 'UTC')::date
            when 'monthly' then date_trunc('month',now() at time zone 'UTC')::date
            else (now() at time zone 'UTC')::date end
          and (now() at time zone 'UTC')::date
        and ((v_game='all' and gs.daily_number is not null) or gs.game_id=v_game)
    ))
  ),
  ranked as (
    select
      e.*,
      row_number() over(
        order by
          e.rank_value desc,
          lower(e.public_name),
          e.user_id
      ) as rank
    from eligible e
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'rank',r.rank,
          'name',r.public_name,
          'country',r.country_code,
          'avatar_url',r.avatar_url,
          'avatar',upper(left(r.public_name,1)),
          'score',r.rank_value,
          'level',coalesce((
            select pp_level.level
            from public.player_progression pp_level
            where pp_level.user_id=r.user_id
          ),1),
          'streak',case
            when v_metric='streak' then r.rank_value
            else (
              select coalesce(pp.current_streak,0)
              from public.player_progression pp
              where pp.user_id=r.user_id
            )
          end,
          'display_value',case
            when v_metric='streak'
              then r.rank_value::text||' days'
            else to_char(r.rank_value,'FM999G999G999G990')
          end,
          'is_me',r.user_id=v_me
        )
        order by r.rank
      ) filter(where r.rank<=v_limit),
      '[]'::jsonb
    ),
    count(*)::integer,
    (
      select jsonb_build_object(
        'rank',mine.rank,
        'name',mine.public_name,
        'country',mine.country_code,
        'avatar_url',mine.avatar_url,
        'avatar',upper(left(mine.public_name,1)),
        'score',mine.rank_value,
        'level',coalesce((
          select pp_level.level
          from public.player_progression pp_level
          where pp_level.user_id=mine.user_id
        ),1),
        'streak',case
          when v_metric='streak' then mine.rank_value
          else (
            select coalesce(pp.current_streak,0)
            from public.player_progression pp
            where pp.user_id=mine.user_id
          )
        end,
        'display_value',case
          when v_metric='streak'
            then mine.rank_value::text||' days'
          else to_char(mine.rank_value,'FM999G999G999G990')
        end,
        'is_me',true
      )
      from ranked mine
      where mine.user_id=v_me
      limit 1
    ),
    exists(
      select 1 from ranked mine
      where mine.user_id=v_me
    )
  into
    v_rows,
    v_total,
    v_user,
    v_user_eligible
  from ranked r;

  return jsonb_build_object(
    'rows',v_rows,
    'user',v_user,
    'total_players',v_total,
    'metric_label',case
      when v_metric='streak' then 'Streak'
      when v_game='all' then 'Brain Score'
      when v_game in ('brainmix','flagdash','maphunt','topicrush','brainiword')
        then 'Daily points'
      else 'Points'
    end,
    'leaderboard_enabled',v_my_enabled,
    'leaderboard_display_name',v_my_public_name,
    'user_eligible',v_user_eligible,
    'region',v_region,
    'country',v_country,
    'my_country',v_my_country,
    'period',v_period,
    'game_id',v_game,
    'generated_at',now()
  );
end;
$$;

commit;
