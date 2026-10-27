class ApiException implements Exception {
  ApiException(
    this.message, {
    this.code,
    this.statusCode,
    this.errors = const {},
  });

  final String message;
  final String? code;
  final int? statusCode;
  final Map<String, List<String>> errors;

  factory ApiException.fromResponse(int status, Map<String, dynamic> body) {
    final rawErrors = body['errors'];
    final errors = <String, List<String>>{};

    if (rawErrors is Map) {
      for (final entry in rawErrors.entries) {
        final value = entry.value;
        errors[entry.key.toString()] = value is List
            ? value.map((item) => item.toString()).toList()
            : [value.toString()];
      }
    }

    return ApiException(
      (body['message'] ?? 'The request could not be completed.').toString(),
      code: body['code']?.toString(),
      statusCode: status,
      errors: errors,
    );
  }

  @override
  String toString() => message;
}
