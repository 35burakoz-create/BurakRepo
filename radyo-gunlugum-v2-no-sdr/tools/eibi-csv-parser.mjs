// EiBi documents sked-Xzz.csv as an 11-field, 10-semicolon database.
// The server currently sends text/csv without a charset. Read response BYTES and
// decode Windows-1252 before splitting fields; decoding the byte stream as UTF-8
// can collapse an accented byte plus following ASCII separators/language letters
// into one Unicode code point.

const WIN1252 = new TextDecoder('windows-1252', { fatal: false });
const UTF8 = new TextEncoder();

export const EIBI_FIELDS = Object.freeze([
  'frequency_khz','time_utc','days','country','station','language_code',
  'target','tx_site_code','persistence_code','start_date','stop_date'
]);

export function decodeEiBiBytes(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return WIN1252.decode(bytes).replace(/^\uFEFF/, '');
}

export function countSemicolons(line) {
  return (String(line).match(/;/g) || []).length;
}

export function extractLanguageCodes(readmeText) {
  const out = new Set();
  for (const raw of String(readmeText || '').split(/\r?\n/)) {
    const m = raw.match(/^\s{3}([A-Z][A-Z0-9-]{0,2})\s{2,}/);
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

// Compatibility only for legacy text that has already gone through the old,
// permissive UTF-8 text path. This is NOT used for correctly fetched bytes.
function decodePackedWindows1252Char(ch) {
  const bytes = UTF8.encode(ch);
  if (bytes.length < 2 || bytes.length > 4 || bytes[0] < 0xc2 || bytes[0] > 0xf4) return null;
  const head = WIN1252.decode(Uint8Array.of(bytes[0]));
  if (!head || head === '\uFFFD') return null;

  let out = head;
  let afterDelimiter = false;
  for (let i=1;i<bytes.length;i++) {
    const payload = bytes[i] & 0x3f;
    if (payload === 59) {
      out += ';';
      afterDelimiter = true;
      continue;
    }
    if (afterDelimiter) {
      if (payload >= 1 && payload <= 26) out += String.fromCharCode(64 + payload);
      else if (payload === 45) out += '-';
      else if (payload >= 48 && payload <= 57) out += String.fromCharCode(payload);
      else return null;
    } else {
      if (payload >= 33 && payload <= 58) out += String.fromCharCode(64 + payload);
      else if (payload >= 1 && payload <= 26) out += String.fromCharCode(64 + payload);
      else if (payload === 32) out += ' ';
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
  // Do not rewrite arbitrary Unicode. At least one packed character must contain
  // the missing field delimiter before this compatibility path is permitted.
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

  const fieldsRaw = working.split(';');
  if (fieldsRaw.length !== 11) return qa('field_count',line,lineNumber,{fields:fieldsRaw.length});

  const [freqRaw,timeUtc,days,countryRaw,stationRaw,langRaw,targetRaw,siteRaw,persistenceRaw,startRaw,stopRaw] = fieldsRaw;
  const frequency = Number(freqRaw);
  const country = countryRaw.trim();
  const station = stationRaw.trim();
  const languageCode = langRaw.trim() || null;
  const target = targetRaw.trim() || null;
  const txSiteCode = siteRaw.trim() || null;
  const persistenceCode = persistenceRaw.trim();

  if (!Number.isFinite(frequency) || frequency < 10 || frequency > 30000) return qa('frequency',line,lineNumber);
  const timeMatch = timeUtc.match(/^(\d{4})-(\d{4})$/);
  if (!timeMatch || !validHhmm(timeMatch[1]) || !validHhmm(timeMatch[2])) return qa('time_utc',line,lineNumber);
  if (!/^[A-Z0-9]{1,3}$/.test(country)) return qa('country',line,lineNumber);
  if (!station) return qa('station',line,lineNumber);
  if (languageCode && !/^[A-Z0-9-]{1,3}$/.test(languageCode)) return qa('language_code',line,lineNumber);
  if (languageCode && options.languageCodes instanceof Set && !options.languageCodes.has(languageCode)) {
    return qa('unknown_language_code',line,lineNumber,{languageCode});
  }
  if (target && target.length > 3) return qa('target',line,lineNumber);
  if (txSiteCode && /^\d+$/.test(txSiteCode)) return qa('tx_site_code',line,lineNumber);
  if (!/^(?:[0-6]|8|9[0-8])$/.test(persistenceCode)) return qa('persistence_code',line,lineNumber);

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
  const text = decodeEiBiBytes(input);
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
  return { encoding:'windows-1252', header, records, qa:qaRows };
}
