-- MW night-DX scoring should follow the listener's actual sunset/sunrise,
-- not a fixed 18:00–07:00 wall-clock window. The solar calculation is local,
-- deterministic and depends only on UTC instant + selected listening coordinates.

create or replace function public.radio_solar_elevation_deg(
  p_at timestamptz,
  p_lat numeric,
  p_lon numeric
)
returns numeric
language plpgsql
immutable
strict
set search_path to ''
as $$
declare
  v_jd double precision;
  v_n double precision;
  v_l double precision;
  v_g double precision;
  v_lambda double precision;
  v_epsilon double precision;
  v_alpha double precision;
  v_delta double precision;
  v_gmst double precision;
  v_lst double precision;
  v_hour_angle double precision;
  v_elevation double precision;
begin
  if p_lat not between -90 and 90 or p_lon not between -180 and 180 then
    return null;
  end if;

  v_jd := extract(epoch from p_at)::double precision / 86400.0 + 2440587.5;
  v_n := v_jd - 2451545.0;

  v_l := 280.46 + 0.9856474 * v_n;
  v_l := v_l - floor(v_l / 360.0) * 360.0;
  v_g := 357.528 + 0.9856003 * v_n;
  v_g := v_g - floor(v_g / 360.0) * 360.0;

  v_lambda := v_l
    + 1.915 * sin(radians(v_g))
    + 0.020 * sin(radians(2.0 * v_g));
  v_epsilon := 23.439 - 0.0000004 * v_n;

  v_alpha := degrees(atan2(
    cos(radians(v_epsilon)) * sin(radians(v_lambda)),
    cos(radians(v_lambda))
  ));
  if v_alpha < 0 then v_alpha := v_alpha + 360.0; end if;

  v_delta := degrees(asin(
    sin(radians(v_epsilon)) * sin(radians(v_lambda))
  ));

  v_gmst := 280.46061837 + 360.98564736629 * (v_jd - 2451545.0);
  v_gmst := v_gmst - floor(v_gmst / 360.0) * 360.0;
  v_lst := v_gmst + p_lon::double precision;
  v_lst := v_lst - floor(v_lst / 360.0) * 360.0;

  v_hour_angle := v_lst - v_alpha;
  if v_hour_angle > 180 then v_hour_angle := v_hour_angle - 360.0; end if;
  if v_hour_angle < -180 then v_hour_angle := v_hour_angle + 360.0; end if;

  v_elevation := degrees(asin(
    sin(radians(p_lat::double precision)) * sin(radians(v_delta))
    + cos(radians(p_lat::double precision)) * cos(radians(v_delta)) * cos(radians(v_hour_angle))
  ));

  return round(v_elevation::numeric,6);
end;
$$;

revoke all on function public.radio_solar_elevation_deg(timestamptz,numeric,numeric) from public, anon;
grant execute on function public.radio_solar_elevation_deg(timestamptz,numeric,numeric) to authenticated, service_role;

comment on function public.radio_solar_elevation_deg(timestamptz,numeric,numeric) is
'Approximate solar-center elevation in degrees for MW day/night scoring. Uses UTC instant and listener coordinates; no external service dependency.';

