import 'package:dio/dio.dart';

import '../config/env.dart';
import '../storage/token_store.dart';
import 'api_exception.dart';

class ApiClient {
  ApiClient({TokenStore? tokens, Dio? dio})
    : _tokens = tokens ?? TokenStore(),
      _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: ApiEnv.baseUrl,
              connectTimeout: const Duration(seconds: 5),
              receiveTimeout: const Duration(seconds: 15),
              headers: const {'Accept': 'application/json'},
            ),
          );

  final Dio _dio;
  final TokenStore _tokens;

  TokenStore get tokens => _tokens;

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    return _request(() => _dio.get(path, queryParameters: query));
  }

  Future<Map<String, dynamic>> post(String path, {Object? data}) async {
    return _request(() => _dio.post(path, data: data));
  }

  Future<Map<String, dynamic>> _request(
    Future<Response<dynamic>> Function() request,
  ) async {
    final token = await _tokens.read();

    if (token != null && token.isNotEmpty) {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    }

    try {
      final response = await request();
      final body = response.data;

      return body is Map<String, dynamic> ? body : <String, dynamic>{};
    } on DioException catch (error) {
      final response = error.response;
      final body = response?.data;

      if (body is Map<String, dynamic>) {
        throw ApiException.fromResponse(response?.statusCode ?? 0, body);
      }

      throw ApiException(
        error.type == DioExceptionType.connectionTimeout
            ? 'The server took too long to respond.'
            : 'Could not reach the CWSPOS server.',
      );
    }
  }
}
