import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  decodeEiBiBytes,
  parseEiBiCsvLine,
  parseEiBiCsvBytes,
  recoverLegacyMisdecodedLine,
  extractLanguageCodes
} from '../tools/eibi-csv-parser.mjs';

const root=path.resolve(process.cwd(),'radyo-gunlugum-v2-no-sdr');
const recoverySql=fs.readFileSync(path.join(root,'sql/20260916_recover_remaining_eibi_a26_language_codes.sql'),'utf8');
const checks=[];
const check=(name,fn)=>{
  try{fn();checks.push([name,true]);}
  catch(error){checks.push([name,false,error]);process.exitCode=1;}
};

const known=new Set(['HR','AR','BU','GR','RU','SV','UK','PO','D','P','S','VN']);
function win1252Bytes(text){
  const out=[];
  for(const ch of text){
    const cp=ch.codePointAt(0);
    if(cp<=255) out.push(cp);
    else throw new Error(`fixture is not Windows-1252: ${ch}`);
  }
  return Uint8Array.from(out);
}

check('Windows-1252 byte decode preserves Portuguese accents',()=>{
  const line='690;0000-2400;;B;Rádio Clube do Pará;P;B;be;1;;';
  assert.equal(decodeEiBiBytes(win1252Bytes(line)),line);
});

check('byte parser skips header and parses exact 11-field row',()=>{
  const header='kHz:75;Time(UTC):93;Days:59;ITU:49;Station:201;Lng:49;Target:62;Remarks:135;P:35;Start:60;Stop:60;';
  const line='690;0000-2400;;B;Rádio Clube do Pará;P;B;be;1;;';
  const parsed=parseEiBiCsvBytes(win1252Bytes(`${header}\r\n${line}`),{languageCodes:known});
  assert.equal(parsed.encoding,'windows-1252');
  assert.equal(parsed.qa.length,0);
  assert.equal(parsed.records.length,1);
  assert.equal(parsed.records[0].fields.station,'Rádio Clube do Pará');
  assert.equal(parsed.records[0].fields.language_code,'P');
});

check('documented blank language field remains null',()=>{
  const parsed=parseEiBiCsvLine('612;1700-1730;Mo-Th;USA;Trans World Radio;;CAs;/KGZ;1;;',{languageCodes:known});
  assert.equal(parsed.status,'ok');
  assert.equal(parsed.fields.language_code,null);
});

check('legacy 9-semicolon Hungarian row recovers HR and station accents',()=>{
  const parsed=parseEiBiCsvLine('873;0600-0800;;HNG;Nemzetis駩 Rᤩ󻈒;HNG;lh;2;;',{lineNumber:213,languageCodes:known});
  assert.equal(parsed.status,'recovered');
  assert.equal(parsed.reason,'legacy_windows1252_text_misdecode');
  assert.equal(parsed.fields.station,'Nemzetiségi Rádió');
  assert.equal(parsed.fields.language_code,'HR');
  assert.equal(parsed.fields.target,'HNG');
  assert.equal(parsed.sourceRecordId,212);
});

check('legacy 8-semicolon Hungarian row recovers embedded D plus target delimiter',()=>{
  const parsed=parseEiBiCsvLine('873;0800-1000;;HNG;Nemzetis駩 Rᤩ󻄻HNG;lh;2;;[1218]',{languageCodes:known});
  assert.equal(parsed.status,'recovered');
  assert.equal(parsed.fields.station,'Nemzetiségi Rádió');
  assert.equal(parsed.fields.language_code,'D');
  assert.equal(parsed.fields.target,'HNG');
});

check('legacy Brazilian row recovers Portuguese language code',()=>{
  const parsed=parseEiBiCsvLine('690;0000-2400;;B;Rᤩo Clube do ParỐ;B;be;1;;',{languageCodes:known});
  assert.equal(parsed.status,'recovered');
  assert.equal(parsed.fields.station,'Rádio Clube do Pará');
  assert.equal(parsed.fields.language_code,'P');
  assert.equal(parsed.fields.target,'B');
});

check('legacy Radio Exterior row recovers Spanish code without inventing canonical wording',()=>{
  const parsed=parseEiBiCsvLine('9690;0000-0100;;E;Radio Exterior Espa񡻓;NAm;n;4;;',{languageCodes:known});
  assert.equal(parsed.status,'recovered');
  assert.equal(parsed.fields.station,'Radio Exterior España');
  assert.equal(parsed.fields.language_code,'S');
  assert.equal(parsed.fields.target,'NAm');
});

check('legitimate Vietnamese Unicode is untouched on a structurally valid row',()=>{
  const station='Radio Đáp Lời Sông Núi';
  const parsed=parseEiBiCsvLine(`5000;0000-0100;;VTN;${station};VN;SEA;x;1;;`,{languageCodes:known});
  assert.equal(parsed.status,'ok');
  assert.equal(parsed.fields.station,station);
});

check('ambiguous malformed line is quarantined rather than shifted',()=>{
  const parsed=parseEiBiCsvLine('5000;0000-0100;;USA;Broken station;NAm;x;1;;',{languageCodes:known});
  assert.equal(parsed.status,'qa');
  assert.equal(parsed.reason,'field_count');
});

check('unknown recovered language code is rejected when README dictionary is supplied',()=>{
  const parsed=parseEiBiCsvLine('873;0600-0800;;HNG;Nemzetis駩 Rᤩ󻈒;HNG;lh;2;;',{languageCodes:new Set(['D'])});
  assert.equal(parsed.status,'qa');
  assert.equal(parsed.reason,'unknown_language_code');
});

check('README language dictionary extractor recognizes official code lines',()=>{
  const codes=extractLanguageCodes('   HR    Croatian/Hrvatski\n   D     German\n   P     Portuguese\n');
  assert.deepEqual([...codes],['HR','D','P']);
});

check('legacy recovery refuses arbitrary malformed Unicode without hidden delimiter evidence',()=>{
  assert.equal(recoverLegacyMisdecodedLine('5000;0000-0100;;VTN;Radio Đáp Lời Sông Núi;VN;SEA;x;1;'),null);
});

check('A26 recovery migration requires exactly 52 deterministic rows',()=>{
  assert.match(recoverySql,/v_expected integer := 52/);
  assert.match(recoverySql,/expected %, found %/);
  assert.match(recoverySql,/expected %, updated %/);
});

check('A26 recovery migration stays scoped to null EiBi A26 language fields',()=>{
  assert.match(recoverySql,/s\.source='EiBi A26'/);
  assert.match(recoverySql,/s\.language_code is null/);
  assert.match(recoverySql,/s\.language is null/);
});

check('A26 recovery migration includes every verified recovered language code',()=>{
  for(const code of ['D','AR','BU','GR','HR','PO','RU','SV','UK','P']){
    assert.ok(recoverySql.includes(`,'${code}'`),`missing ${code}`);
  }
});

check('A26 recovery migration syncs guide language and raw provenance',()=>{
  assert.match(recoverySql,/update public\.guide_entries g/);
  assert.match(recoverySql,/language_content=s\.language_code/);
  assert.ok(recoverySql.includes("'{schedule,language_code}'"));
});

check('A26 recovery migration is replayable without an external HTTP dependency',()=>{
  assert.ok(!recoverySql.includes('http_get('));
  assert.ok(!recoverySql.includes('https://'));
  assert.ok(!recoverySql.includes('http://'));
});

for(const [name,ok,error] of checks){
  console.log(`${ok?'✓':'✗'} ${name}`);
  if(!ok) console.error(error);
}
const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} EiBi CSV parser checks passed.`);
if(failed.length) process.exitCode=1;
