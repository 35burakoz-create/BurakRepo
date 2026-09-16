const WIN1252 = new TextDecoder('windows-1252', { fatal: false });
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });
const UTF8 = new TextEncoder();

export const EIBI_FIELDS = Object.freeze([
  'frequency_khz','time_utc','days','country','station','language_code',
  'target','tx_site_code','persistence_code','start_date','stop_date'
]);

export function detectEiBiEncoding(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return 'utf-8';
  try {
    UTF8_DECODER.decode(bytes);
    return 'utf-8';
  } catch {
    return 'windows-1252';
  }
}

export function decodeEiBiBytes(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const encoding = detectEiBiEncoding(bytes);
  const text = encoding === 'utf-8' ? new TextDecoder('utf-8').decode(bytes) : WIN1252.decode(bytes);
  return text.replace(/^\uFEFF/, '');
}

export function countSemicolons(line) {
  return (String(line).match(/;/g) || []).length;
}

export function extractLanguageCodes(readmeText) {
  const out = new Set();
  let inLanguageSection = false;
  for (const raw of String(readmeText || '').split(/\r?\n/)) {
    if (/^\s*I\)\s+Language codes\./i.test(raw)) {
      // README has a short table of contents and then the real section.
      // Reset here so only the last actual language section survives.
      out.clear();
      inLanguageSection = true;
      continue;
    }
    if (inLanguageSection && /^\s*II\)\s+Country codes\./i.test(raw)) {
      if (out.size) break;
      inLanguageSection = false;
      continue;
    }
    if (!inLanguageSection) continue;
    const m = raw.match(/^\s{3}((?:-[A-Z]{2})|(?:[A-Z][A-Z0-9-]{0,2}))\s{2,}/);
    if (m) out.add(m[1]);
  }
  return out;
}

function validHhmm(value) {
  if (!/^\d{4}$/.test(value)) return false;
  const h = Number(value.slice(0,2));
  const m = Number(value.slice(2));
  return (h === 24 && m === 0) || (h >= 0 && h <= 23 && m >= 0 && m <= 59);
}

function decodePackedWindows1252Char(ch) {
  const bytes = UTF8.encode(ch);
  if (bytes.length < 2 || bytes.length > 4 || bytes[0] < 0xc2 || bytes[0] > 0xf4) return null;
  const head = WIN1252.decode(Uint8Array.of(bytes[0]));
  if (!head || head === '\uFFFD') return null;
  let out = head;
  let afterDelimiter = false;
  for (let i=1;i<bytes.length;i++) {
    const p = bytes[i] & 0x3f;
    if (p === 59) {
      out += ';';
      afterDelimiter = true;
      continue;
    }
    if (afterDelimiter) {
      if (p >= 1 && p <= 26) out += String.fromCharCode(64 + p);
      else if (p === 45) out += '-';
      else if (p >= 48 && p <= 57) out += String.fromCharCode(p);
      else return null;
    } else {
      if (p >= 33 && p <= 58) out += String.fromCharCode(64 + p);
      else if (p >= 1 && p <= 26) out += String.fromCharCode(64 + p);
      else if (p === 32) out += ' ';
      else return null;
    }
  }
  return out;
}

export function recoverLegacyMisdecodedLine(rawLine) {
  const line = String(rawLine || '').replace(/\r$/, '');
  if (countSemicolons(line) === 10) return null;
  const parts = line.split(';');
  if (parts.length < 9 || parts.length > 10 || !parts[4]) return null;

  const chars = [...parts[4]];
  const decoded = chars.map(ch => decodePackedWindows1252Char(ch));
  if (!decoded.some(value => value?.includes(';'))) return null;

  const stationField = chars.map((ch,i) => decoded[i] ?? ch).join('');
  const rebuilt = [...parts.slice(0,4), stationField, ...parts.slice(5)].join(';');
  return countSemicolons(rebuilt) === 10 ? rebuilt : null;
}

