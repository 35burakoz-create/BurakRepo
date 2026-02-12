import 'package:flutter/widgets.dart';

class AppLocalizations {
  AppLocalizations(this.locale);

  final Locale locale;

  static const supportedLocales = [Locale('tr'), Locale('en')];

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  static AppLocalizations of(BuildContext context) {
    final localization = Localizations.of<AppLocalizations>(context, AppLocalizations);
    assert(localization != null, 'No AppLocalizations found in context');
    return localization!;
  }

  static const Map<String, Map<String, String>> _values = {
    'tr': {
      'appName': 'Akıllı Defter – Akıllı Para Yönetimi',
      'welcomeTitle': 'Duo Ledger\'a hoş geldiniz',
      'welcomeSubtitle': 'Kişisel ve ihracat finansınızı tek yerden yönetin.',
      'email': 'E-posta',
      'password': 'Şifre',
      'signIn': 'Giriş Yap',
      'demoSignInHint': 'Demo için herhangi bir e-posta/şifre girin.',
      'workspace': 'Çalışma Alanı',
      'personalWorkspace': 'Kişisel Cüzdan',
      'businessWorkspace': 'İhracat Defteri',
      'dashboard': 'Gösterge paneli',
      'quickActions': 'Hızlı işlemler',
      'addIncome': 'Gelir Ekle',
      'addExpense': 'Gider Ekle',
      'viewReports': 'Raporları Gör',
      'recentTransactions': 'Son İşlemler',
      'emptyTransactions': 'Henüz işlem yok',
      'emptyTransactionsSubtitle': 'İlk gelir/gider kaydınızı ekleyerek başlayın.',
      'settings': 'Ayarlar',
      'language': 'Dil',
      'theme': 'Tema',
      'darkMode': 'Koyu Mod',
      'privacy': 'Gizlilik',
      'privacyDescription': 'Yapay zekâ çağrılarında kişisel veriler maskelenir.',
      'signOut': 'Çıkış Yap',
      'weeklyInsight': 'Haftalık özet burada görünecek',
      'overdueCollections': 'Geciken tahsilatlar',
      'followUpDraft': 'Takip mesajı taslağı oluştur',
      'edit': 'Düzenle',
      'duplicate': 'Kopyala',
      'home': 'Ana Sayfa',
      'transactions': 'İşlemler',
      'budgets': 'Bütçeler',
      'totalBalance': 'Toplam Bakiye',
      'thisWeekSpending': 'Bu hafta harcama',
      'upcomingBills': 'Yaklaşan Ödemeler',
      'aiInsightOfWeek': 'Haftanın yapay zekâ özeti',
      'items': 'adet',
      'searchTransactions': 'İşlemlerde ara',
      'all': 'Tümü',
      'income': 'Gelir',
      'expense': 'Gider',
      'transfer': 'Transfer',
      'addTransaction': 'İşlem Ekle',
      'noBudgets': 'Henüz bütçe yok',
      'addBudgetHint': 'Kategori bütçesi ekleyerek başlayın',
      'budgetAlert': 'Bütçe limiti aşıldı',
      'online': 'Çevrimiçi',
      'offline': 'Çevrimdışı',
      'editTransaction': 'İşlem Düzenle',
      'type': 'Tür',
      'account': 'Hesap',
      'currency': 'Para Birimi',
      'category': 'Kategori',
      'amount': 'Tutar',
      'date': 'Tarih',
      'note': 'Not',
      'attachments': 'Ekler',
      'attachmentsPlaceholder': 'Makbuz/fatura yükleme yakında',
      'save': 'Kaydet',
      'delete': 'Sil',
      'aiFallbackSummary': 'Yapay zekâ özeti şu anda kullanılamıyor; son işlemleriniz baz alınır.',
      'aiFallbackSuggestion': 'Yapay zekâ önerisi alınamadı. Kategoriyi manuel seçebilirsiniz.',
      'aiSuggestCategory': 'AI öneri al',
      'aiCategorySuggestion': 'Yapay zekâ önerisi',
      'dailyAiAllowance': 'Günlük AI hakkı',
      'aiFreeLimitTooltip': 'Ücretsiz sürümde AI sınırlıdır. Ama raporlar ve hesaplamalar sınırsızdır.',
      'aiQuotaModalTitle': 'AI hakkın bugün bitti',
      'aiQuotaModalBody': 'Yarın tekrar 2 hak tanımlanır. İstersen Pro ile artırabilirsin.',
      'reviewProPlan': "Pro'yu İncele",
      'ok': 'Tamam',
      'confidence': 'Güven',
      'loading': 'Yükleniyor...',
      'owner': 'Sahip',
      'member': 'Üye',
      'accountant': 'Muhasebeci',
      'contacts': 'Kişiler',
      'collections': 'Tahsilatlar',
      'totalReceivables': 'Toplam Alacak',
      'overdueCount': 'Geciken tahsilat',
      'upcomingCollections': 'Yaklaşan Tahsilatlar',
      'fxExposureSnapshot': 'Döviz risk özeti',
      'dealDetail': 'Anlaşma detayı',
      'openDeal': 'Anlaşmayı Aç',
      'addContact': 'Kişi Ekle',
      'editContact': 'Kişiyi Düzenle',
      'customer': 'Müşteri',
      'supplier': 'Tedarikçi',
      'kind': 'Tür',
      'name': 'Ad',
      'incoterm': 'Teslim Şekli (Incoterm)',
      'expectedMargin': 'Beklenen Marj',
      'searchCollections': 'Tahsilatlarda ara',
      'overdue': 'Geciken',
      'upcoming': 'Yaklaşan',
      'collected': 'Tahsil Edildi',
      'noContacts': 'Henüz kişi yok',
      'addContactHint': 'İlk müşteri/tedarikçiyi ekleyin',
      'noCollections': 'Tahsilat kaydı yok',
      'collectionsHint': 'Fatura taksitleri burada görünür',
      'suggestFollowUpMessage': 'Takip Mesajı Öner',
      'collectionMessageDraft': 'Tahsilat takip mesajı taslağı',
      'toneNazik': 'Nazik',
      'toneNet': 'Net',
      'toneSert': 'Sert',
      'copiedToClipboard': 'Panoya kopyalandı',
      'whatsappTr': 'WhatsApp (TR)',
      'emailTr': 'E-posta (TR)',
      'whatsappEn': 'WhatsApp (EN)',
      'emailEn': 'E-posta (EN)',
      'reports': 'Raporlar',
      'costAllocations': 'Maliyet Dağılımları',
      'addAllocation': 'Dağılım Ekle',
      'noAllocations': 'Henüz maliyet dağılımı yok',
      'reportingCurrency': 'Raporlama para birimi',
      'noReportRows': 'Rapor satırı yok',
      'noReportRowsHint': 'Önce tahsilat ve maliyet ekleyin',
      'revenue': 'Gelir',
      'allocatedCost': 'Dağıtılan Maliyet',
      'realizedMargin': 'Gerçekleşen Marj',
      'receivables': 'Tahsilat',
      'payables': 'Ödeme',
      'netExposure': 'Net Etki',
      'fxExposureEmpty': 'Henüz döviz hareketi yok',
      'fxScenarioTitle': 'Kur Senaryosu',
      'fxScenarioCurrency': 'Senaryo Para Birimi',
      'fxScenarioChangePercent': 'Değişim (%)',
      'fxScenarioCashflowImpact': 'Tahmini nakit etkisi',
      'fxScenarioMarginImpact': 'Tahmini marj etkisi',
      'fxScenarioMarginNoData': 'Marj verisi yok, sadece alacak/ödeme etkisi gösterildi.',
      'fxScenarioTooltip': 'Bu hesaplama basitleştirilmiş bir senaryodur. Seçtiğiniz para birimindeki alacak ve ödemelere oransal değişim uygulanır.',
      'fxScenarioAssumption': 'Varsayım: Seçilen dövizdeki tutarlara aynı oranda artış/azalış uygulanır.',
      'fxScenarioDisclaimer': 'Bu araç yalnızca hızlı bir öngörü sağlar; yatırım tavsiyesi değildir.',
      'guidedTour': 'Rehberli Tur',
      'skipTour': 'Turu Geç',
      'tourCompleteStep': 'Adımı Tamamla',
      'tourStepOneTitle': '1/3 • Yapay zekâ ile işlem ekleme',
      'tourStepOneBody': 'İşlemler sekmesine geçin, yeni bir işlem ekleyin ve "Yapay zekâ ile öner" düğmesine dokunun.',
      'tourStepTwoTitle': '2/3 • Haftalık yapay zekâ özetini görüntüleme',
      'tourStepTwoBody': 'Ana sayfadaki haftalık yapay zekâ özetini inceleyin. Yapay zekâ kapalıysa güvenli yedek metin gösterilir.',
      'tourStepThreeTitle': '3/3 • Geciken tahsilat için takip mesajı',
      'tourStepThreeBody': 'İhracat Defteri > Tahsilatlar ekranında geciken kaydı açıp "Takip Mesajı Öner" ile mesaj taslağı üretin.',
      'enableAiFeatures': 'Yapay zekâ özelliklerini etkinleştir',
      'aiConsentDataSummary': 'Yapay zekâ özelliği, yalnızca maskeleme uygulanmış işlem metnini gönderir. Bu özelliği Ayarlar ekranından dilediğiniz zaman kapatabilirsiniz.',
      'privacyOnboardingTitle': 'Gizlilik özeti',
      'privacyOnboardingSummary': 'Verileriniz çalışma alanına göre ayrıştırılır. Yapay zekâya gönderilen metinler maskelemeden geçirilir. Ayrıntılar için Gizlilik Politikası sayfasını inceleyin.',
      'privacySecurity': 'Gizlilik ve güvenlik',
      'privacySecurityBody': 'Uygulama, KVKK/GDPR ilkelerine uyum için veri minimizasyonu uygular. Yapay zekâ çağrılarında ham kişisel veri loglanmaz. Yerel önbelleği temizleyebilirsiniz.',
      'termsOfUse': 'Kullanım şartları',
      'termsBody': 'Bu uygulama bilgilendirme amaçlıdır. Finansal, hukuki veya vergisel danışmanlık yerine geçmez. Kullanıcı, kayıtlarından sorumludur.',
      'privacyPolicy': 'Gizlilik politikası',
      'privacyPolicyBody': 'Toplanan veriler: hesap, işlem, bütçe, cari kayıtları ve kullanıcı tercihleri. Yapay zekâ çağrılarında metin maskelemesi uygulanır. Silme talebiyle veriler kaldırılabilir.',
      'aiDisclaimerTitle': 'Yapay zekâ sorumluluk reddi',
      'aiDisclaimerBody': 'Yapay zekâ çıktıları öneridir; kesin karar değildir. Önemli finansal ve vergisel kararlarınızı uzman görüşüyle doğrulayın.',
      'dataManagement': 'Veri yönetimi',
      'attachmentStorage': 'Ek depolama',
      'cloudOnlyRecommended': 'Yalnızca bulut (önerilen)',
      'deviceOnlyMode': 'Yalnızca cihaz',
      'imageCompressionInfo': 'Görseller yükleme öncesi sıkıştırılır (JPEG/WebP, üst sınır uygulanır).',
      'cacheLimitInfo': 'Yerel önbellek sınırı: yaklaşık 200MB. Gerektiğinde temizleyin.',
      'exportMyData': 'Verilerimi Dışa Aktar',
      'operationFailed': 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
      'clearLocalCache': 'Yerel önbelleği temizle',
      'cacheCleared': 'Önbellek temizlendi',
      'deleteAccountAllData': 'Hesabı ve tüm verileri sil',
      'deleteAccountWarning': 'Sahibi olduğunuz çalışma alanlarındaki tüm veriler kalıcı olarak silinir. Üye olduğunuz alanlardan üyelik kaldırılır.',
      'confirmDeletion': 'Silmeyi onayla',
      'typeDeletePrompt': 'Devam etmek için DELETE yazın.',
      'cancel': 'İptal',
      'confirm': 'Onayla',
      'notFinancialAdvice': 'Bu içerik finansal veya vergisel danışmanlık değildir.',
      'planAndBilling': 'Plan ve ödeme',
      'currentPlan': 'Mevcut plan',
      'planComparison': 'Plan karşılaştırması',
      'planComparisonBody': 'Aşağıdaki tablo, Ücretsiz / Personal Premium / Business plan haklarını gösterir.',
      'upgradeToPersonalPremium': 'Personal Premium\'a geç',
      'upgradeToBusinessPlan': 'Business Plan\'a geç',
      'restorePurchases': 'Satın alımı geri yükle',
      'upgradePlan': 'Planı yükselt',
      'featureLockedUpgrade': 'Bu özellik mevcut planınızda kilitli. Devam etmek için planınızı yükseltin.',
      'cloudSyncLocked': 'Bulut eşitleme mevcut planınızda kilitli.',
      'enabled': 'Açık',
      'deviceLock': 'Cihaz kilidi',
      'planNameFree': 'Ücretsiz',
      'planNamePersonalPremium': 'Personal Premium',
      'planNameBusiness': 'Business',
      'planLineFree': 'Ücretsiz: Kişisel alanda temel özellikler + İş alanında salt okunur demo + yapay zekâ kotası: 30/2/10/0',
      'planLinePersonalPremium': 'Personal Premium: Kişisel alanda tüm özellikler + İş alanında salt okunur demo + yapay zekâ kotası: 300/5/100/0',
      'planLineBusiness': 'Business: İş alanında tüm özellikler + Kişisel alan kapalı + yapay zekâ kotası: 500/5/300/200',
      'aiQuotaCategorize': 'Kategori önerisi',
      'aiQuotaWeeklySummary': 'Haftalık özet',
      'aiQuotaNlQuery': 'Doğal dil sorgusu',
      'aiQuotaCollectionMessage': 'Tahsilat mesajı',
      'couponPromoCode': 'Kupon / Promosyon Kodu',
      'couponIntro': 'Google Play kuralları gereği promosyon kodları uygulama içinde doğrulanmaz. Kodu Play Store üzerinden kullanın.',
      'couponStep1': 'Google Play Store > Ödemeler ve abonelikler > Kodu kullan adımlarını izleyin.',
      'couponStep2': 'Kodu kullandıktan sonra uygulamaya dönüp "Satın alımı geri yükle" ve "Durumu yenile" düğmelerine dokunun.',
      'couponCopyInstructions': 'Yönergeleri kopyala',
      'couponInstructionsCopied': 'Yönergeler panoya kopyalandı.',
      'couponCodeEnteredLabel': 'Kodu Play Store\'da kullandım',
      'couponNoDirectValidation': 'Bu ekran kodu doğrudan doğrulamaz. Erişim hakları, mağaza geri yükleme/yenileme sonrası güncellenir.',
      'couponRefreshStatus': 'Durumu yenile',
      'couponRestoreSuccess': 'Satın alma geri yüklendi ve plan durumu güncellendi.',
      'couponRestoreFailed': 'Satın alma geri yüklenemedi. Play hesabınızı kontrol edip tekrar deneyin.',
      'couponRefreshSuccess': 'Plan durumu güncellendi.',
      'couponRefreshFailed': 'Plan durumu yenilenemedi. Lütfen tekrar deneyin.',
      'accountDeletionWebInfo': 'Hesap silme talebini web üzerinden de gönderebilirsiniz:',
      'accountDeletionUrl': 'https://example.com/account-deletion-request',
      'copyDeletionLink': 'Silme bağlantısını kopyala',
      'deletionLinkCopied': 'Silme bağlantısı panoya kopyalandı.',
      'sendTestCrash': '(Gizli) Test çökmesi gönder',
    },
    'en': {
      'appName': 'Duo Ledger',
      'welcomeTitle': 'Welcome to Duo Ledger',
      'welcomeSubtitle': 'Manage personal and export finance in one place.',
      'email': 'Email',
      'password': 'Password',
      'signIn': 'Sign in',
      'demoSignInHint': 'For demo, enter any email/password.',
      'workspace': 'Workspace',
      'personalWorkspace': 'Personal Wallet',
      'businessWorkspace': 'Business Export Ledger',
      'dashboard': 'Dashboard',
      'quickActions': 'Quick actions',
      'addIncome': 'Add income',
      'addExpense': 'Add expense',
      'viewReports': 'View reports',
      'recentTransactions': 'Recent transactions',
      'emptyTransactions': 'No transactions yet',
      'emptyTransactionsSubtitle': 'Start by adding your first income/expense.',
      'settings': 'Settings',
      'language': 'Language',
      'theme': 'Theme',
      'darkMode': 'Dark mode',
      'privacy': 'Privacy',
      'privacyDescription': 'PII is masked for AI calls.',
      'signOut': 'Sign out',
      'weeklyInsight': 'Weekly insight will appear here',
      'overdueCollections': 'Overdue collections',
      'followUpDraft': 'Create follow-up draft',
      'edit': 'Edit',
      'duplicate': 'Duplicate',
      'home': 'Home',
      'transactions': 'Transactions',
      'budgets': 'Budgets',
      'totalBalance': 'Total Balance',
      'thisWeekSpending': 'This Week Spending',
      'upcomingBills': 'Upcoming Bills',
      'aiInsightOfWeek': 'AI Insight of the Week',
      'items': 'items',
      'searchTransactions': 'Search transactions',
      'all': 'All',
      'income': 'Income',
      'expense': 'Expense',
      'transfer': 'Transfer',
      'addTransaction': 'Add Transaction',
      'noBudgets': 'No budgets yet',
      'addBudgetHint': 'Start by adding category budgets',
      'budgetAlert': 'Budget limit exceeded',
      'online': 'Online',
      'offline': 'Offline',
      'editTransaction': 'Edit Transaction',
      'type': 'Type',
      'account': 'Account',
      'currency': 'Currency',
      'category': 'Category',
      'amount': 'Amount',
      'date': 'Date',
      'note': 'Note',
      'attachments': 'Attachments',
      'attachmentsPlaceholder': 'Receipt/invoice upload coming soon',
      'save': 'Save',
      'delete': 'Delete',
      'aiFallbackSummary': 'AI summary is unavailable; using recent transaction context.',
      'aiFallbackSuggestion': 'Could not fetch AI suggestion; continue manually.',
      'aiSuggestCategory': 'Get AI suggestion',
      'aiCategorySuggestion': 'AI category suggestion',
      'dailyAiAllowance': 'Daily AI allowance',
      'aiFreeLimitTooltip': 'AI is limited in the free version. But reports and calculations are unlimited.',
      'aiQuotaModalTitle': 'Your AI quota is done for today',
      'aiQuotaModalBody': 'You will get 2 new attempts tomorrow. You can increase it with Pro.',
      'reviewProPlan': 'Review Pro',
      'ok': 'OK',
      'confidence': 'Confidence',
      'loading': 'Loading...',
      'owner': 'Owner',
      'member': 'Member',
      'accountant': 'Accountant',
      'contacts': 'Contacts',
      'collections': 'Collections',
      'totalReceivables': 'Total Receivables',
      'overdueCount': 'Overdue Count',
      'upcomingCollections': 'Upcoming Collections',
      'fxExposureSnapshot': 'FX Exposure Snapshot',
      'dealDetail': 'Deal Detail',
      'openDeal': 'Open Deal',
      'addContact': 'Add Contact',
      'editContact': 'Edit Contact',
      'customer': 'Customer',
      'supplier': 'Supplier',
      'kind': 'Kind',
      'name': 'Name',
      'incoterm': 'Incoterm',
      'expectedMargin': 'Expected Margin',
      'searchCollections': 'Search collections',
      'overdue': 'Overdue',
      'upcoming': 'Upcoming',
      'collected': 'Collected',
      'noContacts': 'No contacts yet',
      'addContactHint': 'Add your first customer/supplier',
      'noCollections': 'No collections yet',
      'collectionsHint': 'Invoice schedules will appear here',
      'suggestFollowUpMessage': 'Suggest follow-up message',
      'collectionMessageDraft': 'Collection follow-up draft',
      'toneNazik': 'Polite',
      'toneNet': 'Direct',
      'toneSert': 'Firm',
      'copiedToClipboard': 'Copied to clipboard',
      'whatsappTr': 'WhatsApp (TR)',
      'emailTr': 'Email (TR)',
      'whatsappEn': 'WhatsApp (EN)',
      'emailEn': 'Email (EN)',
      'reports': 'Reports',
      'costAllocations': 'Cost Allocations',
      'addAllocation': 'Add Allocation',
      'noAllocations': 'No cost allocations yet',
      'reportingCurrency': 'Reporting Currency',
      'noReportRows': 'No report rows',
      'noReportRowsHint': 'Add collections and allocations first',
      'revenue': 'Revenue',
      'allocatedCost': 'Allocated Cost',
      'realizedMargin': 'Realized Margin',
      'receivables': 'Receivables',
      'payables': 'Payables',
      'netExposure': 'Net Exposure',
      'fxExposureEmpty': 'No FX movement yet',
      'fxScenarioTitle': 'FX Scenario',
      'fxScenarioCurrency': 'Scenario Currency',
      'fxScenarioChangePercent': 'Change (%)',
      'fxScenarioCashflowImpact': 'Estimated cashflow impact',
      'fxScenarioMarginImpact': 'Estimated margin impact',
      'fxScenarioMarginNoData': 'Margin data is unavailable, showing receivable/payable impact only.',
      'fxScenarioTooltip': 'This is a simplified scenario. A proportional change is applied to receivables and payables in the selected currency.',
      'fxScenarioAssumption': 'Assumption: the same proportional change is applied to selected foreign-currency totals.',
      'fxScenarioDisclaimer': 'For quick planning only, not financial advice.',
      'guidedTour': 'Guided Tour',
      'skipTour': 'Skip Tour',
      'tourCompleteStep': 'Complete Step',
      'tourStepOneTitle': '1/3 • Add a transaction with AI suggestion',
      'tourStepOneBody': 'Go to Transactions, add a new item, and tap "Suggest category with AI".',
      'tourStepTwoTitle': '2/3 • View weekly AI summary',
      'tourStepTwoBody': 'Open Home and review the weekly AI summary card. If AI is unavailable, a safe fallback summary is shown.',
      'tourStepThreeTitle': '3/3 • Follow-up message for overdue collection',
      'tourStepThreeBody': 'In Business Ledger > Collections, open an overdue item and generate a follow-up draft.',
      'enableAiFeatures': 'Enable AI features',
      'aiConsentDataSummary': 'AI only receives masked transaction text. You can disable it anytime from Settings.',
      'privacyOnboardingTitle': 'Privacy Summary',
      'privacyOnboardingSummary': 'Data is scoped by workspace. AI-bound text is masked before sending. See full Privacy Policy for details.',
      'privacySecurity': 'Privacy & Security',
      'privacySecurityBody': 'The app follows data-minimization principles aligned with KVKK/GDPR. Raw personal data is not stored in AI logs. Local cache can be cleared.',
      'termsOfUse': 'Terms of Use',
      'termsBody': 'This app is for informational support only. It is not financial, legal, or tax advice. Users are responsible for their records.',
      'privacyPolicy': 'Privacy Policy',
      'privacyPolicyBody': 'Stored data includes account/transaction/category records and user preferences. AI requests apply masking. Data can be removed on deletion request.',
      'aiDisclaimerTitle': 'AI Disclaimer',
      'aiDisclaimerBody': 'AI outputs are suggestions, not final decisions. Validate important financial/tax decisions with professionals.',
      'dataManagement': 'Data Management',
      'attachmentStorage': 'Attachment Storage',
      'cloudOnlyRecommended': 'Cloud Only (Recommended)',
      'deviceOnlyMode': 'Device Only',
      'imageCompressionInfo': 'Images are compressed before upload (JPEG/WebP with size cap).',
      'cacheLimitInfo': 'Local cache limit: approx. 200MB. Clear when needed.',
      'exportMyData': 'Export My Data',
      'operationFailed': 'Operation failed',
      'clearLocalCache': 'Clear Local Cache',
      'cacheCleared': 'Cache cleared',
      'deleteAccountAllData': 'Delete account and all data',
      'deleteAccountWarning': 'All data in workspaces you own will be permanently deleted. For member workspaces, only membership is removed.',
      'confirmDeletion': 'Confirm Deletion',
      'typeDeletePrompt': 'Type DELETE to continue.',
      'cancel': 'Cancel',
      'confirm': 'Confirm',
      'notFinancialAdvice': 'This content is not financial or tax advice.',
      'planAndBilling': 'Plan & Billing',
      'currentPlan': 'Current Plan',
      'planComparison': 'Plan Comparison',
      'planComparisonBody': 'The table below shows Free / Personal Premium / Business entitlements.',
      'upgradeToPersonalPremium': 'Upgrade to Personal Premium',
      'upgradeToBusinessPlan': 'Upgrade to Business Plan',
      'restorePurchases': 'Restore Purchases',
      'upgradePlan': 'Upgrade Plan',
      'featureLockedUpgrade': 'This feature is locked in your current plan. Please upgrade to continue.',
      'cloudSyncLocked': 'Cloud sync is locked in your current plan.',
      'enabled': 'Enabled',
      'deviceLock': 'Device Lock',
      'planNameFree': 'Free',
      'planNamePersonalPremium': 'Personal Premium',
      'planNameBusiness': 'Business',
      'planLineFree': 'Free: Core Personal features + Business read-only demo + AI quota: 30/2/10/0',
      'planLinePersonalPremium': 'Personal Premium: Full Personal features + Business read-only demo + AI quota: 300/5/100/0',
      'planLineBusiness': 'Business: Full Business features + Personal disabled + AI quota: 500/5/300/200',
      'aiQuotaCategorize': 'Category suggestion',
      'aiQuotaWeeklySummary': 'Weekly summary',
      'aiQuotaNlQuery': 'Natural language query',
      'aiQuotaCollectionMessage': 'Collection message',
      'couponPromoCode': 'Coupon / Promo Code',
      'couponIntro': 'Per Google Play policy, promo codes are not validated directly in-app. Redeem your code in Play Store.',
      'couponStep1': 'Go to Google Play Store > Payments & subscriptions > Redeem code.',
      'couponStep2': 'After redemption, return to the app and tap "Restore Purchases" and "Refresh status".',
      'couponCopyInstructions': 'Copy instructions',
      'couponInstructionsCopied': 'Instructions copied to clipboard.',
      'couponCodeEnteredLabel': 'I redeemed my code in Play Store',
      'couponNoDirectValidation': 'This screen does not validate codes directly. Entitlements update after restore/refresh.',
      'couponRefreshStatus': 'Refresh status',
      'couponRestoreSuccess': 'Purchases restored and plan status updated.',
      'couponRestoreFailed': 'Could not restore purchases. Check your Play account and try again.',
      'couponRefreshSuccess': 'Plan status updated.',
      'couponRefreshFailed': 'Could not refresh plan status. Please try again.',
      'accountDeletionWebInfo': 'You can also submit an account deletion request on the web:',
      'accountDeletionUrl': 'https://example.com/account-deletion-request',
      'copyDeletionLink': 'Copy deletion link',
      'deletionLinkCopied': 'Deletion link copied to clipboard.',
      'sendTestCrash': '(Hidden) Send test crash',
    },
  };