create or replace function public.radio_mw_now_candidates(p_limit integer default 60)
returns table(
  schedule_id uuid,
  frequency numeric,
  station text,
  canonical_name text,
  country text,
  tx_site_code text,
  transmitter_site_name text,
  power_kw numeric,
  distance_km numeric,
  bearing_deg numeric,
  bearing_direction text,
  reception_class text,
  active_now boolean,
  personal_adjustment integer,
  score integer,
  score_explanation text
)
language plpgsql
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text := 'Europe/Istanbul';
  v_country text;
  v_now timestamptz := now();
  v_hour integer;
  v_month integer;
  v_block integer;
  v_night boolean;
  v_solar_elevation numeric;
  v_lat numeric;
  v_lon numeric;
  v_location_hash text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;

  select latitude,longitude,timezone,country_code into v_lat,v_lon,v_tz,v_country
  from public.radio_current_listening_location where user_id=v_uid;

  v_tz := coalesce(v_tz,'Europe/Istanbul');
  v_hour := extract(hour from (v_now at time zone v_tz))::int;
  v_month := extract(month from (v_now at time zone v_tz))::int;
  v_block := (floor(extract(hour from (v_now at time zone v_tz))/4)*4)::int;
  v_location_hash := case when v_lat is not null and v_lon is not null then md5(round(v_lat,5)::text||':'||round(v_lon,5)::text) else null end;

  begin perform public.radio_refresh_transmitter_geometry_cache(); exception when others then null; end;

  v_solar_elevation := public.radio_solar_elevation_deg(v_now,v_lat,v_lon);
  v_night := case
    when v_solar_elevation is not null then v_solar_elevation <= -0.833
    else (v_hour>=18 or v_hour<7)
  end;

  return query
  with active_ids as materialized (
    select a.id from public.station_schedules_active a where a.band='MW'
  ), ps as materialized (
    select s.* from public.personal_transmitter_propagation_stats s
    where s.user_id=v_uid and s.band='MW' and s.month=v_month and s.hour_block_start=v_block
  ), pf as materialized (
    select s.* from public.personal_frequency_propagation_stats s
    where s.user_id=v_uid and s.band='MW' and s.month=v_month and s.hour_block_start=v_block
  ), pb as materialized (
    select s.* from public.personal_propagation_stats s
    where s.user_id=v_uid and s.band='MW' and s.month=v_month and s.hour_block_start=v_block
  ), base as (
    select
      m.id,m.frequency,m.station,m.canonical_name,m.country,m.tx_site_code,m.transmitter_site_name,m.power_kw,
      m.canonical_station_id,m.transmitter_site_id,
      g.distance_km,g.bearing_deg,g.bearing_cardinal as bearing_direction,
      (ai.id is not null) as eibi_active,
      coalesce(m.official_service_active_now,false) as official_active,
      coalesce(
        'site:'||m.transmitter_site_id::text,
        'ref:'||m.transmitter_reference_id::text,
        'code:'||coalesce(m.transmitter_source_key,public.radio_eibi_transmitter_key(m.country,m.tx_site_code)),
        'unknown'
      ) as physical_key,
      case when g.distance_km is null then 'Bilinmiyor' when g.distance_km<=250 then 'Yerel' when g.distance_km<=1200 then 'Bölgesel' when g.distance_km<=3500 then 'Gece DX' else 'Çok uzak' end as rx_class,
      case when g.distance_km is null then 25 when g.distance_km<=250 then 88 when g.distance_km<=1200 then 76 when g.distance_km<=3500 then case when v_night then 68 else 38 end else case when v_night then 38 else 15 end end as distance_score,
      case when m.power_kw is null then 0 when m.power_kw>=500 then 8 when m.power_kw>=100 then 6 when m.power_kw>=20 then 4 when m.power_kw>=5 then 2 else 0 end as power_bonus,
      case
        when ad.delta_deg is null then 0
        when ad.delta_deg<=15 then 8
        when ad.delta_deg<=30 then 5
        when ad.delta_deg<=60 then 0
        when ad.delta_deg<=90 then -5
        else -10
      end as antenna_bonus,
      public.radio_target_adjustment_country(m.target,v_country) as target_bonus,
      (nullif(btrim(m.target),'') is not null and nullif(btrim(v_country),'') is not null) as target_known,
      case when ps.samples>=5 then ps.personal_history_adjustment when pf.samples>=5 then pf.personal_history_adjustment when pb.samples>=5 then pb.personal_history_adjustment else 0 end as p_adjustment,
      case when ps.samples>=5 then 'verici geçmişi' when pf.samples>=5 then 'frekans geçmişi' when pb.samples>=5 then 'bant geçmişi' else 'kişisel veri etkisi yok' end as p_scope
    from public.mw_schedule_enriched m
    left join active_ids ai on ai.id=m.id
    left join public.radio_transmitter_geometry_cache g
      on g.user_id=v_uid
     and g.transmitter_site_id=m.transmitter_site_id
     and g.location_hash=v_location_hash
     and g.calculation_version>=2
    left join ps on ps.canonical_station_id=m.canonical_station_id and ps.transmitter_site_id=m.transmitter_site_id and ps.frequency=m.frequency
    left join pf on pf.frequency=m.frequency
    left join pb on true
    left join lateral (
      select case
        when m.azimuth_deg is null or m.azimuth_deg=0 or g.bearing_deg is null then null::numeric
        else least(
          abs(m.azimuth_deg-mod(g.bearing_deg+180,360)),
          360-abs(m.azimuth_deg-mod(g.bearing_deg+180,360))
        )
      end as delta_deg
    ) ad on true
  ), scored as (
    select b.*,
      (b.eibi_active or b.official_active) as is_active,
      case when b.eibi_active and b.official_active then 'EiBi segmenti + resmî hizmet penceresi aktif'
           when b.eibi_active then 'EiBi çizelgesinde aktif'
           when b.official_active then 'resmî hizmet penceresinde aktif'
           else 'şu an aktif görünmüyor' end as active_scope,
      case when not b.target_known then 'hedef bilinmiyor'
           when b.target_bonus>=6 then 'hedef konum için çok uygun'
           when b.target_bonus>=3 then 'hedef konum için uygun'
           when b.target_bonus>0 then 'hedef yakın veya geniş bölge'
           when b.target_bonus<=-5 then 'hedef çok uzak bölge'
           when b.target_bonus<0 then 'hedef konum dışında'
           else 'hedef nötr' end as target_scope,
      greatest(0,least(100,b.distance_score+b.power_bonus+b.antenna_bonus+b.target_bonus+b.p_adjustment+case when (b.eibi_active or b.official_active) then 8 else -18 end))::int as final_score
    from base b
  ), ranked as (
    select s.*,row_number() over(
      partition by s.frequency,coalesce(s.canonical_name,s.station),s.physical_key
      order by s.eibi_active desc,s.official_active desc,s.final_score desc,(s.distance_km is null),s.distance_km nulls last,s.power_kw desc nulls last,s.id
    ) as rn
    from scored s
  )
  select r.id,r.frequency,r.station,r.canonical_name,r.country,r.tx_site_code,r.transmitter_site_name,r.power_kw,r.distance_km,r.bearing_deg,r.bearing_direction,r.rx_class,r.is_active,r.p_adjustment,r.final_score,
    concat_ws(
      ' · ',
      r.rx_class,
      r.active_scope,
      case when r.distance_km is not null then round(r.distance_km)::text||' km' else case when r.transmitter_site_name is not null then r.transmitter_site_name||' · koordinat doğrulanmadı' else 'verici koordinatı doğrulanmadı' end end,
      r.target_scope||case when r.target_bonus<>0 then ' '||case when r.target_bonus>0 then '+' else '' end||r.target_bonus::text else '' end,
      case when r.p_adjustment<>0 then r.p_scope||' '||case when r.p_adjustment>0 then '+' else '' end||r.p_adjustment::text else r.p_scope end,
      case when v_solar_elevation is not null then 'güneş yüksekliği '||round(v_solar_elevation,1)::text||'° · '||case when v_night then 'gece yayılımı' else 'gündüz yayılımı' end else 'gece/gündüz hesabı yerel saat fallback ile' end,
      'saat dilimi '||v_tz
    )
  from ranked r where r.rn=1
  order by r.final_score desc,(r.distance_km is null),r.distance_km nulls last,r.power_kw desc nulls last,r.frequency,r.transmitter_site_name nulls last
  limit greatest(1,least(coalesce(p_limit,60),200));
end;
$$;

revoke all on function public.radio_mw_now_candidates(integer) from public, anon;
grant execute on function public.radio_mw_now_candidates(integer) to authenticated, service_role;

comment on function public.radio_mw_now_candidates(integer) is
'Ranked EiBi A26 MW candidates for the authenticated listener. DX night boost follows solar elevation at the selected listening location; fixed 18:00–07:00 is used only when coordinates are unavailable.';
