import '../../core/network/api_client.dart';
import 'terminal_models.dart';

class TerminalRepository {
  TerminalRepository(this._api);

  final ApiClient _api;

  Future<TerminalBootstrap> bootstrap() async {
    final response = await _api.get('/api/v1/bootstrap');
    return TerminalBootstrap.fromJson(
      Map<String, dynamic>.from(response['data'] as Map? ?? const {}),
    );
  }

  Future<Map<String, dynamic>> openTill(double openingCash) async {
    final response = await _api.post(
      '/api/v1/till/open',
      data: {'opening_cash': openingCash},
    );
    return Map<String, dynamic>.from(response['data'] as Map? ?? const {});
  }

  Future<Map<String, dynamic>> closeTill(
    double closingCash,
    String? varianceReason,
  ) async {
    final response = await _api.post(
      '/api/v1/till/close',
      data: {'closing_cash': closingCash, 'variance_reason': varianceReason},
    );
    return Map<String, dynamic>.from(response['data'] as Map? ?? const {});
  }

  Future<Map<String, dynamic>> cashSale({
    required List<CartLine> lines,
    required int tenderedMinor,
    String? idempotencyKey,
  }) {
    return cashSaleItems(
      items: lines
          .map(
            (line) => {
              'product_variant_id': line.variant.id,
              'quantity': line.quantity,
            },
          )
          .toList(),
      tenderedMinor: tenderedMinor,
      idempotencyKey: idempotencyKey,
    );
  }

  Future<Map<String, dynamic>> cashSaleItems({
    required List<Map<String, dynamic>> items,
    required int tenderedMinor,
    String? idempotencyKey,
  }) async {
    final response = await _api.post(
      '/api/v1/orders',
      data: {
        'items': items,
        'payment_method': 'cash',
        'tendered': tenderedMinor / 100,
      },
      headers: idempotencyKey == null
          ? null
          : {'Idempotency-Key': idempotencyKey},
    );

    return Map<String, dynamic>.from(response['data'] as Map? ?? const {});
  }

  Future<Map<String, dynamic>> mpesaSale({
    required List<CartLine> lines,
    required String phone,
  }) async {
    final response = await _api.post(
      '/api/v1/orders',
      data: {
        'items': lines
            .map(
              (line) => {
                'product_variant_id': line.variant.id,
                'quantity': line.quantity,
              },
            )
            .toList(),
        'payment_method': 'mpesa',
        'phone': phone,
      },
    );

    return Map<String, dynamic>.from(response['data'] as Map? ?? const {});
  }

  Future<Map<String, dynamic>> paymentStatus(int paymentId) async {
    final response = await _api.get('/api/v1/payments/$paymentId/status');
    final data = Map<String, dynamic>.from(
      response['data'] as Map? ?? const {},
    );
    return Map<String, dynamic>.from(data['payment'] as Map? ?? const {});
  }

  Future<void> cancelPayment(int paymentId) async {
    await _api.post('/api/v1/payments/$paymentId/cancel');
  }
}
