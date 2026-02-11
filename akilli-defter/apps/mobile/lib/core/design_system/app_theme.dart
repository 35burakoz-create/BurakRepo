import 'package:flutter/material.dart';

import 'tokens.dart';

class AppTheme {
  static ThemeData light() => _theme(Brightness.light);

  static ThemeData dark() => _theme(Brightness.dark);

  static ThemeData _theme(Brightness brightness) {
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF2D6AE3),
      brightness: brightness,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
      textTheme: AppTypography.textTheme(scheme),
      cardTheme: CardThemeData(
        elevation: AppElevation.card,
        margin: EdgeInsets.zero,
        color: scheme.surfaceContainerLow,
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.lg),
      ),
      appBarTheme: AppBarTheme(
        elevation: 0,
        centerTitle: false,
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(50),
          shape: const RoundedRectangleBorder(borderRadius: AppRadius.md),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(50),
          shape: const RoundedRectangleBorder(borderRadius: AppRadius.md),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.xl),
        side: BorderSide.none,
        backgroundColor: scheme.surfaceContainerHighest,
        labelStyle: TextStyle(color: scheme.onSurfaceVariant),
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
    );
  }
}
