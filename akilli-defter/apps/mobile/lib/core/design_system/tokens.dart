import 'package:flutter/material.dart';

class AppSpacing {
  static const double x1 = 8;
  static const double x2 = 16;
  static const double x3 = 24;
  static const double x4 = 32;
}

class AppRadius {
  static const BorderRadius md = BorderRadius.all(Radius.circular(12));
  static const BorderRadius lg = BorderRadius.all(Radius.circular(16));
  static const BorderRadius xl = BorderRadius.all(Radius.circular(24));
}

class AppElevation {
  static const double card = 1;
  static const double raised = 2;

  static List<BoxShadow> soft(Color color) {
    return [
      BoxShadow(
        color: color.withValues(alpha: 0.06),
        blurRadius: 14,
        offset: const Offset(0, 5),
      ),
      BoxShadow(
        color: color.withValues(alpha: 0.03),
        blurRadius: 4,
        offset: const Offset(0, 1),
      ),
    ];
  }
}

class AppTypography {
  static TextTheme textTheme(ColorScheme scheme) {
    final base = Typography.material2021(colorScheme: scheme).black;
    return base.copyWith(
      displaySmall: const TextStyle(fontSize: 36, fontWeight: FontWeight.w700, height: 1.15),
      headlineSmall: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, height: 1.2),
      titleLarge: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600, height: 1.25),
      titleMedium: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, height: 1.3),
      bodyLarge: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, height: 1.35),
      bodyMedium: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, height: 1.4),
      labelLarge: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
    );
  }
}