function qa(reason, line, lineNumber, details={}) {
  return { status:'qa', reason, line, lineNumber:lineNumber ?? null, ...details };
}

export function parseEiBiCsvLine(rawLine, options={}) {
  const line = String(rawLine ?? '').replace(/\r$/, '');
  const lineNumber = Number.isInteger(options.lineNumber) ? options.lineNumber : null;
  if (!line.trim()) return { status:'blank', lineNumber };
  if (/^kHz(?::|;)/i.test(line)) return { status:'header', lineNumber, line };

  let working = line;
  let recovered = false;
  if (countSemicolons(working) !== 10) {
    const repaired = recoverLegacyMisdecodedLine(working);
    if (!repaired) return qa('field_count',line,lineNumber,{semicolons:countSemicolons(line)});
    working = repaired;
    recovered = true;
  }

  const f = working.split(';');
  if (f.length !== 11) return qa('field_count',line,lineNumber,{fields:f.length});

  const [freqRaw,timeUtc,days,countryRaw,stationRaw,langRaw,targetRaw,siteRaw,persistenceRaw,startRaw,stopRaw] = f;
  const frequency = Number(freqRaw);
  const country = countryRaw.trim();
  const station = stationRaw.trim();
  const languageCode = langRaw.trim() || null;
  const target = targetRaw.trim() || null;
  const txSiteCode = siteRaw.trim() || null;
  const persistenceCode = persistenceRaw.trim();

  if (!Number.isFinite(frequency) || frequency < 10 || frequency > 30000) return qa('frequency',line,lineNumber);
  const tm = timeUtc.match(/^(\d{4})-(\d{4})$/);
  if (!tm || !validHhmm(tm[1]) || !validHhmm(tm[2])) return qa('time_utc',line,lineNumber);
  if (!/^[A-Z0-9]{1,3}$/.test(country)) return qa('country',line,lineNumber);
  if (!station) return qa('station',line,lineNumber);
  if (languageCode && !/^[A-Z0-9-]{1,3}$/.test(languageCode)) return qa('language_code',line,lineNumber);
  if (languageCode && options.languageCodes instanceof Set && !options.languageCodes.has(languageCode)) return qa('unknown_language_code',line,lineNumber,{languageCode});
  if (target && target.length > 3) return qa('target',line,lineNumber);
  if (txSiteCode && /^\d+$/.test(txSiteCode)) return qa('tx_site_code',line,lineNumber);
  if (!/^(?:[0-6]|8|9[0-6]|98)$/.test(persistenceCode)) return qa('persistence_code',line,lineNumber);

  const fields = {
    frequency_khz: frequency,
    time_utc: timeUtc,
    days: days.trim() || null,
    country,
    station,
    language_code: languageCode,
    target,
    tx_site_code: txSiteCode,
    persistence_code: persistenceCode,
    start_date: startRaw.trim() || null,
    stop_date: stopRaw.trim() || null
  };

  return {
    status: recovered ? 'recovered' : 'ok',
    reason: recovered ? 'legacy_windows1252_text_misdecode' : null,
    lineNumber,
    sourceRecordId: lineNumber != null && lineNumber > 1 ? lineNumber - 1 : null,
    semicolons: 10,
    fields
  };
}

export function parseEiBiCsvBytes(input, options={}) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const encoding = detectEiBiEncoding(bytes);
  const text = decodeEiBiBytes(bytes);
  const records=[];
  const qaRows=[];
  let header=null;
  const lines=text.split(/\n/);
  for(let i=0;i<lines.length;i++) {
    const parsed=parseEiBiCsvLine(lines[i],{...options,lineNumber:i+1});
    if(parsed.status==='blank') continue;
    if(parsed.status==='header'){header=parsed.line;continue;}
    if(parsed.status==='qa') qaRows.push(parsed);
    else records.push(parsed);
  }
  return { encoding, header, records, qa:qaRows };
}
