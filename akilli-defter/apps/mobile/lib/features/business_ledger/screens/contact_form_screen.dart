import 'package:flutter/material.dart';

import '../../../core/design_system/components.dart';
import '../../../core/design_system/tokens.dart';
import '../../../l10n/app_localizations.dart';
import '../data/business_controller.dart';
import '../models/business_models.dart';

class ContactFormScreen extends StatefulWidget {
  const ContactFormScreen({required this.controller, super.key, this.current});

  final BusinessController controller;
  final ContactModel? current;

  @override
  State<ContactFormScreen> createState() => _ContactFormScreenState();
}

class _ContactFormScreenState extends State<ContactFormScreen> {
  late ContactKind kind;
  late final TextEditingController name;
  late final TextEditingController email;

  @override
  void initState() {
    super.initState();
    kind = widget.current?.kind ?? ContactKind.customer;
    name = TextEditingController(text: widget.current?.name ?? '');
    email = TextEditingController(text: widget.current?.email ?? '');
  }

  @override
  void dispose() {
    name.dispose();
    email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AppScaffold(
      title: widget.current == null ? l10n.addContact : l10n.editContact,
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.x2),
        children: [
          AppCard(
            child: Column(
              children: [
                DropdownButtonFormField<ContactKind>(
                  value: kind,
                  items: [
                    DropdownMenuItem(value: ContactKind.customer, child: Text(l10n.customer)),
                    DropdownMenuItem(value: ContactKind.supplier, child: Text(l10n.supplier)),
                  ],
                  onChanged: (v) => setState(() => kind = v ?? kind),
                  decoration: InputDecoration(labelText: l10n.kind),
                ),
                const SizedBox(height: AppSpacing.x2),
                TextField(controller: name, decoration: InputDecoration(labelText: l10n.name)),
                const SizedBox(height: AppSpacing.x2),
                TextField(controller: email, decoration: InputDecoration(labelText: l10n.email)),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.x2),
          PrimaryButton(
            label: l10n.save,
            onPressed: () async {
              await widget.controller.saveContact(
                id: widget.current?.id,
                name: name.text,
                kind: kind,
                email: email.text,
              );
              if (mounted) Navigator.pop(context);
            },
          ),
          if (widget.current != null) ...[
            const SizedBox(height: AppSpacing.x1),
            SecondaryButton(
              label: l10n.delete,
              onPressed: () async {
                await widget.controller.deleteContact(widget.current!.id);
                if (mounted) Navigator.pop(context);
              },
            ),
          ],
        ],
      ),
    );
  }
}
