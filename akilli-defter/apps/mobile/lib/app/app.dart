import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../core/design_system/app_theme.dart';
import '../features/auth/auth_screen.dart';
import '../features/business_ledger/screens/business_ledger_shell.dart';
import '../features/personal_wallet/screens/personal_wallet_shell.dart';
import '../l10n/app_localizations.dart';
import 'app_state.dart';

class DuoLedgerApp extends StatelessWidget {
  const DuoLedgerApp({required this.state, super.key});

  final AppState state;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: state,
      builder: (context, _) {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          onGenerateTitle: (context) {
            final l10n = AppLocalizations.of(context);
            return state.locale.languageCode == 'tr'
                ? 'Akıllı Defter – Akıllı Para Yönetimi'
                : l10n.appName;
          },
          locale: state.locale,
          supportedLocales: const [Locale('tr'), Locale('en')],
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          themeMode: state.themeMode,
          theme: AppTheme.light(),
          darkTheme: AppTheme.dark(),
          home: AnimatedSwitcher(
            duration: const Duration(milliseconds: 260),
            transitionBuilder: (child, animation) {
              final slide = Tween<Offset>(begin: const Offset(0, 0.04), end: Offset.zero).animate(animation);
              return FadeTransition(opacity: animation, child: SlideTransition(position: slide, child: child));
            },
            child: state.isAuthenticated
                ? (state.workspace == WorkspaceType.business || !state.entitlements.canUsePersonal
                    ? BusinessLedgerShell(
                        key: const ValueKey('business-ledger'),
                        appState: state,
                        readOnly: state.entitlements.businessReadOnly,
                        canUseFxScenario: state.entitlements.canUseFxScenario,
                        canUseProfitability: state.entitlements.canUseProfitability,
                        canUseCollectionsMessaging: state.entitlements.canUseCollectionsMessaging,
                      )
                    : PersonalWalletShell(key: const ValueKey('wallet'), appState: state))
                : AuthScreen(key: const ValueKey('auth'), state: state),
          ),
        );
      },
    );
  }
}
