-- Recover only EiBi A26 language codes that were deterministically encoded in
-- station text by the old charset/text path. Source_record_id values are stable
-- EiBi source-row identities, not generated database IDs.
--
-- The official README defines field #6 as language and the source bytes are
-- Windows-1252. Correct byte parsing is implemented in tools/eibi-csv-parser.mjs.
-- Explicitly blank, structurally valid language fields remain NULL.

create temporary table _eibi_language_recovery(
  source_record_id bigint primary key,
  language_code text not null
) on commit drop;

insert into _eibi_language_recovery(source_record_id,language_code)
select unnest(array[214,215,230,231,393,394,409,410,467,475]::bigint[]),'D'
union all select unnest(array[216,217,395,396,468]::bigint[]),'AR'
union all select unnest(array[218,219,397,398,469]::bigint[]),'BU'
union all select unnest(array[220,221,399,400,470]::bigint[]),'GR'
union all select unnest(array[212,213,391,392,466]::bigint[]),'HR'
union all select unnest(array[228,229,407,408,474]::bigint[]),'PO'
union all select unnest(array[222,223,401,402,471]::bigint[]),'RU'
union all select unnest(array[224,225,403,404,472]::bigint[]),'SV'
union all select unnest(array[226,227,405,406,473]::bigint[]),'UK'
union all select unnest(array[147,5998]::bigint[]),'P';

do $$
declare
  v_expected integer := 52;
  v_candidates integer;
  v_updated integer;
begin
  select count(*) into v_candidates
  from public.station_schedules s
  join _eibi_language_recovery r using(source_record_id)
  where s.source='EiBi A26'
    and s.language_code is null
    and s.language is null;

  if v_candidates <> v_expected then
    raise exception 'EiBi language recovery precondition failed: expected %, found %',v_expected,v_candidates;
  end if;

  update public.station_schedules s
  set language=r.language_code,
      language_code=r.language_code,
      notes=concat_ws(
        ' | ',nullif(s.notes,''),
        'QA: EiBi kaynak satırındaki bozuk Unicode/ayraç dizisinden dil kodu deterministik olarak geri kazanıldı.'
      )
  from _eibi_language_recovery r
  where s.source_record_id=r.source_record_id
    and s.source='EiBi A26'
    and s.language_code is null
    and s.language is null;

  get diagnostics v_updated = row_count;
  if v_updated <> v_expected then
    raise exception 'EiBi language recovery update failed: expected %, updated %',v_expected,v_updated;
  end if;
end $$;

update public.guide_entries g
set language_content=s.language_code,
    raw=jsonb_set(
      coalesce(g.raw,'{}'::jsonb),
      '{schedule,language_code}',
      to_jsonb(s.language_code),
      true
    )
from public.station_schedules s
join _eibi_language_recovery r using(source_record_id)
where s.source='EiBi A26'
  and g.external_key='A26:EiBi A26:'||s.source_record_id::text
  and (
    nullif(g.language_content,'') is distinct from s.language_code
    or nullif(g.raw->'schedule'->>'language_code','') is distinct from s.language_code
  );
