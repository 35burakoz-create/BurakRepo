#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseEiBiCsvBytes, extractLanguageCodes, countSemicolons, decodeEiBiBytes, detectEiBiEncoding } from './eibi-csv-parser.mjs';

function usage(message){
  if(message) console.error(message);
  console.error('Usage: node tools/eibi-a26-normalize.mjs --input sked-a26.csv --readme README.TXT --out normalized.jsonl --qa qa.jsonl [--manifest manifest.json] [--season A26]');
  process.exit(2);
}

function parseArgs(argv){
  const out={season:null,manifest:null};
  for(let i=2;i<argv.length;i++){
    const key=argv[i];
    if(!key.startsWith('--')) usage(`Unexpected argument: ${key}`);
    const name=key.slice(2);
    const value=argv[++i];
    if(value==null||value.startsWith('--')) usage(`Missing value for --${name}`);
    if(!['input','readme','out','qa','manifest','season'].includes(name)) usage(`Unknown option: --${name}`);
    out[name]=value;
  }
  for(const key of ['input','readme','out','qa']) if(!out[key]) usage(`Missing --${key}`);
  return out;
}

const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const jsonl=rows=>rows.map(row=>JSON.stringify(row)).join(rows.length?'\n':'')+(rows.length?'\n':'');
const ensureParent=file=>fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});

const args=parseArgs(process.argv);
const csvBytes=fs.readFileSync(args.input);
const readmeBytes=fs.readFileSync(args.readme);
const readmeEncoding=detectEiBiEncoding(readmeBytes);
const readmeText=decodeEiBiBytes(readmeBytes);
const languageCodes=extractLanguageCodes(readmeText);
if(languageCodes.size<50) throw new Error(`EiBi language dictionary looks incomplete: ${languageCodes.size} codes`);

const parsed=parseEiBiCsvBytes(csvBytes,{languageCodes});
if(!parsed.header||!/^kHz(?::|;)/i.test(parsed.header)) throw new Error('EiBi CSV header missing or unrecognized');
if(countSemicolons(parsed.header)!==11) throw new Error(`EiBi CSV header shape changed: ${countSemicolons(parsed.header)} semicolons`);

const recoveredCount=parsed.records.filter(row=>row.status==='recovered').length;
const sourceAlreadyMangled=parsed.encoding==='utf-8' && recoveredCount>0;
const pipelineQa=[...parsed.qa];
if(sourceAlreadyMangled){
  pipelineQa.push({
    status:'qa',
    reason:'legacy_misdecoded_utf8_source',
    recoveredRows:recoveredCount,
    message:'Source appears to be an already misdecoded UTF-8 copy; re-fetch the original EiBi bytes.'
  });
}
const promotable=pipelineQa.length===0;

ensureParent(args.out);
ensureParent(args.qa);
// Fail closed: any row/pipeline QA makes the entire normalized payload non-promotable.
// Truncate the output explicitly so a stale successful file cannot be reused accidentally.
fs.writeFileSync(args.out,promotable ? jsonl(parsed.records) : '');
fs.writeFileSync(args.qa,jsonl(pipelineQa));

const sourceIds=parsed.records.map(row=>row.sourceRecordId).filter(Number.isInteger);
const manifest={
  schemaVersion:1,
  source:'EiBi',
  season:args.season||null,
  encoding:parsed.encoding,
  csvSha256:sha256(csvBytes),
  readmeSha256:sha256(readmeBytes),
  readmeEncoding,
  header:parsed.header,
  languageDictionarySize:languageCodes.size,
  records:parsed.records.length,
  promotableRecords:promotable ? parsed.records.length : 0,
  qa:pipelineQa.length,
  rowQa:parsed.qa.length,
  recovered:recoveredCount,
  sourceAlreadyMangled,
  minSourceRecordId:sourceIds.length?Math.min(...sourceIds):null,
  maxSourceRecordId:sourceIds.length?Math.max(...sourceIds):null
};
if(args.manifest){ensureParent(args.manifest);fs.writeFileSync(args.manifest,JSON.stringify(manifest,null,2)+'\n');}
console.log(JSON.stringify(manifest));
if(!promotable){
  console.error(`EiBi import quarantined ${pipelineQa.length} issue(s); normalized output must not be promoted.`);
  process.exitCode=1;
}
