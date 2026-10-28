import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class PendingSale {
  PendingSale({
    required this.key,
    required this.items,
    required this.tenderedMinor,
    required this.createdAt,
  });

  final String key;
  final List<Map<String, dynamic>> items;
  final int tenderedMinor;
  final DateTime createdAt;

  Map<String, dynamic> toJson() => {
    'key': key,
    'items': items,
    'tendered_minor': tenderedMinor,
    'created_at': createdAt.toIso8601String(),
  };

  factory PendingSale.fromJson(Map<String, dynamic> json) => PendingSale(
    key: json['key'].toString(),
    items: (json['items'] as List? ?? const [])
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList(),
    tenderedMinor: (json['tendered_minor'] as num?)?.toInt() ?? 0,
    createdAt:
        DateTime.tryParse(json['created_at']?.toString() ?? '') ??
        DateTime.now(),
  );
}

class OfflineOutbox {
  static const _key = 'cwspos_pending_sales';

  Future<List<PendingSale>> all() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return const [];

    try {
      final list = jsonDecode(raw) as List;
      return list
          .whereType<Map>()
          .map((item) => PendingSale.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } catch (error) {
      debugPrint('Corrupt POS outbox: $error');
      return const [];
    }
  }

  Future<void> enqueue(PendingSale sale) async {
    final existing = await all();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _key,
      jsonEncode([...existing, sale].map((item) => item.toJson()).toList()),
    );
  }

  Future<void> remove(String key) async {
    final remaining = (await all()).where((sale) => sale.key != key).toList();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _key,
      jsonEncode(remaining.map((item) => item.toJson()).toList()),
    );
  }
}