  String _t(String key) => _values[locale.languageCode]?[key] ?? _values['tr']![key]!;

  String get appName => _t('appName');
  String get welcomeTitle => _t('welcomeTitle');
  String get welcomeSubtitle => _t('welcomeSubtitle');
  String get email => _t('email');
  String get password => _t('password');
  String get signIn => _t('signIn');
  String get demoSignInHint => _t('demoSignInHint');
  String get workspace => _t('workspace');
  String get personalWorkspace => _t('personalWorkspace');
  String get businessWorkspace => _t('businessWorkspace');
  String get dashboard => _t('dashboard');
  String get quickActions => _t('quickActions');
  String get addIncome => _t('addIncome');
  String get addExpense => _t('addExpense');
  String get viewReports => _t('viewReports');
  String get recentTransactions => _t('recentTransactions');
  String get emptyTransactions => _t('emptyTransactions');
  String get emptyTransactionsSubtitle => _t('emptyTransactionsSubtitle');
  String get settings => _t('settings');
  String get language => _t('language');
  String get theme => _t('theme');
  String get darkMode => _t('darkMode');
  String get privacy => _t('privacy');
  String get privacyDescription => _t('privacyDescription');
  String get signOut => _t('signOut');
  String get weeklyInsight => _t('weeklyInsight');
  String get overdueCollections => _t('overdueCollections');
  String get followUpDraft => _t('followUpDraft');
  String get edit => _t('edit');
  String get duplicate => _t('duplicate');
  String get home => _t('home');
  String get transactions => _t('transactions');
  String get budgets => _t('budgets');
  String get totalBalance => _t('totalBalance');
  String get thisWeekSpending => _t('thisWeekSpending');
  String get upcomingBills => _t('upcomingBills');
  String get aiInsightOfWeek => _t('aiInsightOfWeek');
  String get items => _t('items');
  String get searchTransactions => _t('searchTransactions');
  String get all => _t('all');
  String get income => _t('income');
  String get expense => _t('expense');
  String get transfer => _t('transfer');
  String get addTransaction => _t('addTransaction');
  String get noBudgets => _t('noBudgets');
  String get addBudgetHint => _t('addBudgetHint');
  String get budgetAlert => _t('budgetAlert');
  String get online => _t('online');
  String get offline => _t('offline');
  String get editTransaction => _t('editTransaction');
  String get type => _t('type');
  String get account => _t('account');
  String get currency => _t('currency');
  String get category => _t('category');
  String get amount => _t('amount');
  String get date => _t('date');
  String get note => _t('note');
  String get attachments => _t('attachments');
  String get attachmentsPlaceholder => _t('attachmentsPlaceholder');
  String get save => _t('save');
  String get delete => _t('delete');
  String get aiFallbackSummary => _t('aiFallbackSummary');
  String get aiFallbackSuggestion => _t('aiFallbackSuggestion');
  String get aiSuggestCategory => _t('aiSuggestCategory');
  String get aiCategorySuggestion => _t('aiCategorySuggestion');
  String get dailyAiAllowance => _t('dailyAiAllowance');
  String get aiFreeLimitTooltip => _t('aiFreeLimitTooltip');
  String get aiQuotaModalTitle => _t('aiQuotaModalTitle');
  String get aiQuotaModalBody => _t('aiQuotaModalBody');
  String get reviewProPlan => _t('reviewProPlan');
  String get ok => _t('ok');
  String get confidence => _t('confidence');
  String get loading => _t('loading');
  String get owner => _t('owner');
  String get member => _t('member');
  String get accountant => _t('accountant');
  String get contacts => _t('contacts');
  String get collections => _t('collections');
  String get totalReceivables => _t('totalReceivables');
  String get overdueCount => _t('overdueCount');
  String get upcomingCollections => _t('upcomingCollections');
  String get fxExposureSnapshot => _t('fxExposureSnapshot');
  String get dealDetail => _t('dealDetail');
  String get openDeal => _t('openDeal');
  String get addContact => _t('addContact');
  String get editContact => _t('editContact');
  String get customer => _t('customer');
  String get supplier => _t('supplier');
  String get kind => _t('kind');
  String get name => _t('name');
  String get incoterm => _t('incoterm');
  String get expectedMargin => _t('expectedMargin');
  String get searchCollections => _t('searchCollections');
  String get overdue => _t('overdue');
  String get upcoming => _t('upcoming');
  String get collected => _t('collected');
  String get noContacts => _t('noContacts');
  String get addContactHint => _t('addContactHint');
  String get noCollections => _t('noCollections');
  String get collectionsHint => _t('collectionsHint');
  String get suggestFollowUpMessage => _t('suggestFollowUpMessage');
  String get collectionMessageDraft => _t('collectionMessageDraft');
  String get toneNazik => _t('toneNazik');
  String get toneNet => _t('toneNet');
  String get toneSert => _t('toneSert');
  String get copiedToClipboard => _t('copiedToClipboard');
  String get whatsappTr => _t('whatsappTr');
  String get emailTr => _t('emailTr');
  String get whatsappEn => _t('whatsappEn');
  String get emailEn => _t('emailEn');
  String get reports => _t('reports');
  String get costAllocations => _t('costAllocations');
  String get addAllocation => _t('addAllocation');
  String get noAllocations => _t('noAllocations');
  String get reportingCurrency => _t('reportingCurrency');
  String get noReportRows => _t('noReportRows');
  String get noReportRowsHint => _t('noReportRowsHint');
  String get revenue => _t('revenue');
  String get allocatedCost => _t('allocatedCost');
  String get realizedMargin => _t('realizedMargin');
  String get receivables => _t('receivables');
  String get payables => _t('payables');
  String get netExposure => _t('netExposure');
  String get fxExposureEmpty => _t('fxExposureEmpty');
  String get fxScenarioTitle => _t('fxScenarioTitle');
  String get fxScenarioCurrency => _t('fxScenarioCurrency');
  String get fxScenarioChangePercent => _t('fxScenarioChangePercent');
  String get fxScenarioCashflowImpact => _t('fxScenarioCashflowImpact');
  String get fxScenarioMarginImpact => _t('fxScenarioMarginImpact');
  String get fxScenarioMarginNoData => _t('fxScenarioMarginNoData');
  String get fxScenarioTooltip => _t('fxScenarioTooltip');
  String get fxScenarioAssumption => _t('fxScenarioAssumption');
  String get fxScenarioDisclaimer => _t('fxScenarioDisclaimer');
  String get guidedTour => _t('guidedTour');
  String get skipTour => _t('skipTour');
  String get tourCompleteStep => _t('tourCompleteStep');
  String get tourStepOneTitle => _t('tourStepOneTitle');
  String get tourStepOneBody => _t('tourStepOneBody');
  String get tourStepTwoTitle => _t('tourStepTwoTitle');
  String get tourStepTwoBody => _t('tourStepTwoBody');
  String get tourStepThreeTitle => _t('tourStepThreeTitle');
  String get tourStepThreeBody => _t('tourStepThreeBody');
  String get enableAiFeatures => _t('enableAiFeatures');
  String get aiConsentDataSummary => _t('aiConsentDataSummary');
  String get privacyOnboardingTitle => _t('privacyOnboardingTitle');
  String get privacyOnboardingSummary => _t('privacyOnboardingSummary');
  String get privacySecurity => _t('privacySecurity');
  String get privacySecurityBody => _t('privacySecurityBody');
  String get termsOfUse => _t('termsOfUse');
  String get termsBody => _t('termsBody');
  String get privacyPolicy => _t('privacyPolicy');
  String get privacyPolicyBody => _t('privacyPolicyBody');
  String get aiDisclaimerTitle => _t('aiDisclaimerTitle');
  String get aiDisclaimerBody => _t('aiDisclaimerBody');
  String get dataManagement => _t('dataManagement');
  String get attachmentStorage => _t('attachmentStorage');
  String get cloudOnlyRecommended => _t('cloudOnlyRecommended');
  String get deviceOnlyMode => _t('deviceOnlyMode');
  String get imageCompressionInfo => _t('imageCompressionInfo');
  String get cacheLimitInfo => _t('cacheLimitInfo');
  String get exportMyData => _t('exportMyData');
  String get operationFailed => _t('operationFailed');
  String get clearLocalCache => _t('clearLocalCache');
  String get cacheCleared => _t('cacheCleared');
  String get deleteAccountAllData => _t('deleteAccountAllData');
  String get deleteAccountWarning => _t('deleteAccountWarning');
  String get confirmDeletion => _t('confirmDeletion');
  String get typeDeletePrompt => _t('typeDeletePrompt');
  String get cancel => _t('cancel');
  String get confirm => _t('confirm');
  String get notFinancialAdvice => _t('notFinancialAdvice');
  String get planAndBilling => _t('planAndBilling');
  String get currentPlan => _t('currentPlan');
  String get planComparison => _t('planComparison');
  String get planComparisonBody => _t('planComparisonBody');
  String get upgradeToPersonalPremium => _t('upgradeToPersonalPremium');
  String get upgradeToBusinessPlan => _t('upgradeToBusinessPlan');
  String get restorePurchases => _t('restorePurchases');
  String get upgradePlan => _t('upgradePlan');
  String get featureLockedUpgrade => _t('featureLockedUpgrade');
  String get cloudSyncLocked => _t('cloudSyncLocked');
  String get deviceLock => _t('deviceLock');
  String get enabled => _t('enabled');
  String get planNameFree => _t('planNameFree');
  String get planNamePersonalPremium => _t('planNamePersonalPremium');
  String get planNameBusiness => _t('planNameBusiness');
  String get planLineFree => _t('planLineFree');
  String get planLinePersonalPremium => _t('planLinePersonalPremium');
  String get planLineBusiness => _t('planLineBusiness');
  String get aiQuotaCategorize => _t('aiQuotaCategorize');
  String get aiQuotaWeeklySummary => _t('aiQuotaWeeklySummary');
  String get aiQuotaNlQuery => _t('aiQuotaNlQuery');
  String get aiQuotaCollectionMessage => _t('aiQuotaCollectionMessage');
  String get couponPromoCode => _t('couponPromoCode');
  String get couponIntro => _t('couponIntro');
  String get couponStep1 => _t('couponStep1');
  String get couponStep2 => _t('couponStep2');
  String get couponCopyInstructions => _t('couponCopyInstructions');
  String get couponInstructionsCopied => _t('couponInstructionsCopied');
  String get couponCodeEnteredLabel => _t('couponCodeEnteredLabel');
  String get couponNoDirectValidation => _t('couponNoDirectValidation');
  String get couponRefreshStatus => _t('couponRefreshStatus');
  String get couponRestoreSuccess => _t('couponRestoreSuccess');
  String get couponRestoreFailed => _t('couponRestoreFailed');
  String get couponRefreshSuccess => _t('couponRefreshSuccess');
  String get couponRefreshFailed => _t('couponRefreshFailed');
  String get accountDeletionWebInfo => _t('accountDeletionWebInfo');
  String get accountDeletionUrl => _t('accountDeletionUrl');
  String get copyDeletionLink => _t('copyDeletionLink');
  String get deletionLinkCopied => _t('deletionLinkCopied');
  String get sendTestCrash => _t('sendTestCrash');

}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['tr', 'en'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) async => AppLocalizations(locale);

  @override
  bool shouldReload(covariant LocalizationsDelegate<AppLocalizations> old) => false;
}
