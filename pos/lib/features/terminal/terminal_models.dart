import '../../core/config/env.dart';

class TerminalBootstrap {
  TerminalBootstrap({
    required this.user,
    required this.branch,
    required this.region,
    required this.till,
    required this.products,
    required this.categories,
    required this.paymentMethods,
  });

  final Map<String, dynamic> user;
  final Map<String, dynamic>? branch;
  final Map<String, dynamic>? region;
  final Map<String, dynamic>? till;
  final List<PosProduct> products;
  final List<PosCategory> categories;
  final Map<String, dynamic> paymentMethods;

  String get currency => (region?['currency_code'] ?? 'KES').toString();
  String get branchName => (branch?['name'] ?? 'Branch').toString();

  factory TerminalBootstrap.fromJson(Map<String, dynamic> data) {
    return TerminalBootstrap(
      user: Map<String, dynamic>.from(data['user'] as Map? ?? const {}),
      branch: data['branch'] == null
          ? null
          : Map<String, dynamic>.from(data['branch'] as Map),
      region: data['region'] == null
          ? null
          : Map<String, dynamic>.from(data['region'] as Map),
      till: data['till'] == null
          ? null
          : Map<String, dynamic>.from(data['till'] as Map),
      products: (data['products'] as List? ?? const [])
          .whereType<Map>()
          .map((item) => PosProduct.fromJson(Map<String, dynamic>.from(item)))
          .toList(),
      categories: (data['categories'] as List? ?? const [])
          .whereType<Map>()
          .map((item) => PosCategory.fromJson(Map<String, dynamic>.from(item)))
          .toList(),
      paymentMethods: Map<String, dynamic>.from(
        data['payment_methods'] as Map? ?? const {},
      ),
    );
  }
}

class PosCategory {
  PosCategory({required this.id, required this.name});

  final int id;
  final String name;

  factory PosCategory.fromJson(Map<String, dynamic> json) => PosCategory(
    id: (json['id'] as num).toInt(),
    name: (json['name'] ?? '').toString(),
  );
}

class PosProduct {
  PosProduct({
    required this.id,
    required this.name,
    required this.categoryId,
    required this.category,
    required this.stock,
    required this.priceMinor,
    required this.imageUrl,
    required this.variants,
  });

  final int id;
  final String name;
  final int categoryId;
  final String category;
  final int stock;
  final int priceMinor;
  final String? imageUrl;
  final List<PosVariant> variants;

  factory PosProduct.fromJson(Map<String, dynamic> json) {
    final image = json['image_url']?.toString();

    return PosProduct(
      id: (json['id'] as num).toInt(),
      name: (json['name'] ?? '').toString(),
      categoryId: (json['category_id'] as num?)?.toInt() ?? 0,
      category: (json['category'] ?? '').toString(),
      stock: (json['stock'] as num?)?.toInt() ?? 0,
      priceMinor: (((json['price'] as num?)?.toDouble() ?? 0) * 100).round(),
      imageUrl: image == null || image.isEmpty
          ? null
          : image.startsWith('http')
          ? image
          : '${ApiEnv.baseUrl}$image',
      variants: (json['variants'] as List? ?? const [])
          .whereType<Map>()
          .map((item) => PosVariant.fromJson(Map<String, dynamic>.from(item)))
          .toList(),
    );
  }
}

class PosVariant {
  PosVariant({
    required this.id,
    required this.name,
    required this.priceMinor,
    required this.stock,
  });

  final int id;
  final String name;
  final int priceMinor;
  final int stock;

  factory PosVariant.fromJson(Map<String, dynamic> json) => PosVariant(
    id: (json['id'] as num).toInt(),
    name: (json['name'] ?? '').toString(),
    priceMinor: (((json['price'] as num?)?.toDouble() ?? 0) * 100).round(),
    stock: (json['stock'] as num?)?.toInt() ?? 0,
  );
}

class CartLine {
  CartLine({required this.product, required this.variant, this.quantity = 1});

  final PosProduct product;
  final PosVariant variant;
  int quantity;

  int get totalMinor => variant.priceMinor * quantity;
}
