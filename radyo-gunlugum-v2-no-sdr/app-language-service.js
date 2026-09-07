(()=>{
const R=window.R;if(!R||R.__languageService384)return;R.__languageService384=true;
const norm=v=>R.norm?R.norm(v):String(v??'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const WORDS={
 'Türkçe':[' ve ',' bir ',' bu ',' için ',' türkiye',' haber',' saat',' radyo'],
 'İngilizce':[' the ',' and ',' this ',' news',' radio',' world',' today',' from '],
 'Fransızca':[' le ',' la ',' les ',' une ',' des ',' avec ',' aujourd'],
 'İspanyolca':[' el ',' la ',' los ',' una ',' con ',' para ',' noticias'],
 'Almanca':[' der ',' die ',' das ',' und ',' mit ',' heute',' nachrichten'],
 'İtalyanca':[' il ',' la ',' gli ',' una ',' con ',' per ',' oggi',' notizie'],
 'Romence':[' este ',' pentru ',' romania',' stiri',' radio'],
 'Portekizce':[' de ',' que ',' para ',' com ',' hoje ',' notícias ',' radio ']
};
function detect(text){const raw=String(text||''),t=` ${norm(raw)} `;if(!raw.trim())return{language:null,confidence:0,evidence:[]};if(/[\u0600-\u06ff]/.test(raw))return{language:'Arapça',confidence:92,evidence:['Arap yazısı']};if(/[\u3040-\u30ff]/.test(raw))return{language:'Japonca',confidence:94,evidence:['Kana yazısı']};if(/[\uac00-\ud7af]/.test(raw))return{language:'Korece',confidence:94,evidence:['Hangul yazısı']};if(/[\u4e00-\u9fff]/.test(raw))return{language:'Çince',confidence:85,evidence:['Han karakterleri']};if(/[\u0400-\u04ff]/.test(raw))return{language:'Rusça',confidence:72,evidence:['Kiril yazısı']};let best={language:null,hits:0,evidence:[]};for(const[language,words]of Object.entries(WORDS)){const found=words.filter(w=>t.includes(norm(w)));if(found.length>best.hits)best={language,hits:found.length,evidence:found.map(x=>x.trim()).filter(Boolean)}}return best.language?{language:best.language,confidence:Math.min(82,42+best.hits*8),evidence:best.evidence}:{language:null,confidence:0,evidence:[]}}
R.languageService={detect};R.detect=detect;R.features?.register?.('language-service',{ready:true,provider:'app-language-service'});R.events?.emit?.('language:service-ready',{provider:'app-language-service'});
})();