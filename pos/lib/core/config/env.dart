class ApiEnv {
  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://cws.shop.codewithsky.co.ke',
  );

  static const webUrl = String.fromEnvironment(
    'WEB_APP_URL',
    defaultValue: 'https://cws.shop.codewithsky.co.ke',
  );

  static const minimumVersion = '1.0.0';

  static bool get usingLocalServer =>
      baseUrl.contains('127.0.0.1') || baseUrl.contains('localhost');
}
