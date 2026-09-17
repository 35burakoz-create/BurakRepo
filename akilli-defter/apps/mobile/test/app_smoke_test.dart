import 'package:duo_ledger_mobile/app/app.dart';
import 'package:duo_ledger_mobile/app/app_state.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('renders auth title by default', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final state = AppState();
    await state.load();

    await tester.pumpWidget(DuoLedgerApp(state: state));
    await tester.pumpAndSettle();

    expect(find.text("Duo Ledger'a Hoş Geldiniz"), findsOneWidget);
  });
}
