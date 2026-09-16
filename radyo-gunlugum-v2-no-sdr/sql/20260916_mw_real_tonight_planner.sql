-- MW favorileri için gerçek “bu gece” planı.
-- EiBi A26 yayın segmentlerini kullanıcının dinleme konumundaki astronomik gece
-- (Güneş yüksekliği <= -0.833°) ile tam zaman aralığı olarak kesiştirir.
-- Koordinat yoksa yalnızca açıkça etiketlenen 18:00–07:00 yerel saat yedeğini kullanır.

CREATE OR REPLACE FUNCTION public.radio_mw_tonight_candidates(p_limit integer DEFAULT 120)
RETURNS TABLE(
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
  score_explanation text,
  scheduled_tonight boolean,
  tonight_start_at timestamptz,
  tonight_end_at timestamptz,
  night_window_start timestamptz,
  night_window_end timestamptz,
  night_window_source text,
  timezone text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tz text := 'Europe/Istanbul';
  v_country text;
  v_now timestamptz := now();
  v_local_now timestamp;
  v_local_date date;
  v_local_time time;
  v_anchor_date date;
  v_lat numeric;
  v_lon numeric;
  v_location_hash text;
  v_now_solar numeric;
  v_search_start timestamptz;
  v_search_end timestamptz;
  v_first_night_sample timestamptz;
  v_last_night_sample timestamptz;
  v_night_start timestamptz;
  v_night_end timestamptz;
  v_plan_start timestamptz;
  v_window_source text;
  v_lo timestamptz;
  v_hi timestamptz;
  v_mid timestamptz;
  v_i integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT latitude, longitude, timezone, country_code
  INTO v_lat, v_lon, v_tz, v_country
  FROM public.radio_current_listening_location
  WHERE user_id = v_uid;

  v_tz := coalesce(nullif(btrim(v_tz), ''), 'Europe/Istanbul');
  v_local_now := v_now AT TIME ZONE v_tz;
  v_local_date := v_local_now::date;
  v_local_time := v_local_now::time;
  v_location_hash := CASE
    WHEN v_lat IS NOT NULL AND v_lon IS NOT NULL
      THEN md5(round(v_lat, 5)::text || ':' || round(v_lon, 5)::text)
    ELSE NULL
  END;

  IF v_lat IS NOT NULL AND v_lon IS NOT NULL THEN
    v_now_solar := public.radio_solar_elevation_deg(v_now, v_lat, v_lon);
    v_anchor_date := CASE
      WHEN v_now_solar <= -0.833 AND v_local_time < time '12:00'
        THEN v_local_date - 1
      ELSE v_local_date
    END;
  ELSE
    v_anchor_date := CASE
      WHEN v_local_time < time '07:00' THEN v_local_date - 1
      ELSE v_local_date
    END;
  END IF;

  v_search_start := ((v_anchor_date + time '12:00') AT TIME ZONE v_tz);
  v_search_end := (((v_anchor_date + 1) + time '12:00') AT TIME ZONE v_tz);

  IF v_lat IS NOT NULL AND v_lon IS NOT NULL THEN
    SELECT min(g.ts), max(g.ts)
    INTO v_first_night_sample, v_last_night_sample
    FROM generate_series(v_search_start, v_search_end, interval '15 minutes') AS g(ts)
    WHERE public.radio_solar_elevation_deg(g.ts, v_lat, v_lon) <= -0.833;
  END IF;

  IF v_first_night_sample IS NOT NULL AND v_last_night_sample IS NOT NULL THEN
    -- Akşam geçişini 15 dakikalık kaba aralıktan ikili aramayla saniye düzeyine yaklaştır.
    v_lo := greatest(v_search_start, v_first_night_sample - interval '15 minutes');
    v_hi := v_first_night_sample;
    FOR v_i IN 1..12 LOOP
      v_mid := v_lo + (v_hi - v_lo) / 2;
      IF public.radio_solar_elevation_deg(v_mid, v_lat, v_lon) <= -0.833 THEN
        v_hi := v_mid;
      ELSE
        v_lo := v_mid;
      END IF;
    END LOOP;
    v_night_start := v_hi;

    -- Sabah geçişini aynı şekilde daralt.
    v_lo := v_last_night_sample;
    v_hi := least(v_search_end, v_last_night_sample + interval '15 minutes');
    FOR v_i IN 1..12 LOOP
      v_mid := v_lo + (v_hi - v_lo) / 2;
      IF public.radio_solar_elevation_deg(v_mid, v_lat, v_lon) <= -0.833 THEN
        v_lo := v_mid;
      ELSE
        v_hi := v_mid;
      END IF;
    END LOOP;
    v_night_end := v_hi;
    v_window_source := 'astronomik';
  ELSE
    v_night_start := ((v_anchor_date + time '18:00') AT TIME ZONE v_tz);
    v_night_end := (((v_anchor_date + 1) + time '07:00') AT TIME ZONE v_tz);
    v_window_source := 'yerel saat yedeği';
  END IF;

  v_plan_start := greatest(v_now, v_night_start);

  -- Gündüz çağrısında yaklaşan gece seçildiği için normalde bu koşul oluşmaz.
  -- Yine de saat/konum verisi tutarsızsa boş sonuç dönmek, geçmiş yayınları önermekten güvenlidir.
  IF v_plan_start >= v_night_end THEN
    RETURN;
  END IF;

  BEGIN
    PERFORM public.radio_refresh_transmitter_geometry_cache();
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN QUERY
  WITH candidate_dates AS MATERIALIZED (
    SELECT d::date AS broadcast_date
    FROM generate_series(
      ((v_plan_start AT TIME ZONE 'UTC')::date - 1)::timestamp,
      ((v_night_end AT TIME ZONE 'UTC')::date)::timestamp,
      interval '1 day'
    ) AS d
  ), occurrences AS MATERIALIZED (
    SELECT
      s.id,
      d.broadcast_date,
      CASE
        WHEN s.all_day THEN (d.broadcast_date::timestamp AT TIME ZONE 'UTC')
        WHEN s.start_minute IS NULL OR s.end_minute IS NULL OR s.start_minute = s.end_minute THEN NULL
        ELSE ((d.broadcast_date::timestamp + make_interval(mins => s.start_minute)) AT TIME ZONE 'UTC')
      END AS occurrence_start,
      CASE
        WHEN s.all_day THEN ((d.broadcast_date::timestamp + interval '1 day') AT TIME ZONE 'UTC')
        WHEN s.start_minute IS NULL OR s.end_minute IS NULL OR s.start_minute = s.end_minute THEN NULL
        WHEN s.start_minute < s.end_minute
          THEN ((d.broadcast_date::timestamp + make_interval(mins => s.end_minute)) AT TIME ZONE 'UTC')
        ELSE (((d.broadcast_date + 1)::timestamp + make_interval(mins => s.end_minute)) AT TIME ZONE 'UTC')
      END AS occurrence_end
    FROM public.station_schedules s
    CROSS JOIN candidate_dates d
    WHERE s.band = 'MW'
      AND s.frequency BETWEEN 525 AND 1610
      AND s.source = 'EiBi A26'
      AND (s.valid_from IS NULL OR s.valid_from <= d.broadcast_date)
      AND (s.valid_to IS NULL OR s.valid_to >= d.broadcast_date)
      AND position(
        extract(isodow FROM d.broadcast_date)::int::text
        IN coalesce(nullif(s.days_iso, ''), '1234567')
      ) > 0
  ), eligible AS MATERIALIZED (
    SELECT
      o.id,
      min(o.occurrence_start) AS occurrence_start,
      max(o.occurrence_end) AS occurrence_end,
      min(greatest(o.occurrence_start, v_plan_start)) AS overlap_start,
      max(least(o.occurrence_end, v_night_end)) AS overlap_end
    FROM occurrences o
    WHERE o.occurrence_start IS NOT NULL
      AND o.occurrence_end IS NOT NULL
      AND o.occurrence_start < v_night_end
      AND o.occurrence_end > v_plan_start
    GROUP BY o.id
  ), eligible_eval AS MATERIALIZED (
    SELECT
      e.*,
      extract(month FROM (e.overlap_start AT TIME ZONE v_tz))::int AS eval_month,
      (floor(extract(hour FROM (e.overlap_start AT TIME ZONE v_tz)) / 4) * 4)::int AS eval_block
    FROM eligible e
  ), active_ids AS MATERIALIZED (
    SELECT a.id FROM public.station_schedules_active a WHERE a.band = 'MW'
  ), favorites AS MATERIALIZED (
    SELECT DISTINCT
      f.canonical_station_id,
      f.frequency,
      lower(regexp_replace(btrim(coalesce(f.station, '')), '\s+', ' ', 'g')) AS station_key
    FROM public.radio_favorites f
    WHERE f.user_id = v_uid
      AND upper(btrim(coalesce(f.band, ''))) = 'MW'
      AND f.frequency BETWEEN 525 AND 1610
  ), target_keys AS MATERIALIZED (
    SELECT DISTINCT upper(btrim(coalesce(m.target, ''))) AS target_key
    FROM public.mw_schedule_enriched m
    JOIN eligible_eval e ON e.id = m.id
  ), target_scores AS MATERIALIZED (
    SELECT
      k.target_key,
      public.radio_target_adjustment_geo_values(
        k.target_key,
        v_country,
        v_lat,
        v_lon,
        tg.geography_kind,
        tg.center_lat,
        tg.center_lon,
        tg.radius_km
      ) AS target_bonus
    FROM target_keys k
    LEFT JOIN public.radio_target_geographies tg ON tg.target_code = k.target_key
  ), base AS MATERIALIZED (
    SELECT
      m.id,
      m.frequency,
      m.station,
      m.canonical_name,
      m.country,
      m.tx_site_code,
      m.transmitter_site_name,
      m.power_kw,
      m.canonical_station_id,
      m.transmitter_site_id,
      e.occurrence_start,
      e.occurrence_end,
      e.overlap_start,
      e.overlap_end,
      g.distance_km,
      g.bearing_deg,
      g.bearing_cardinal AS bearing_direction,
      (ai.id IS NOT NULL OR coalesce(m.official_service_active_now, false)) AS is_active_now,
      coalesce(
        'site:' || m.transmitter_site_id::text,
        'ref:' || m.transmitter_reference_id::text,
        'code:' || coalesce(m.transmitter_source_key, public.radio_eibi_transmitter_key(m.country, m.tx_site_code)),
        'unknown'
      ) AS physical_key,
      CASE
        WHEN g.distance_km IS NULL THEN 'Bilinmiyor'
        WHEN g.distance_km <= 250 THEN 'Yerel'
        WHEN g.distance_km <= 1200 THEN 'Bölgesel'
        WHEN g.distance_km <= 3500 THEN 'Gece DX'
        ELSE 'Çok uzak'
      END AS rx_class,
      CASE
        WHEN g.distance_km IS NULL THEN 25
        WHEN g.distance_km <= 250 THEN 88
        WHEN g.distance_km <= 1200 THEN 76
        WHEN g.distance_km <= 3500 THEN 68
        ELSE 38
      END AS distance_score,
      CASE
        WHEN m.power_kw IS NULL THEN 0
        WHEN m.power_kw >= 500 THEN 8
        WHEN m.power_kw >= 100 THEN 6
        WHEN m.power_kw >= 20 THEN 4
        WHEN m.power_kw >= 5 THEN 2
        ELSE 0
      END AS power_bonus,
      CASE
        WHEN ad.delta_deg IS NULL THEN 0
        WHEN ad.delta_deg <= 15 THEN 8
        WHEN ad.delta_deg <= 30 THEN 5
        WHEN ad.delta_deg <= 60 THEN 0
        WHEN ad.delta_deg <= 90 THEN -5
        ELSE -10
      END AS antenna_bonus,
      coalesce(tscore.target_bonus, 0) AS target_bonus,
      (nullif(btrim(m.target), '') IS NOT NULL AND (
        nullif(btrim(v_country), '') IS NOT NULL OR (v_lat IS NOT NULL AND v_lon IS NOT NULL)
      )) AS target_known,
      CASE
        WHEN ps.samples >= 5 THEN ps.personal_history_adjustment
        WHEN pf.samples >= 5 THEN pf.personal_history_adjustment
        WHEN pb.samples >= 5 THEN pb.personal_history_adjustment
        ELSE 0
      END AS p_adjustment,
      CASE
        WHEN ps.samples >= 5 THEN 'verici geçmişi'
        WHEN pf.samples >= 5 THEN 'frekans geçmişi'
        WHEN pb.samples >= 5 THEN 'bant geçmişi'
        ELSE 'kişisel veri etkisi yok'
      END AS p_scope,
      CASE WHEN EXISTS (
        SELECT 1
        FROM favorites f
        WHERE f.frequency = m.frequency
          AND (
            (f.canonical_station_id IS NOT NULL AND m.canonical_station_id IS NOT NULL AND f.canonical_station_id = m.canonical_station_id)
            OR (
              f.station_key <> '' AND f.station_key IN (
                lower(regexp_replace(btrim(coalesce(m.canonical_name, '')), '\s+', ' ', 'g')),
                lower(regexp_replace(btrim(coalesce(m.station, '')), '\s+', ' ', 'g'))
              )
            )
          )
      ) THEN 4 ELSE 0 END AS favorite_bonus
    FROM public.mw_schedule_enriched m
    JOIN eligible_eval e ON e.id = m.id
    LEFT JOIN target_scores tscore ON tscore.target_key = upper(btrim(coalesce(m.target, '')))
    LEFT JOIN active_ids ai ON ai.id = m.id
    LEFT JOIN public.radio_transmitter_geometry_cache g
      ON g.user_id = v_uid
     AND g.transmitter_site_id = m.transmitter_site_id
     AND g.location_hash = v_location_hash
     AND g.calculation_version >= 2
    LEFT JOIN public.personal_transmitter_propagation_stats ps
      ON ps.user_id = v_uid
     AND ps.band = 'MW'
     AND ps.month = e.eval_month
     AND ps.hour_block_start = e.eval_block
     AND ps.canonical_station_id = m.canonical_station_id
     AND ps.transmitter_site_id = m.transmitter_site_id
     AND ps.frequency = m.frequency
    LEFT JOIN public.personal_frequency_propagation_stats pf
      ON pf.user_id = v_uid
     AND pf.band = 'MW'
     AND pf.month = e.eval_month
     AND pf.hour_block_start = e.eval_block
     AND pf.frequency = m.frequency
    LEFT JOIN public.personal_propagation_stats pb
      ON pb.user_id = v_uid
     AND pb.band = 'MW'
     AND pb.month = e.eval_month
     AND pb.hour_block_start = e.eval_block
    LEFT JOIN LATERAL (
      SELECT CASE
        WHEN m.azimuth_deg IS NULL OR m.azimuth_deg = 0 OR g.bearing_deg IS NULL THEN NULL::numeric
        ELSE least(
          abs(m.azimuth_deg - mod(g.bearing_deg + 180, 360)),
          360 - abs(m.azimuth_deg - mod(g.bearing_deg + 180, 360))
        )
      END AS delta_deg
    ) ad ON true
  ), scored AS MATERIALIZED (
    SELECT
      b.*,
      CASE
        WHEN b.is_active_now THEN 'şu an aktif'
        ELSE 'şu an aktif değil'
      END AS active_scope,
      CASE
        WHEN NOT b.target_known THEN 'hedef bilinmiyor'
        WHEN b.target_bonus >= 6 THEN 'hedef konum için çok uygun'
        WHEN b.target_bonus >= 3 THEN 'hedef konum için uygun'
        WHEN b.target_bonus > 0 THEN 'hedef yakın veya geniş bölge'
        WHEN b.target_bonus <= -5 THEN 'hedef çok uzak bölge'
        WHEN b.target_bonus < 0 THEN 'hedef konum dışında'
        ELSE 'hedef nötr'
      END AS target_scope,
      greatest(
        0,
        least(
          100,
          b.distance_score + b.power_bonus + b.antenna_bonus + b.target_bonus + b.p_adjustment + b.favorite_bonus + 8
        )
      )::int AS final_score
    FROM base b
  ), ranked AS (
    SELECT
      s.*,
      row_number() OVER (
        PARTITION BY s.frequency, coalesce(s.canonical_name, s.station), s.physical_key
        ORDER BY
          s.overlap_start,
          s.final_score DESC,
          (s.distance_km IS NULL),
          s.distance_km NULLS LAST,
          s.power_kw DESC NULLS LAST,
          s.id
      ) AS rn
    FROM scored s
  )
  SELECT
    r.id,
    r.frequency,
    r.station,
    r.canonical_name,
    r.country,
    r.tx_site_code,
    r.transmitter_site_name,
    r.power_kw,
    r.distance_km,
    r.bearing_deg,
    r.bearing_direction,
    r.rx_class,
    r.is_active_now,
    r.p_adjustment,
    r.final_score,
    concat_ws(
      ' · ',
      r.rx_class,
      'bu gece EiBi çizelgesinde ' ||
        to_char(r.occurrence_start AT TIME ZONE v_tz, 'HH24:MI') || '–' ||
        to_char(r.occurrence_end AT TIME ZONE v_tz, 'HH24:MI'),
      r.active_scope,
      CASE
        WHEN r.distance_km IS NOT NULL THEN round(r.distance_km)::text || ' km'
        WHEN r.transmitter_site_name IS NOT NULL THEN r.transmitter_site_name || ' · koordinat doğrulanmadı'
        ELSE 'verici koordinatı doğrulanmadı'
      END,
      r.target_scope || CASE
        WHEN r.target_bonus <> 0 THEN ' ' || CASE WHEN r.target_bonus > 0 THEN '+' ELSE '' END || r.target_bonus::text
        ELSE ''
      END,
      CASE
        WHEN r.p_adjustment <> 0 THEN r.p_scope || ' ' || CASE WHEN r.p_adjustment > 0 THEN '+' ELSE '' END || r.p_adjustment::text
        ELSE r.p_scope
      END,
      CASE WHEN r.favorite_bonus > 0 THEN 'favori yayın +' || r.favorite_bonus::text ELSE NULL END,
      CASE
        WHEN v_window_source = 'astronomik' THEN
          'astronomik gece ' || to_char(v_night_start AT TIME ZONE v_tz, 'HH24:MI') || '–' || to_char(v_night_end AT TIME ZONE v_tz, 'HH24:MI')
        ELSE
          'gece penceresi ' || to_char(v_night_start AT TIME ZONE v_tz, 'HH24:MI') || '–' || to_char(v_night_end AT TIME ZONE v_tz, 'HH24:MI') || ' · yerel saat yedeği'
      END,
      'saat dilimi ' || v_tz
    ),
    true,
    r.occurrence_start,
    r.occurrence_end,
    v_night_start,
    v_night_end,
    v_window_source,
    v_tz
  FROM ranked r
  WHERE r.rn = 1
  ORDER BY
    r.overlap_start,
    r.final_score DESC,
    (r.distance_km IS NULL),
    r.distance_km NULLS LAST,
    r.power_kw DESC NULLS LAST,
    r.frequency,
    r.transmitter_site_name NULLS LAST
  LIMIT greatest(1, least(coalesce(p_limit, 120), 300));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.radio_mw_tonight_candidates(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.radio_mw_tonight_candidates(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.radio_mw_tonight_candidates(integer) TO authenticated;
