import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'app/app.dart';
import 'app/app_state.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await _initCrashReporting();

  final state = AppState();
  await state.load();
  runApp(DuoLedgerApp(state: state));
}

Future<void> _initCrashReporting() async {
  if (defaultTargetPlatform != TargetPlatform.android) {
    return;
  }

  try {
    await Firebase.initializeApp();

    FlutterError.onError = (details) {
      FirebaseCrashlytics.instance.recordFlutterFatalError(details);
    };

    PlatformDispatcher.instance.onError = (error, stack) {
      FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
      return true;
    };
  } catch (_) {
    // Crash reporting is optional in local/dev environments.
  }
}
