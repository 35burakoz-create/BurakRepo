begin;

with fixes(old_name,new_name) as (values
  ('Rᤩo 9 de Julho','Rádio 9 de Julho'),
  ('Rᤩo Brasil Central','Rádio Brasil Central'),
  ('Rᤩo Clube do ParỐ','Rádio Clube do Pará'),
  ('Rᤩo Inconfidꮣia','Rádio Inconfidência'),
  ('Rᤩo Onda Sul, ParanỐ','Rádio Onda Sul, Paraná'),
  ('Rᤩo Saturno','Rádio Saturno'),
  ('Rᤩo Scalla FM','Rádio Scalla FM'),
  ('Rᤩo Voz MissionᲩa','Rádio Voz Missionária')
)
update public.canonical_stations c
set canonical_name=f.new_name,
    updated_at=now(),
    metadata=c.metadata||jsonb_build_object('name_repaired_at',now(),'name_repair','legacy_encoding')
from fixes f
where c.canonical_name=f.old_name;

with fixes(old_name,new_name) as (values
  ('Rᤩo 9 de Julho','Rádio 9 de Julho'),
  ('Rᤩo Brasil Central','Rádio Brasil Central'),
  ('Rᤩo Clube do ParỐ','Rádio Clube do Pará'),
  ('Rᤩo Inconfidꮣia','Rádio Inconfidência'),
  ('Rᤩo Onda Sul, ParanỐ','Rádio Onda Sul, Paraná'),
  ('Rᤩo Saturno','Rádio Saturno'),
  ('Rᤩo Scalla FM','Rádio Scalla FM'),
  ('Rᤩo Voz MissionᲩa','Rádio Voz Missionária')
)
update public.guide_entries g
set station=f.new_name
from fixes f
where g.station=f.old_name;

with fixes(old_name,new_name) as (values
  ('Rᤩo 9 de Julho','Rádio 9 de Julho'),
  ('Rᤩo Brasil Central','Rádio Brasil Central'),
  ('Rᤩo Clube do ParỐ','Rádio Clube do Pará'),
  ('Rᤩo Inconfidꮣia','Rádio Inconfidência'),
  ('Rᤩo Onda Sul, ParanỐ','Rádio Onda Sul, Paraná'),
  ('Rᤩo Saturno','Rádio Saturno'),
  ('Rᤩo Scalla FM','Rádio Scalla FM'),
  ('Rᤩo Voz MissionᲩa','Rádio Voz Missionária')
)
update public.station_schedules s
set station=f.new_name
from fixes f
where s.station=f.old_name;

insert into public.station_aliases(canonical_station_id,alias,source,confidence,metadata)
select c.id,c.canonical_name,'name_repair',100,jsonb_build_object('repair','legacy_encoding')
from public.canonical_stations c
where c.canonical_name in ('Rádio 9 de Julho','Rádio Brasil Central','Rádio Clube do Pará','Rádio Inconfidência','Rádio Onda Sul, Paraná','Rádio Saturno','Rádio Scalla FM','Rádio Voz Missionária')
on conflict (canonical_station_id,normalized_alias,source) do nothing;

commit;
