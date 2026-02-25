import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:tire_toplu_alim/l10n/app_localizations.dart';
import 'package:tire_toplu_alim/app_config.dart';
import 'package:tire_toplu_alim/screens/home_screen.dart';
import 'package:tire_toplu_alim/screens/legal_doc_screen.dart';
import 'package:tire_toplu_alim/screens/pickup_point_sponsor_packages_screen.dart';
import 'package:tire_toplu_alim/services/audit_event_service.dart';
import 'package:tire_toplu_alim/services/supabase_service.dart';

const _legalVersion = 'v1.0.0';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nicknameController = TextEditingController(text: 'Demo Kullanıcı');
  final _neighborhoodController = TextEditingController(text: 'Merkez');

  bool _loading = true;
  bool _saving = false;
  bool _acceptedLegal = false;
  bool _needsLegalAcceptance = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _prepareProfile();
  }

  @override
  void dispose() {
    _nicknameController.dispose();
    _neighborhoodController.dispose();
    super.dispose();
  }

  Future<void> _prepareProfile() async {
    try {
      final user = await _ensureSignedInUser();
      final profile = await SupabaseService.client
          .from('profiles')
          .select('nickname, neighborhood, accepted_legal_at, city_id')
          .eq('id', user.id)
          .maybeSingle();

      if (profile != null) {
        _nicknameController.text =
            (profile['nickname'] as String?)?.trim().isNotEmpty == true
                ? profile['nickname'] as String
                : _nicknameController.text;
        _neighborhoodController.text =
            (profile['neighborhood'] as String?)?.trim().isNotEmpty == true
                ? profile['neighborhood'] as String
                : _neighborhoodController.text;

        final acceptedAt = profile['accepted_legal_at'] as String?;
        if (acceptedAt != null && acceptedAt.isNotEmpty) {
          _needsLegalAcceptance = false;
          _acceptedLegal = true;
        }
      }
    } catch (e) {
      _error = 'Profil hazırlanamıyor: $e';
    } finally {
      if (!mounted) return;
      setState(() {
        _loading = false;
      });
    }
  }

  Future<dynamic> _ensureSignedInUser() async {
    final auth = SupabaseService.client.auth;

    if (auth.currentSession != null && auth.currentUser != null) {
      return auth.currentUser!;
    }

    final signInResponse = await auth.signInAnonymously();
    final user = signInResponse.user ?? auth.currentUser;

    if (user == null || auth.currentSession == null) {
      throw Exception('Anonim kullanıcı oturumu açılamadı.');
    }

    return user;
  }

  Future<void> _saveProfile() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    if (_needsLegalAcceptance && !_acceptedLegal) {
      setState(() {
        _error = 'Devam etmek için yasal metinleri kabul etmelisiniz.';
      });
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final user = SupabaseService.client.auth.currentUser;
      if (user == null) {
        throw Exception('Oturum bulunamadı.');
      }

      final payload = <String, dynamic>{
        'id': user.id,
        'nickname': _nicknameController.text.trim(),
        'neighborhood': _neighborhoodController.text.trim(),
        'city_id': AppConfig.defaultCityId,
      };

      if (_needsLegalAcceptance) {
        payload['accepted_legal_at'] = DateTime.now().toUtc().toIso8601String();
        payload['accepted_legal_version'] = _legalVersion;
      }

      await SupabaseService.client.from('profiles').upsert(payload);

      await AuditEventService.logUserAction(
        action: 'profile_update',
        entityType: 'profile',
        entityId: user.id,
        cityId: AppConfig.defaultCityId,
        actorNickname: _nicknameController.text.trim(),
        payload: {'neighborhood': _neighborhoodController.text.trim()},
      );

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(builder: (_) => const _HomeLandingScreen()),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Profil kaydedilemedi: $e';
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _saving = false;
      });
    }
  }

  void _openLegal(LegalDocType type) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => LegalDocScreen(type: type),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(title: Text(AppLocalizations.of(context).profile)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: _nicknameController,
                decoration: InputDecoration(labelText: AppLocalizations.of(context).nickname),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Takma ad zorunludur.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _neighborhoodController,
                decoration: InputDecoration(labelText: AppLocalizations.of(context).neighborhood),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Mahalle zorunludur.';
                  }
                  return null;
                },
              ),
              if (_needsLegalAcceptance) ...[
                const SizedBox(height: 12),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _acceptedLegal,
                  onChanged: _saving
                      ? null
                      : (value) {
                          setState(() {
                            _acceptedLegal = value ?? false;
                          });
                        },
                  title: const Text(
                    'Kullanım Koşulları ve Gizlilik Politikasını okudum, kabul ediyorum.',
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Text(AppLocalizations.of(context).legal, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  OutlinedButton(
                    onPressed: () => _openLegal(LegalDocType.terms),
                    child: Text(AppLocalizations.of(context).terms),
                  ),
                  OutlinedButton(
                    onPressed: () => _openLegal(LegalDocType.privacy),
                    child: Text(AppLocalizations.of(context).privacy),
                  ),
                  OutlinedButton(
                    onPressed: () => _openLegal(LegalDocType.disclaimer),
                    child: Text(AppLocalizations.of(context).disclaimer),
                  ),
                  OutlinedButton(
                    onPressed: () => _openLegal(LegalDocType.guidelines),
                    child: Text(AppLocalizations.of(context).guidelines),
                  ),
                  OutlinedButton(
                    onPressed: () =>
                        _openLegal(LegalDocType.sponsoredDisclosure),
                    child: Text(AppLocalizations.of(context).sponsoredDisclosure),
                  ),
                ],
              ),

              if (kDebugMode) ...[
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const PickupPointSponsorPackagesScreen(),
                      ),
                    );
                  },
                  child: Text(AppLocalizations.of(context).sponsorPackagesDebug),
                ),
              ],

              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _saving ? null : _saveProfile,
                  child: _saving
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(AppLocalizations.of(context).saveProfileContinue),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeLandingScreen extends StatelessWidget {
  const _HomeLandingScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(AppLocalizations.of(context).appName)),
      body: const HomeScreen(),
    );
  }
}
