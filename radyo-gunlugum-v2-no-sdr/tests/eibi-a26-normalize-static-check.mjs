import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const tool=path.join(root,'tools/eibi-a26-normalize.mjs');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'eibi-normalize-'));
const input=path.join(tmp,'sked-a26.csv');
const readme=path.join(tmp,'README.TXT');
const out=path.join(tmp,'normalized.jsonl');
const qa=path.join(tmp,'qa.jsonl');
const manifest=path.join(tmp,'manifest.json');

const win1252=s=>Uint8Array.from([...s].map(ch=>{
  const cp=ch.codePointAt(0);
  if(cp>255) throw new Error(`fixture outside Windows-1252: ${ch}`);
  return cp;
}));
const header='kHz:75;Time(UTC):93;Days:59;ITU:49;Station:201;Lng:49;Target:62;Remarks:135;P:35;Start:60;Stop:60;';
const row='690;0000-2400;;B;Rádio Clube do Pará;P;B;be;1;;';
const inputBytes=Buffer.from(win1252(`${header}\r\n${row}\r\n`));
fs.writeFileSync(input,inputBytes);
const filler=[];
for(let i=0;i<60;i++){
  const a=String.fromCharCode(65+Math.floor(i/26));
  const b=String.fromCharCode(65+(i%26));
  filler.push(`   ${a}${b}    Fixture language ${i}`);
}
const readmeText='D) Codes used.\n   I) Language codes.\n   P     Portuguese: Brazil\n   S     Spanish\n   HR    Croatian/Hrvatski\n'+filler.join('\n');
fs.writeFileSync(readme,readmeText);

const run=spawnSync(process.execPath,[tool,'--input',input,'--readme',readme,'--out',out,'--qa',qa,'--manifest',manifest,'--season','A26'],{encoding:'utf8'});
assert.equal(run.status,0,run.stderr||run.stdout);
const summary=JSON.parse(run.stdout.trim());
assert.equal(summary.encoding,'windows-1252');
assert.equal(summary.season,'A26');
assert.equal(summary.records,1);
assert.equal(summary.promotableRecords,1);
assert.equal(summary.qa,0);
assert.equal(summary.recovered,0);
assert.equal(summary.minSourceRecordId,1);
assert.equal(summary.maxSourceRecordId,1);
assert.equal(summary.csvSha256,crypto.createHash('sha256').update(inputBytes).digest('hex'));
const record=JSON.parse(fs.readFileSync(out,'utf8').trim());
assert.equal(record.fields.station,'Rádio Clube do Pará');
assert.equal(record.fields.language_code,'P');
assert.equal(fs.readFileSync(qa,'utf8'),'');
const diskManifest=JSON.parse(fs.readFileSync(manifest,'utf8'));
assert.deepEqual(diskManifest,summary);
console.log('✓ EiBi normalizer writes validated JSONL, deterministic manifest and empty QA output');

const badInput=path.join(tmp,'bad.csv');
const badOut=path.join(tmp,'bad.jsonl');
const badQa=path.join(tmp,'bad-qa.jsonl');
const malformed='5000;0000-0100;;USA;Broken station;NAm;x;1;;';
fs.writeFileSync(badInput,Buffer.from(win1252(`${header}\r\n${row}\r\n${malformed}\r\n`)));
const bad=spawnSync(process.execPath,[tool,'--input',badInput,'--readme',readme,'--out',badOut,'--qa',badQa],{encoding:'utf8'});
assert.equal(bad.status,1);
assert.match(bad.stderr,/quarantined 1 issue/);
assert.equal(fs.readFileSync(badOut,'utf8'),''); // valid rows are withheld too: no partial promotion
const qaRow=JSON.parse(fs.readFileSync(badQa,'utf8').trim());
assert.equal(qaRow.reason,'field_count');
console.log('✓ EiBi normalizer fails closed and quarantines malformed rows');

const mangledInput=path.join(tmp,'mangled.csv');
const mangledOut=path.join(tmp,'mangled.jsonl');
const mangledQa=path.join(tmp,'mangled-qa.jsonl');
const mangled='690;0000-2400;;B;Rᤩo Clube do ParỐ;B;be;1;;';
fs.writeFileSync(mangledInput,`${header}\r\n${mangled}\r\n`,'utf8');
const mangledRun=spawnSync(process.execPath,[tool,'--input',mangledInput,'--readme',readme,'--out',mangledOut,'--qa',mangledQa],{encoding:'utf8'});
assert.equal(mangledRun.status,1);
assert.equal(fs.readFileSync(mangledOut,'utf8'),'');
const mangledIssue=JSON.parse(fs.readFileSync(mangledQa,'utf8').trim());
assert.equal(mangledIssue.reason,'legacy_misdecoded_utf8_source');
assert.equal(mangledIssue.recoveredRows,1);
console.log('✓ EiBi normalizer rejects already-misdecoded UTF-8 source copies');
