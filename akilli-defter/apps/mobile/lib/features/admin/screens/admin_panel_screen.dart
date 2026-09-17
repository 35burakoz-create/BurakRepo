import 'package:flutter/material.dart';

import '../data/admin_analytics_repository.dart';
import '../data/admin_plan_service.dart';
import '../../../core/design_system/components.dart';
import '../../../core/design_system/tokens.dart';

class AdminPanelScreen extends StatefulWidget {
  const AdminPanelScreen({super.key});

  @override
  State<AdminPanelScreen> createState() => _AdminPanelScreenState();
}

class _AdminPanelScreenState extends State<AdminPanelScreen> {
  final _analytics = AdminAnalyticsRepository();
  final _planService = AdminPlanService();
  final _email = TextEditingController();

  AdminAnalyticsData? data;
  bool loading = true;
  bool actionLoading = false;
  AdminPlanResult? actionResult;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    data = await _analytics.load();
    if (mounted) setState(() => loading = false);
  }

  Future<void> _callPlan(String action, {String? plan}) async {
    final target = _email.text.trim();
    if (target.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lütfen e-posta gir.')));
      return;
    }

    setState(() => actionLoading = true);
    final result = await _planService.call(action: action, targetEmail: target, plan: plan);
    if (!mounted) return;
    setState(() {
      actionLoading = false;
      actionResult = result;
    });
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result.message ?? 'İşlem tamamlandı.')));
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Mini Admin Panel',
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(AppSpacing.x2),
              children: [
                AppCard(child: Text('Durum: ${data?.connectionText ?? '—'}')),
                if (data?.error != null) ...[
                  const SizedBox(height: AppSpacing.x1),
                  AppCard(child: Text(data!.error!)),
                ],
                _section('Genel', data?.general ?? const []),
                _section('Planlar', data?.plans ?? const []),
                _section('AI Kullanımı', data?.ai ?? const []),
                _section('Kuponlar', data?.coupons ?? const []),
                const SizedBox(height: AppSpacing.x2),
                _vipSection(),
              ],
            ),
    );
  }

  Widget _section(String title, List<MetricItem> rows) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.x2),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SectionHeader(title: title),
            ...rows.map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.x1),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(flex: 2, child: Text(e.label)),
                      Expanded(flex: 3, child: Text(e.value)),
                      if (e.helper != null) Expanded(flex: 2, child: Text(e.helper!, style: const TextStyle(fontSize: 12))),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Widget _vipSection() {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(title: 'VIP Yönetimi'),
          TextField(
            controller: _email,
            decoration: const InputDecoration(labelText: 'Hedef e-posta'),
          ),
          const SizedBox(height: AppSpacing.x1),
          Wrap(
            spacing: AppSpacing.x1,
            runSpacing: AppSpacing.x1,
            children: [
              PrimaryButton(
                label: actionLoading ? 'Bekleniyor...' : 'VIP Yap (Lifetime)',
                onPressed: actionLoading ? () {} : () => _callPlan('grant_plan', plan: 'VIP'),
              ),
              SecondaryButton(
                label: 'Pro Yap',
                onPressed: actionLoading ? () {} : () => _callPlan('grant_plan', plan: 'PRO'),
              ),
              SecondaryButton(
                label: 'Ücretsiz Yap',
                onPressed: actionLoading ? () {} : () => _callPlan('revoke_to_free'),
              ),
              SecondaryButton(
                label: 'Planı Sorgula',
                onPressed: actionLoading ? () {} : () => _callPlan('get_user_plan'),
              ),
            ],
          ),
          if (actionResult != null) ...[
            const SizedBox(height: AppSpacing.x1),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('user_id: ${actionResult!.userId ?? '—'}'),
                  Text('plan: ${actionResult!.plan ?? '—'}'),
                  Text('updated_at: ${actionResult!.updatedAt ?? '—'}'),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
