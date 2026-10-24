begin;
-- Run in a transaction and ROLLBACK; synthetic evidence never authorises real publication.
do $test$
declare
 d jsonb; path jsonb; review jsonb; entry jsonb; payload jsonb; receipt jsonb;
 before_count integer; after_count integer; failures integer:=0; gate text;
 proof text:=repeat('a',64); stamp text:=now()::text;
begin
 if has_function_privilege('anon','brainilab_editor.publish_reviewed_release(text)','execute')
  or has_function_privilege('authenticated','brainilab_editor.publish_reviewed_release(text)','execute')
  or has_function_privilege('service_role','brainilab_editor.publish_reviewed_release(text)','execute')
 then raise exception 'Publisher is exposed';end if;
 if has_function_privilege('authenticated','brainilab_editor.automation_save_article(text,jsonb,integer,text)','execute')
  or has_function_privilege('authenticated','brainilab_editor.automation_save_path(text,text,jsonb,integer,text)','execute')
 then raise exception 'Helper exposed';end if;
 select count(*) into before_count from public.learn_publications;
 select document-array['publishedAt','updatedAt','quiz']::text[] into d from public.learn_publications where slug='what-is-an-archipelago';
 d:=d||jsonb_build_object('slug','automation-rollback-fixture','title','Synthetic rollback fixture: never publish','status','draft');
 review:=jsonb_build_object('checkedAt',stamp,'demand',jsonb_build_object('status','verified','type','external-estimate','query','SYNTHETIC TEST ONLY','market','TEST','language','en','checkedAt',stamp,'proofSha256',proof));
 foreach gate in array array['intent','novelty','sources','examples','english','metadata','links','mobile','desktop','validators'] loop
  review:=review||jsonb_build_object(gate,jsonb_build_object('status','verified','proofSha256',proof));
 end loop;
 entry:=jsonb_build_object('kind','article','slug',d->>'slug','documentText',d::text,'documentSha256',encode(sha256(convert_to(d::text,'UTF8')),'hex'),
 'expectedRevision',0,'expectedPublishedRevision',0,'expectedSnapshotHash','missing','review',review,
 'assets',jsonb_build_array(
  jsonb_build_object('width',960,'url','https://brainilabgames.com'||(d#>>'{cover,src}'),'status','verified','sha256',proof,'checkedAt',stamp),
  jsonb_build_object('width',480,'url','https://brainilabgames.com'||(d#>>'{cover,small}'),'status','verified','sha256',proof,'checkedAt',stamp),
  jsonb_build_object('width',240,'url','https://brainilabgames.com'||(d#>>'{cover,thumbnail}'),'status','verified','sha256',proof,'checkedAt',stamp)));
 payload:=jsonb_build_object('id','automation-rollback-fixture','authorisation','owner-authorised-editorial-publication-2026-10-24','backupSha256',proof,'entries',jsonb_build_array(entry));
 -- Missing demand must fail without leaving a publication or revision.
 begin
  perform brainilab_editor.publish_reviewed_release((payload#-'{entries,0,review,demand}')::text);
  raise exception 'TEST EXPECTED demand rejection';
 exception when others then if sqlerrm not like 'Specific demand evidence%' then raise;end if;end;
 -- Expired review.
 begin
  perform brainilab_editor.publish_reviewed_release(jsonb_set(payload,'{entries,0,review,checkedAt}',to_jsonb((now()-interval '2 days')::text))::text);
  raise exception 'TEST EXPECTED expiration';
 exception when others then if sqlerrm<>'Review expired' then raise;end if;end;
 -- Changed document, stale revision, missing backup, missing variant, incomplete hub.
 begin
  perform brainilab_editor.publish_reviewed_release(jsonb_set(payload,'{entries,0,documentSha256}',to_jsonb(repeat('b',64)))::text);
  raise exception 'TEST EXPECTED document hash';
 exception when others then if sqlerrm<>'Document hash mismatch' then raise;end if;end;
 begin
  perform brainilab_editor.publish_reviewed_release(jsonb_set(payload,'{entries,0,expectedRevision}','1')::text);
  raise exception 'TEST EXPECTED concurrency';
 exception when others then if sqlerrm not like 'Concurrent edit detected%' then raise;end if;end;
 begin
  perform brainilab_editor.publish_reviewed_release((payload-'backupSha256')::text);
  raise exception 'TEST EXPECTED backup';
 exception when others then if sqlerrm<>'Private backup proof required' then raise;end if;end;
 begin
  perform brainilab_editor.publish_reviewed_release((payload#-'{entries,0,assets,0}')::text);
  raise exception 'TEST EXPECTED assets';
 exception when others then if sqlerrm<>'Three cover variants required' then raise;end if;end;
 begin
  perform brainilab_editor.publish_reviewed_release(jsonb_set(payload,'{entries,0,kind}','"hub"')::text);
  raise exception 'TEST EXPECTED hub';
 exception when others then if sqlerrm<>'Hub requires ten distinct supports' then raise;end if;end;
 if exists(select 1 from public.learn_publications where slug='automation-rollback-fixture') then raise exception 'Failed release leaked';end if;
 -- Successful management release and exact retry are one revision.
 receipt:=brainilab_editor.publish_reviewed_release(payload::text);
 if receipt->>'state'<>'published-pending-public-verification' then raise exception 'Missing receipt';end if;
 receipt:=brainilab_editor.publish_reviewed_release(payload::text);
 if receipt->>'replayed'<>'true' then raise exception 'Retry not idempotent';end if;
 if (select count(*) from brainilab_editor.revisions where slug='automation-rollback-fixture')<>1 then raise exception 'Retry duplicated history';end if;
 if (select updated_by from brainilab_editor.articles where slug='automation-rollback-fixture') is not null then raise exception 'Impersonated editor';end if;
 begin
  perform brainilab_editor.publish_reviewed_release((payload||'{"backupSha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}')::text);
  raise exception 'TEST EXPECTED ID collision';
 exception when others then if sqlerrm<>'Release ID reused with changed content' then raise;end if;end;
 -- The path uses existing verified lessons, with no score/progress writes.
 select document-array['publishedAt','updatedAt']::text[] into path from public.learn_paths where slug='sky-colours';
 path:=path||'{"slug":"automation-path-rollback-fixture","status":"draft"}';
 entry:=jsonb_build_object('kind','path','slug',path->>'slug','documentText',path::text,'documentSha256',encode(sha256(convert_to(path::text,'UTF8')),'hex'),
 'expectedRevision',0,'expectedPublishedRevision',0,'expectedSnapshotHash','missing','review',review);
 receipt:=brainilab_editor.publish_reviewed_release(jsonb_build_object('id','automation-path-rollback-fixture','authorisation','owner-authorised-editorial-publication-2026-10-24','backupSha256',proof,'entries',jsonb_build_array(entry))::text);
 if not exists(select 1 from public.learn_paths where slug='automation-path-rollback-fixture') then raise exception 'Path missing';end if;
 select count(*) into after_count from public.learn_publications;
 if after_count<>before_count+1 then raise exception 'Unexpected article writes';end if;
 raise notice 'Management publisher rollback tests passed: gates, assets, concurrency, atomicity, history, no impersonation, idempotency and path publication';
end $test$;

rollback;
