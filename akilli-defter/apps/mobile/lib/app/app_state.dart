import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/monetization/entitlement_service.dart';

enum WorkspaceType { personal, business }
enum UserRole { owner, member, accountant }
enum AttachmentStorageMode { cloudOnly, deviceOnly }

class AppState extends ChangeNotifier {
  static const _localeKey = 'locale_code';
  static const _themeKey = 'dark_mode';
  static const _workspaceKey = 'workspace';
  static const _authedKey = 'authed';
  static const _roleKey = 'role';
  static const _tourStepKey = 'guided_tour_step';
  static const _tourCompletedKey = 'guided_tour_completed';
  static const _aiEnabledKey = 'ai_enabled';
  static const _consentAcceptedKey = 'consent_accepted';
  static const _attachmentModeKey = 'attachment_mode';
  static const _emailKey = 'user_email';

  final EntitlementService entitlementService = EntitlementService(billingProvider: SupabaseBillingProvider());

  bool isAuthenticated = false;
  Locale locale = const Locale('tr');
  ThemeMode themeMode = ThemeMode.system;
  WorkspaceType workspace = WorkspaceType.personal;
  UserRole role = UserRole.owner;

  int guidedTourStep = 0;
  bool guidedTourCompleted = false;
  bool aiEnabled = false;
  bool consentAccepted = false;
  AttachmentStorageMode attachmentStorageMode = AttachmentStorageMode.cloudOnly;
  Entitlements entitlements = Entitlements.free();
  String? currentUserEmail;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString(_localeKey);
    final dark = prefs.getBool(_themeKey);
    final ws = prefs.getString(_workspaceKey);
    isAuthenticated = prefs.getBool(_authedKey) ?? false;
    final roleValue = prefs.getString(_roleKey);
    guidedTourStep = prefs.getInt(_tourStepKey) ?? 0;
    guidedTourCompleted = prefs.getBool(_tourCompletedKey) ?? false;
    aiEnabled = prefs.getBool(_aiEnabledKey) ?? false;
    consentAccepted = prefs.getBool(_consentAcceptedKey) ?? false;
    final mode = prefs.getString(_attachmentModeKey) ?? AttachmentStorageMode.cloudOnly.name;
    currentUserEmail = prefs.getString(_emailKey);
    attachmentStorageMode = mode == AttachmentStorageMode.deviceOnly.name
        ? AttachmentStorageMode.deviceOnly
        : AttachmentStorageMode.cloudOnly;

    locale = Locale(code ?? 'tr');
    themeMode = dark == null
        ? ThemeMode.system
        : dark
            ? ThemeMode.dark
            : ThemeMode.light;
    role = roleValue == UserRole.accountant.name
        ? UserRole.accountant
        : roleValue == UserRole.member.name
            ? UserRole.member
            : UserRole.owner;
    workspace = ws == WorkspaceType.business.name
        ? WorkspaceType.business
        : WorkspaceType.personal;

    if (role == UserRole.accountant && workspace == WorkspaceType.personal) {
      workspace = WorkspaceType.business;
    }

    entitlements = await entitlementService.loadCached();
    await refreshEntitlements();
    notifyListeners();
  }

  Future<void> setLocale(Locale value) async {
    locale = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_localeKey, value.languageCode);
    notifyListeners();
  }

  Future<void> setDarkMode(bool enabled) async {
    themeMode = enabled ? ThemeMode.dark : ThemeMode.light;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_themeKey, enabled);
    notifyListeners();
  }

  Future<void> setRole(UserRole value) async {
    role = value;
    if (role == UserRole.accountant && workspace == WorkspaceType.personal) {
      workspace = WorkspaceType.business;
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_roleKey, role.name);
    await prefs.setString(_workspaceKey, workspace.name);
    notifyListeners();
  }

  Future<void> signIn({String? email}) async {
    isAuthenticated = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_authedKey, true);
    currentUserEmail = (email ?? '').trim().isEmpty ? currentUserEmail : email!.trim();
    if (currentUserEmail != null) {
      await prefs.setString(_emailKey, currentUserEmail!);
    }
    await refreshEntitlements();
    notifyListeners();
  }

  Future<void> signOut() async {
    isAuthenticated = false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_authedKey, false);
    notifyListeners();
  }

  Future<void> setWorkspace(WorkspaceType value) async {
    if (value == WorkspaceType.personal && !entitlements.canUsePersonal) {
      return;
    }
    if (value == WorkspaceType.business && !entitlements.canUseBusiness) {
      return;
    }
    if (role == UserRole.accountant && value == WorkspaceType.personal) {
      return;
    }
    workspace = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_workspaceKey, value.name);
    notifyListeners();
  }

  Future<void> completeTourStep(int step) async {
    if (guidedTourCompleted) return;
    if (step >= guidedTourStep) {
      guidedTourStep = step + 1;
      if (guidedTourStep >= 3) {
        guidedTourCompleted = true;
      }
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_tourStepKey, guidedTourStep);
      await prefs.setBool(_tourCompletedKey, guidedTourCompleted);
      notifyListeners();
    }
  }

  Future<void> skipTour() async {
    guidedTourCompleted = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_tourCompletedKey, true);
    notifyListeners();
  }

  Future<void> setAiEnabled(bool value) async {
    aiEnabled = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_aiEnabledKey, value);
    notifyListeners();
  }

  Future<void> acceptConsent({required bool aiEnabledValue}) async {
    consentAccepted = true;
    aiEnabled = aiEnabledValue;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_consentAcceptedKey, true);
    await prefs.setBool(_aiEnabledKey, aiEnabledValue);
    notifyListeners();
  }

  Future<void> setAttachmentStorageMode(AttachmentStorageMode value) async {
    attachmentStorageMode = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_attachmentModeKey, value.name);
    notifyListeners();
  }

  Future<void> clearLocalCache() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('wallet_accounts');
    await prefs.remove('wallet_transactions');
    await prefs.remove('wallet_budgets');
    await prefs.remove('wallet_offline_queue');
    await prefs.remove('biz_contacts');
    await prefs.remove('biz_deals');
    await prefs.remove('biz_collections');
    await prefs.remove('biz_allocations');
  }

  Future<void> refreshEntitlements() async {
    entitlements = await entitlementService.refresh();
    if (!entitlements.canUsePersonal && workspace == WorkspaceType.personal) {
      workspace = WorkspaceType.business;
    }
    notifyListeners();
  }

  Future<void> purchasePlan(PlanType plan) async {
    entitlements = await entitlementService.purchaseAndRefresh(plan);
    if (!entitlements.canUsePersonal) {
      workspace = WorkspaceType.business;
    }
    notifyListeners();
  }

  Future<void> restorePurchases() async {
    entitlements = await entitlementService.restoreAndRefresh();
    if (!entitlements.canUsePersonal) {
      workspace = WorkspaceType.business;
    }
    notifyListeners();
  }
}
