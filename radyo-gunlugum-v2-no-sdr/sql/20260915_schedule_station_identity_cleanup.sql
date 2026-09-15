begin;

update public.station_schedules
set station='Nemzetiségi Rádió'
where canonical_station_id is null
  and source='EiBi A26'
  and country='HNG'
  and frequency in (873,1188,1350);

update public.station_schedules
set station='Rádio Nacional AM de Brasília'
where canonical_station_id is null
  and source='EiBi A26'
  and country='B'
  and frequency=980;

update public.station_schedules
set station='Rádio Nacional da Amazônia'
where canonical_station_id is null
  and source='EiBi A26'
  and country='B'
  and frequency in (6180,11780,15145,15150);

update public.station_schedules
set station='Radio Đáp Lời Sông Núi'
where canonical_station_id is null
  and source='EiBi A26'
  and country='CLA'
  and frequency=9670;

update public.station_schedules
set station='Mısır Al-Barnameg al-Aam'
where canonical_station_id is null
  and source='Tecsun R-9012 MW rehberi'
  and frequency=819
  and station='Al-Barnameg al-Aam';

update public.station_schedules
set station='ERT News Radio, Atina'
where canonical_station_id is null
  and source='Tecsun R-9012 MW rehberi'
  and frequency=729
  and station='ERT News Radio';

update public.station_schedules
set station='Suudi Arabistan Radyosu'
where canonical_station_id is null
  and source='Tecsun R-9012 A26 rehberi'
  and country='Suudi Arabistan'
  and station='Saudi Radio';

update public.station_schedules
set station='Romanya Radio România Actualități; Suudi Quran Radio'
where canonical_station_id is null
  and source='Tecsun R-9012 MW rehberi'
  and frequency=855
  and station='Radio România Actualități / Saudi Quran Radio';

update public.station_schedules
set station='TRT Radyo 1 Torbalı (düzensiz); Cezayir Adrar; Suudi Radio Jeddah'
where canonical_station_id is null
  and source='Tecsun R-9012 MW rehberi'
  and frequency=927
  and station='TRT Radyo 1 Torbalı / gece uzak istasyon adayları';

update public.station_schedules
set station='TRT Radyo 1 Trabzon; İspanya Onda Cero Madrid; Çekya Country Radio'
where canonical_station_id is null
  and source='Tecsun R-9012 MW rehberi'
  and frequency=954
  and station='TRT Radyo 1 Trabzon / gece Avrupa adayları';

commit;
