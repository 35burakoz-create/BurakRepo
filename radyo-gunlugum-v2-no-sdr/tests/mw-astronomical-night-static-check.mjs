import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const sql=fs.readFileSync(path.join(root,'sql/20260916_mw_astronomical_night_scoring.sql'),'utf8');
const checks=[];
const check=(name,ok)=>{checks.push([name,!!ok]);if(!ok)process.exitCode=1};

check('solar elevation helper is deterministic and strict',sql.includes('create or replace function public.radio_solar_elevation_deg')&&sql.includes('immutable')&&sql.includes('strict'));
check('solar helper validates latitude and longitude ranges',sql.includes('p_lat not between -90 and 90')&&sql.includes('p_lon not between -180 and 180'));
check('solar calculation uses UTC instant through Julian day',sql.includes('extract(epoch from p_at)')&&sql.includes('2440587.5'));
check('solar calculation includes solar longitude and declination',sql.includes('v_lambda')&&sql.includes('v_delta'));
check('solar calculation includes Greenwich sidereal time and listener longitude',sql.includes('v_gmst')&&sql.includes('v_lst := v_gmst + p_lon'));
check('solar elevation is computed from listener latitude and hour angle',sql.includes('v_hour_angle')&&sql.includes('v_elevation := degrees(asin('));
check('anonymous callers cannot execute solar helper directly',sql.includes('revoke all on function public.radio_solar_elevation_deg')&&sql.includes('from public, anon'));
check('authenticated MW RPC can execute solar helper',sql.includes('grant execute on function public.radio_solar_elevation_deg')&&sql.includes('to authenticated, service_role'));
check('MW ranking captures one current instant for all calculations',sql.includes('v_now timestamptz := now()'));
check('MW ranking uses selected listening coordinates',sql.includes('radio_current_listening_location')&&sql.includes('v_solar_elevation := public.radio_solar_elevation_deg(v_now,v_lat,v_lon)'));
check('MW night starts at apparent sunset threshold',sql.includes('v_solar_elevation <= -0.833'));
check('fixed 18 to 07 window is fallback only',sql.includes('when v_solar_elevation is not null then')&&sql.includes('else (v_hour>=18 or v_hour<7)'));
check('DX distance score consumes astronomical night boolean',sql.includes('g.distance_km<=3500 then case when v_night then 68 else 38 end')&&sql.includes('case when v_night then 38 else 15 end'));
check('score explanation shows solar elevation',sql.includes("'güneş yüksekliği '")&&sql.includes("'gece yayılımı'")&&sql.includes("'gündüz yayılımı'"));
check('score explanation keeps explicit fallback disclosure',sql.includes('gece/gündüz hesabı yerel saat fallback ile'));
check('target explanation uses polished Turkish',sql.includes("'hedef konum için çok uygun'")&&sql.includes("'hedef yakın veya geniş bölge'")&&sql.includes("'hedef konum dışında'")&&sql.includes("'hedef nötr'"));
check('old ASCII target labels are gone',!sql.includes('hedef_konum_icin')&&!sql.includes('hedef_yakin_veya_genis_bolge')&&!sql.includes('hedef_notr'));
check('RPC remains authenticated only',sql.includes('revoke all on function public.radio_mw_now_candidates(integer) from public, anon')&&sql.includes('grant execute on function public.radio_mw_now_candidates(integer) to authenticated, service_role'));
check('astronomical scoring has no external network dependency',!sql.includes('http://')&&!sql.includes('https://'));

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} MW astronomical-night checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
