import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:tire_toplu_alim/app_config.dart';
import 'package:tire_toplu_alim/screens/create_campaign_screen.dart';
import 'package:tire_toplu_alim/screens/home_screen.dart';
import 'package:tire_toplu_alim/screens/profile_screen.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await MobileAds.instance.initialize();

  final initError = await _initializeSupabase();
  runApp(TopluAlimApp(initError: initError));
}

Future<String?> _initializeSupabase() async {
  final url = AppConfig.supabaseUrl.trim();
  final anonKey = AppConfig.supabaseAnonKey.trim();

  final hasPlaceholderValues =
      url.contains('YOUR_PROJECT') || anonKey.contains('YOUR_SUPABASE_ANON_KEY');

  if (url.isEmpty || anonKey.isEmpty || hasPlaceholderValues) {
    return 'Supabase ayarları eksik görünüyor. '
        'Lütfen lib/app_config.dart içindeki supabaseUrl ve supabaseAnonKey değerlerini güncelleyin.';
  }

  try {
    await Supabase.initialize(url: url, anonKey: anonKey);
    return null;
  } catch (_) {
    return 'Supabase başlatılamadı. Lütfen URL ve anon key bilgilerini kontrol edin.';
  }
}

class TopluAlimApp extends StatelessWidget {
  const TopluAlimApp({super.key, this.initError});

  final String? initError;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      onGenerateTitle: (context) => AppLocalizations.of(context).appName,
      locale: const Locale('tr'),
      supportedLocales: const [Locale('tr'), Locale('en')],
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
      ),
      home: initError != null
          ? FriendlyErrorScreen(message: initError!)
          : StreamBuilder<AuthState>(
              stream: Supabase.instance.client.auth.onAuthStateChange,
              builder: (context, _) {
                final session = Supabase.instance.client.auth.currentSession;
                if (session == null) {
                  return const ProfileScreen();
                }
                return const HomeScaffold();
              },
            ),
    );
  }
}

class HomeScaffold extends StatelessWidget {
  const HomeScaffold({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.appName),
        actions: [
          IconButton(
            tooltip: l10n.createCampaign,
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const CreateCampaignScreen(),
                ),
              );
            },
            icon: const Icon(Icons.add_circle_outline),
          ),
        ],
      ),
      body: const HomeScreen(),
    );
  }
}

class FriendlyErrorScreen extends StatelessWidget {
  const FriendlyErrorScreen({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.settings_suggest_outlined,
                size: 72,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 16),
              Text(
                l10n.appNotConfigured,
                style: Theme.of(context).textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(message, textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}
