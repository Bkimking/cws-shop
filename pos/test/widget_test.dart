import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:pos/app/app.dart';

void main() {
  testWidgets('shows the POS sign-in screen when signed out', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PosApp()));
    await tester.pump();

    expect(find.text('CWSPOS Terminal'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });
}
