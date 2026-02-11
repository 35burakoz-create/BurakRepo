import 'package:flutter/material.dart';

import '../../app/app_state.dart';
import '../../core/design_system/components.dart';
import '../../core/design_system/tokens.dart';
import '../settings/settings_screen.dart';
import '../../l10n/app_localizations.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({required this.state, super.key});

  final AppState state;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _aiEnabledConsent = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AppScaffold(
      title: l10n.appName,
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.x2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Spacer(),
            Text(l10n.welcomeTitle, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: AppSpacing.x1),
            Text(l10n.welcomeSubtitle),
            const SizedBox(height: AppSpacing.x3),
            AppCard(
              child: Column(
                children: [
                  TextField(
                    controller: _emailController,
                    decoration: InputDecoration(labelText: l10n.email),
                  ),
                  const SizedBox(height: AppSpacing.x2),
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: InputDecoration(labelText: l10n.password),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.x2),
            Text(l10n.demoSignInHint, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: AppSpacing.x2),
            SegmentedButton<UserRole>(
              segments: [
                ButtonSegment(value: UserRole.owner, label: Text(l10n.owner)),
                ButtonSegment(value: UserRole.member, label: Text(l10n.member)),
                ButtonSegment(value: UserRole.accountant, label: Text(l10n.accountant)),
              ],
              selected: {widget.state.role},
              onSelectionChanged: (value) {
                widget.state.setRole(value.first);
              },
            ),
            const SizedBox(height: AppSpacing.x2),
            if (!widget.state.consentAccepted)
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SectionHeader(title: l10n.privacyOnboardingTitle),
                    Text(l10n.privacyOnboardingSummary),
                    const SizedBox(height: AppSpacing.x1),
                    SwitchListTile(
                      value: _aiEnabledConsent,
                      contentPadding: EdgeInsets.zero,
                      onChanged: (v) => setState(() => _aiEnabledConsent = v),
                      title: Text(l10n.enableAiFeatures),
                      subtitle: Text(l10n.aiConsentDataSummary),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: AppSpacing.x2),
            PrimaryButton(
              label: l10n.signIn,
              onPressed: () async {
                if (!widget.state.consentAccepted) {
                  await widget.state.acceptConsent(aiEnabledValue: _aiEnabledConsent);
                }
                await widget.state.signIn();
              },
            ),
            const SizedBox(height: AppSpacing.x1),
            SecondaryButton(
              label: l10n.settings,
              onPressed: () {
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => SettingsScreen(state: widget.state)));
              },
            ),
            const Spacer(flex: 2),
          ],
        ),
      ),
    );
  }
}
