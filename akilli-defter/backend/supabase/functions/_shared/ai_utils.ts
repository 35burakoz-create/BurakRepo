export function maskPII(input: string): string {
  return input
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\+?\d[\d\s-]{8,}\d/g, '[phone]')
    .replace(/\b\d{11}\b/g, '[id]')
    .replace(/\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\b/g, '[name]');
}

export function tokenizeContactName(_input: string): string {
  return 'Müşteri A';
}

export function heuristicCategory(text: string): { category: string; confidence: number; explanation: string } {
  const lower = text.toLowerCase();
  if (/(market|migros|carrefour|grocery)/.test(lower)) {
    return { category: 'Market', confidence: 0.85, explanation: 'merchant/text indicates grocery spend' };
  }
  if (/(taxi|uber|metro|otobüs|ulaşım)/.test(lower)) {
    return { category: 'Ulaşım', confidence: 0.8, explanation: 'transportation keywords detected' };
  }
  if (/(invoice|client|freelance|payment|ödeme alındı)/.test(lower)) {
    return { category: 'Freelance', confidence: 0.78, explanation: 'income keywords found' };
  }
  return { category: 'Genel', confidence: 0.55, explanation: 'fallback by low-signal text' };
}

export function buildWeeklySummary(start: string, end: string) {
  return {
    summary_text_tr: `${start} - ${end} döneminde harcamalarda market ve ulaşım öne çıkıyor.`,
    summary_text_en: `For ${start} - ${end}, spending is concentrated in groceries and transportation.`,
    action_items: [
      'Market bütçesini %10 azaltmayı deneyin.',
      'Geciken ödemeler için takip mesajı hazırlayın.',
      'TRY/USD dengesini haftalık kontrol edin.',
    ],
  };
}


export type MessageTone = 'nazik' | 'net' | 'sert';

export function buildCollectionMessageDraft(input: {
  contact: string;
  overdue_days: number;
  amount: number;
  currency: string;
  tone: MessageTone;
}) {
  const toneTrMap: Record<MessageTone, string> = {
    nazik: 'Nazik bir hatırlatma',
    net: 'Net bir hatırlatma',
    sert: 'Profesyonel ve kararlı hatırlatma',
  };

  const toneEnMap: Record<MessageTone, string> = {
    nazik: 'Polite reminder',
    net: 'Direct reminder',
    sert: 'Firm but professional reminder',
  };

  const ctxTr = `${input.amount.toFixed(2)} ${input.currency} tutarlı ödeme ${input.overdue_days} gündür gecikmede.`;
  const ctxEn = `The payment of ${input.amount.toFixed(2)} ${input.currency} is overdue by ${input.overdue_days} days.`;

  return {
    whatsapp_tr: `${toneTrMap[input.tone]}: Merhaba ${input.contact}, ${ctxTr} Uygun olduğunuzda ödeme planını teyit edebilir misiniz?`,
    email_tr: `Konu: Geciken ödeme hatırlatması

Sayın ${input.contact},
${ctxTr}
Ödeme tarihini paylaşmanızı rica ederiz.

Teşekkürler.`,
    whatsapp_en: `${toneEnMap[input.tone]}: Hello ${input.contact}, ${ctxEn} Could you confirm your payment plan?`,
    email_en: `Subject: Overdue payment reminder

Dear ${input.contact},
${ctxEn}
Please share your expected transfer date.

Thank you.`,
  };
}
