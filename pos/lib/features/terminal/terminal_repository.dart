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

  Future<Map<String, dynamic>> cashSale({
    required List<CartLine> lines,
    required int tenderedMinor,
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
        'payment_method': 'cash',
        'tendered': tenderedMinor / 100,
      },
    );

    return Map<String, dynamic>.from(response['data'] as Map? ?? const {});
  }
}
