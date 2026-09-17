import 'package:flutter/material.dart';

import 'tokens.dart';

enum SwipeAction { edit, duplicate }

class AppScaffold extends StatelessWidget {
  const AppScaffold({
    required this.title,
    required this.body,
    super.key,
    this.actions,
    this.bottomNavigationBar,
  });

  final String title;
  final Widget body;
  final List<Widget>? actions;
  final Widget? bottomNavigationBar;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title), actions: actions),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 260),
        switchInCurve: Curves.easeOutCubic,
        switchOutCurve: Curves.easeInCubic,
        transitionBuilder: (child, animation) {
          final slide = Tween<Offset>(
            begin: const Offset(0.03, 0),
            end: Offset.zero,
          ).animate(animation);
          return FadeTransition(opacity: animation, child: SlideTransition(position: slide, child: child));
        },
        child: body,
      ),
      bottomNavigationBar: bottomNavigationBar,
    );
  }
}

class AppCard extends StatelessWidget {
  const AppCard({
    required this.child,
    super.key,
    this.padding = const EdgeInsets.all(AppSpacing.x2),
  });

  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        borderRadius: AppRadius.lg,
        boxShadow: AppElevation.soft(scheme.shadow),
      ),
      child: Card(
        child: Padding(padding: padding, child: child),
      ),
    );
  }
}

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({required this.label, required this.onPressed, super.key});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton(onPressed: onPressed, child: Text(label));
  }
}

class SecondaryButton extends StatelessWidget {
  const SecondaryButton({required this.label, required this.onPressed, super.key});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(onPressed: onPressed, child: Text(label));
  }
}

class AmountPill extends StatelessWidget {
  const AmountPill({
    required this.amount,
    required this.currency,
    required this.isIncome,
    super.key,
  });

  final double amount;
  final String currency;
  final bool isIncome;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bg = isIncome ? scheme.tertiaryContainer : scheme.errorContainer;
    final fg = isIncome ? scheme.onTertiaryContainer : scheme.onErrorContainer;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.x2, vertical: AppSpacing.x1),
      decoration: BoxDecoration(color: bg, borderRadius: AppRadius.xl),
      child: Text(
        '${isIncome ? '+' : '-'}${amount.toStringAsFixed(2)} $currency',
        style: Theme.of(context).textTheme.labelLarge?.copyWith(color: fg),
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({required this.title, super.key, this.action});

  final String title;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.x1),
      child: Row(
        children: [
          Expanded(child: Text(title, style: Theme.of(context).textTheme.titleMedium)),
          if (action != null) action!,
        ],
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    required this.title,
    required this.subtitle,
    super.key,
    this.icon = Icons.inbox_outlined,
  });

  final String title;
  final String subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, size: 44, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(height: AppSpacing.x2),
        Text(title, style: theme.textTheme.titleMedium, textAlign: TextAlign.center),
        const SizedBox(height: AppSpacing.x1),
        Text(subtitle, textAlign: TextAlign.center, style: theme.textTheme.bodyMedium),
      ],
    );
  }
}

class LoadingSkeleton extends StatefulWidget {
  const LoadingSkeleton({super.key, this.height = 72});

  final double height;

  @override
  State<LoadingSkeleton> createState() => _LoadingSkeletonState();
}

class _LoadingSkeletonState extends State<LoadingSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))
      ..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AnimatedBuilder(
      animation: _controller,
      builder: (_, __) {
        return Opacity(
          opacity: 0.45 + (_controller.value * 0.4),
          child: Container(
            height: widget.height,
            decoration: BoxDecoration(
              color: scheme.surfaceContainerHighest,
              borderRadius: AppRadius.lg,
            ),
          ),
        );
      },
    );
  }
}

class TransactionRow extends StatelessWidget {
  const TransactionRow({
    required this.id,
    required this.title,
    required this.amount,
    required this.currency,
    required this.isIncome,
    required this.onSwipeAction,
    super.key,
  });

  final String id;
  final String title;
  final double amount;
  final String currency;
  final bool isIncome;
  final ValueChanged<SwipeAction> onSwipeAction;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Dismissible(
      key: ValueKey(id),
      confirmDismiss: (direction) async {
        if (direction == DismissDirection.startToEnd) {
          onSwipeAction(SwipeAction.edit);
        } else {
          onSwipeAction(SwipeAction.duplicate);
        }
        return false;
      },
      background: _swipeBackground(
        context,
        alignment: Alignment.centerLeft,
        icon: Icons.edit_outlined,
        label: 'Edit',
        color: scheme.primaryContainer,
      ),
      secondaryBackground: _swipeBackground(
        context,
        alignment: Alignment.centerRight,
        icon: Icons.copy_outlined,
        label: 'Duplicate',
        color: scheme.secondaryContainer,
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(vertical: AppSpacing.x1),
        leading: Icon(
          isIncome ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
          color: isIncome ? scheme.tertiary : scheme.error,
        ),
        title: Text(title),
        trailing: AmountPill(amount: amount, currency: currency, isIncome: isIncome),
      ),
    );
  }

  Widget _swipeBackground(
    BuildContext context, {
    required Alignment alignment,
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return Container(
      alignment: alignment,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.x2),
      decoration: BoxDecoration(borderRadius: AppRadius.lg, color: color),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon),
          const SizedBox(width: AppSpacing.x1),
          Text(label),
        ],
      ),
    );
  }
}

class InsightCard extends StatelessWidget {
  const InsightCard({
    required this.title,
    required this.subtitle,
    super.key,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.x2),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer,
              borderRadius: AppRadius.md,
            ),
            child: const Icon(Icons.auto_awesome_outlined),
          ),
          const SizedBox(width: AppSpacing.x2),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: AppSpacing.x1),
                Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
