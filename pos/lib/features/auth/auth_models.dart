class AuthSession {
  const AuthSession({
    required this.token,
    required this.user,
    required this.permissions,
    this.branch,
    this.region,
    this.till,
  });

  final String token;
  final Map<String, dynamic> user;
  final List<String> permissions;
  final Map<String, dynamic>? branch;
  final Map<String, dynamic>? region;
  final Map<String, dynamic>? till;

  String get name => (user['name'] ?? 'Cashier').toString();

  factory AuthSession.fromLogin(Map<String, dynamic> data) {
    return AuthSession(
      token: (data['token'] ?? '').toString(),
      user: Map<String, dynamic>.from(data['user'] as Map? ?? const {}),
      permissions: (data['permissions'] as List? ?? const [])
          .map((item) => item.toString())
          .toList(),
      branch: data['branch'] == null
          ? null
          : Map<String, dynamic>.from(data['branch'] as Map),
      region: data['region'] == null
          ? null
          : Map<String, dynamic>.from(data['region'] as Map),
      till: data['till'] == null
          ? null
          : Map<String, dynamic>.from(data['till'] as Map),
    );
  }

  factory AuthSession.fromMe(Map<String, dynamic> data) {
    return AuthSession(
      token: '',
      user: Map<String, dynamic>.from(data['user'] as Map? ?? const {}),
      permissions: (data['permissions'] as List? ?? const [])
          .map((item) => item.toString())
          .toList(),
      branch: data['branch'] == null
          ? null
          : Map<String, dynamic>.from(data['branch'] as Map),
      region: data['region'] == null
          ? null
          : Map<String, dynamic>.from(data['region'] as Map),
      till: data['till'] == null
          ? null
          : Map<String, dynamic>.from(data['till'] as Map),
    );
  }
}
