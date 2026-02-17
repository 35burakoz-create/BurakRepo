import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

enum LegalDocType {
  terms,
  privacy,
  disclaimer,
  guidelines,
  sponsoredDisclosure,
}

class LegalDocScreen extends StatelessWidget {
  const LegalDocScreen({super.key, required this.type});

  final LegalDocType type;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final title = switch (type) {
      LegalDocType.terms => l10n.terms,
      LegalDocType.privacy => l10n.privacy,
      LegalDocType.disclaimer => l10n.disclaimer,
      LegalDocType.guidelines => l10n.guidelines,
      LegalDocType.sponsoredDisclosure => l10n.sponsoredDisclosure,
    };

    final content = switch (type) {
      LegalDocType.terms => l10n.termsDoc,
      LegalDocType.privacy => l10n.privacyDoc,
      LegalDocType.disclaimer => l10n.disclaimerDoc,
      LegalDocType.guidelines => l10n.guidelinesDoc,
      LegalDocType.sponsoredDisclosure => l10n.sponsoredDisclosureDoc,
    };

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: SelectableText(content),
      ),
    );
  }
}
