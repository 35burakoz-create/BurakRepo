import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sql=read('sql/20260915_hfcc_a26_import_hardening.sql');
const coordinateSql=read('sql/20260916_hfcc_coordinate_reference_linking.sql');
const config=read('app-config.js');
const checks=[];
function check(name,ok){checks.push([name,!!ok]);if(!ok)process.exitCode=1}

check('official HFCC A26 source is pinned',sql.includes('https://new.hfcc.org/data/a26/')&&sql.includes('schedbybrc.php?broadc='));
check('HFCC page parser requires the full 16-cell schedule row',sql.includes('cardinality(v_cells),0)<>16'));
check('frequency is parsed numerically before receiver classification',sql.includes("v_frequency:=v_cells[1]::numeric")&&sql.indexOf("v_frequency:=v_cells[1]::numeric")<sql.indexOf('v_band:=private.tecsun_r9012_sw_band(v_frequency)'));
check('source frequency is never reconstructed by prefix guessing',!sql.includes("'1'||v_cells[1]")&&!sql.includes("'2'||v_cells[1]"));
check('stable source record id uses positive 60-bit content identity',sql.includes("substr(v_row_key,1,15))::bit(60)::bigint"));
check('source identity hashes the complete normalized HFCC row',sql.includes("array_to_string(v_cells,chr(31),'<NULL>')"));
check('HTML/control whitespace is normalized at the ingestion boundary',sql.includes("[[:cntrl:][:space:]]+"));
check('HFCC coordinates are parsed before site enrichment',sql.includes("private.hfcc_coordinate(v_cells[9],'lat')")&&sql.includes("private.hfcc_coordinate(v_cells[10],'lon')"));
check('IRDR dummy and placeholder organizations are not production candidates',sql.includes("v_code='RDR'")&&sql.includes("'for new organization'")&&sql.includes("'%Dummy Req%'"));
check('broadcaster completeness is derived from the official A26 index',sql.includes('hfcc_a26_expected_broadcaster_codes')&&sql.includes("regexp_matches(v_html,'broadc=([A-Z0-9]+)','g')"));
check('staging freshness is required before a production rebuild',sql.includes("now()-interval '2 hours'"));
check('rebuild backs up schedules and guide rows before replacement',sql.includes('hfcc_a26_schedule_backup')&&sql.includes('hfcc_a26_guide_backup')&&sql.indexOf('hfcc_a26_schedule_backup')<sql.lastIndexOf("delete from public.station_schedules where source='HFCC A26'"));
check('stale guide cleanup protects favorites and reminders',sql.includes('public.radio_favorites')&&sql.includes('public.radio_reminders')&&sql.includes('Arşivlenmiş A26 çizelgesi'));
check('five-digit truncation sentinels are guarded in both directions',sql.includes('frequency=11530')&&sql.includes('frequency=21480')&&sql.includes("receiver_band='SW10'"));
check('successful rebuild requires all ten Tecsun shortwave bands',sql.includes('v_bands<>10')&&sql.includes("count(distinct band) from public.station_schedules where source='HFCC A26')<>10"));
check('full production quality report remains available',sql.includes('radio_private.hfcc_a26_data_quality()')&&sql.includes("'hfcc_receiver_range'")&&sql.includes("'hfcc_stale_guide_rows'"));
check('import machinery is private from browser roles',sql.includes('revoke all on private.hfcc_a26_stage from public, anon, authenticated')&&sql.includes('revoke all on function private.rebuild_hfcc_a26_for_tecsun() from public,anon,authenticated'));

check('coordinate-only references keep official site_code null',coordinateSql.includes("'site_code_status','not_published_in_public_schedule'")&&coordinateSql.includes('site_code=null'));
check('coordinate reference source keys are explicitly internal',coordinateSql.includes("'A26COORD:'||substr(md5")&&coordinateSql.includes("'reference_basis','official_schedule_name_coordinates'"));
check('latest candidate view never copies internal source_key into tx_site_code',coordinateSql.includes('case when tm.match_count=1 then tm.site_code end resolved_tx_site_code')&&!coordinateSql.includes('case when tm.match_count=1 then tm.source_key end resolved_tx_site_code'));
check('HFCC trigger falls back only to a unique exact coordinate reference',coordinateSql.includes('select count(*) into matched_count')&&coordinateSql.includes('if matched_count=1 then')&&coordinateSql.includes('abs(t.latitude-new.latitude)<0.00001')&&coordinateSql.includes('abs(t.longitude-new.longitude)<0.00001'));
check('existing official HFCC code remains preferred over coordinate fallback',coordinateSql.indexOf('if wanted_key is not null then')<coordinateSql.indexOf('select count(*) into matched_count'));
check('coordinate completion never mutates tx_site_code',coordinateSql.includes('set transmitter_site_id=t.id')&&!/set\s+tx_site_code\s*=/i.test(coordinateSql));
check('data quality reports any internal coordinate key leakage',coordinateSql.includes("'hfcc_coordinate_reference_code_leak'")&&coordinateSql.includes("tx_site_code like 'A26COORD:%'"));

const requiredCoordinateSites=['Kununurra WA','Bamako','Duchanbe','Lampertheim','Vandiver, AL','Bethel, PA','Milton, FL','New Orleans, LA','Tchita','Xingyang','Zwolle'];
for(const site of requiredCoordinateSites)check(`coordinate reference includes ${site}`,coordinateSql.includes(`'${site}'`));

const bands=[
  ['SW1',3900,4000],['SW2',4750,5060],['SW3',5950,6200],['SW4',7100,7300],['SW5',9500,9900],
  ['SW6',11650,12050],['SW7',13600,13800],['SW8',15100,15600],['SW9',17550,17900],['SW10',21450,21850]
];
for(const [band,min,max] of bands){
  check(`${band} SQL range matches Tecsun application config`,
    sql.includes(`p_frequency between ${min} and ${max} then '${band}'`)&&
    new RegExp(`${band}:Object\\.freeze\\(\\{min:${min},max:${max},unit:'kHz'\\}\\)`).test(config));
}

for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} HFCC A26 import hardening checks passed.`);
if(failed.length)console.error('Failed:',failed.map(([name])=>name).join(', '));
