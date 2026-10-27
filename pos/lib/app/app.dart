import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../design/theme/app_theme.dart';
import '../features/auth/auth_controller.dart';
import '../features/auth/login_page.dart';
import '../features/terminal/terminal_page.dart';

class PosApp extends ConsumerWidget {
  const PosApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    return MaterialApp(
      title: 'CWSPOS Terminal',
      debugShowCheckedModeBanner: false,
      theme: PosTheme.dark(),
      home: switch (auth.status) {
        AuthStatus.checking => const _Splash(),
        AuthStatus.signedOut => const LoginPage(),
        AuthStatus.signedIn => const TerminalPage(),
      },
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(height: 16),
            Text(
              'Preparing terminal…',
              style: TextStyle(color: Colors.white54, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
