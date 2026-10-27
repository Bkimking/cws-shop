import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import 'auth_models.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

final authControllerProvider = ChangeNotifierProvider<AuthController>((ref) {
  return AuthController(ref.read(apiClientProvider))..initialize();
});

enum AuthStatus { checking, signedOut, signedIn }

class AuthController extends ChangeNotifier {
  AuthController(this._api);

  final ApiClient _api;
  AuthStatus status = AuthStatus.checking;
  AuthSession? session;
  String? error;
  bool busy = false;

  Future<void> initialize() async {
    final token = await _api.tokens.read();

    if (token == null || token.isEmpty) {
      status = AuthStatus.signedOut;
      notifyListeners();
      return;
    }

    try {
      final response = await _api.get('/api/v1/auth/me');
      session = AuthSession.fromMe(
        Map<String, dynamic>.from(response['data'] as Map? ?? const {}),
      );
      status = AuthStatus.signedIn;
    } on ApiException {
      await _api.tokens.clear();
      status = AuthStatus.signedOut;
    }

    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    busy = true;
    error = null;
    notifyListeners();

    try {
      final response = await _api.post(
        '/api/v1/auth/login',
        data: {
          'email': email,
          'password': password,
          'device_name': 'CWSPOS Windows POS',
        },
      );
      final data = Map<String, dynamic>.from(
        response['data'] as Map? ?? const {},
      );

      if (data['two_factor_required'] == true) {
        error = 'Two-factor authentication is required. Use the web back-office or contact an administrator.';
        return false;
      }

      final next = AuthSession.fromLogin(data);

      if (next.token.isEmpty) {
        error = 'The server did not return a device token.';
        return false;
      }

      await _api.tokens.write(next.token);
      session = next;
      status = AuthStatus.signedIn;
      return true;
    } on ApiException catch (exception) {
      error = exception.message;
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    try {
      await _api.post('/api/v1/auth/logout');
    } on ApiException {
      // The local token is cleared even if the server is unreachable.
    }

    await _api.tokens.clear();
    session = null;
    status = AuthStatus.signedOut;
    notifyListeners();
  }
}
