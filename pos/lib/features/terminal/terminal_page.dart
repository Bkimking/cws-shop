import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/network/api_exception.dart';
import '../auth/auth_controller.dart';
import 'terminal_models.dart';
import 'terminal_repository.dart';

final _money = NumberFormat.currency(locale: 'en_KE', symbol: '');

class TerminalPage extends ConsumerStatefulWidget {
  const TerminalPage({super.key});

  @override
  ConsumerState<TerminalPage> createState() => _TerminalPageState();
}

class _TerminalPageState extends ConsumerState<TerminalPage> {
  TerminalBootstrap? _bootstrap;
  String? _error;
  bool _loading = true;
  final List<CartLine> _cart = [];
  final _search = TextEditingController();
  int? _categoryId;

  TerminalRepository get _repository =>
      TerminalRepository(ref.read(apiClientProvider));

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await _repository.bootstrap();
      if (mounted) setState(() => _bootstrap = data);
    } on ApiException catch (exception) {
      if (mounted) setState(() => _error = exception.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<PosProduct> get _visibleProducts {
    final data = _bootstrap;
    if (data == null) return const [];

    final query = _search.text.trim().toLowerCase();

    return data.products.where((product) {
      final category = _categoryId == null || product.categoryId == _categoryId;
      final search =
          query.isEmpty ||
          product.name.toLowerCase().contains(query) ||
          product.variants.any(
            (variant) => variant.name.toLowerCase().contains(query),
          );
      return category && search;
    }).toList();
  }

  int get _totalMinor =>
      _cart.fold(0, (total, line) => total + line.totalMinor);

  String _moneyText(int minor, String currency) =>
      '$currency ${_money.format(minor / 100)}';

  void _add(PosProduct product) {
    final available = product.variants.where((item) => item.stock > 0).toList();
    final variant = available.isEmpty ? null : available.first;
    if (variant == null) return;

    final matching = _cart
        .where((line) => line.variant.id == variant.id)
        .toList();
    final existing = matching.isEmpty ? null : matching.first;
    setState(() {
      if (existing != null) {
        existing.quantity++;
      } else {
        _cart.add(CartLine(product: product, variant: variant));
      }
    });
  }

  Future<void> _openTill() async {
    final controller = TextEditingController(text: '0');
    final amount = await showDialog<double>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Open the till'),
        content: TextField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(labelText: 'Opening cash'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.pop(context, double.tryParse(controller.text) ?? 0),
            child: const Text('Open till'),
          ),
        ],
      ),
    );

    if (amount == null) return;

    try {
      await _repository.openTill(amount);
      await _load();
    } on ApiException catch (exception) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(exception.message)));
      }
    }
  }

  Future<void> _chargeCash() async {
    final data = _bootstrap;
    if (data == null || _cart.isEmpty) return;

    final controller = TextEditingController(
      text: (_totalMinor / 100).toStringAsFixed(2),
    );
    final tendered = await showDialog<double>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Cash · ${_moneyText(_totalMinor, data.currency)}'),
        content: TextField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(labelText: 'Cash received'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.pop(context, double.tryParse(controller.text) ?? 0),
            child: const Text('Complete sale'),
          ),
        ],
      ),
    );

    if (tendered == null) return;

    try {
      final result = await _repository.cashSale(
        lines: _cart,
        tenderedMinor: (tendered * 100).round(),
      );
      if (!mounted) return;
      setState(() => _cart.clear());
      await _load();
      if (!mounted) return;
      final order = result['order'] as Map? ?? const {};
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Sale completed'),
          content: Text(
            'Order ${order['number'] ?? ''}\n${_moneyText((((order['total'] as num?)?.toDouble() ?? 0) * 100).round(), data.currency)}',
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('New sale'),
            ),
          ],
        ),
      );
    } on ApiException catch (exception) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(exception.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_error != null || _bootstrap == null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error ?? 'Could not load the terminal.'),
              const SizedBox(height: 12),
              FilledButton(onPressed: _load, child: const Text('Retry')),
              TextButton(
                onPressed: () => ref.read(authControllerProvider).logout(),
                child: const Text('Sign out'),
              ),
            ],
          ),
        ),
      );
    }

    final data = _bootstrap!;
    final open = data.till?['status'] == 'OPEN';

    return Scaffold(
      body: Column(
        children: [
          _TopBar(
            data: data,
            open: open,
            onRefresh: _load,
            onLogout: () => ref.read(authControllerProvider).logout(),
          ),
          if (!open)
            Container(
              width: double.infinity,
              color: const Color(0xFF3A2A12),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                children: [
                  const Icon(
                    Icons.lock_outline,
                    color: Color(0xFFFFC857),
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'The till is closed. Open it before selling.',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                  FilledButton.tonal(
                    onPressed: _openTill,
                    child: const Text('Open till'),
                  ),
                ],
              ),
            ),
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(child: _catalog(data)),
                _cartPanel(data, open),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _catalog(TerminalBootstrap data) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _search,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    hintText: 'Search products…',
                    prefixIcon: Icon(Icons.search),
                    isDense: true,
                  ),
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 40,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            scrollDirection: Axis.horizontal,
            children: [
              _categoryChip(null, 'All'),
              ...data.categories.map(
                (category) => _categoryChip(category.id, category.name),
              ),
            ],
          ),
        ),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(20),
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 220,
              mainAxisExtent: 150,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
            ),
            itemCount: _visibleProducts.length,
            itemBuilder: (context, index) {
              final product = _visibleProducts[index];
              return _productTile(product, data.currency);
            },
          ),
        ),
      ],
    );
  }

  Widget _categoryChip(int? id, String label) {
    final selected = _categoryId == id;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => setState(() => _categoryId = id),
      ),
    );
  }

  Widget _productTile(PosProduct product, String currency) {
    final disabled = product.stock <= 0;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: disabled ? null : () => _add(product),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: product.imageUrl == null
                          ? Container(
                              width: 42,
                              height: 42,
                              color: const Color(0xFF263036),
                              alignment: Alignment.center,
                              child: Text(
                                product.name.substring(0, 1).toUpperCase(),
                              ),
                            )
                          : Image.network(
                              product.imageUrl!,
                              width: 42,
                              height: 42,
                              fit: BoxFit.cover,
                              errorBuilder: (_, error, stack) => const Icon(
                                Icons.broken_image_outlined,
                                size: 20,
                              ),
                            ),
                    ),
                    const Spacer(),
                    Text(
                      disabled ? 'Out' : '${product.stock}',
                      style: TextStyle(
                        color: disabled
                            ? const Color(0xFFFF6B6B)
                            : const Color(0xFF4FCE8A),
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                product.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              Text(
                _moneyText(product.priceMinor, currency),
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _cartPanel(TerminalBootstrap data, bool open) {
    return Container(
      width: 340,
      decoration: const BoxDecoration(
        color: Color(0xFF12181C),
        border: Border(left: BorderSide(color: Color(0xFF263036))),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Icon(Icons.receipt_long_outlined, size: 18),
                const SizedBox(width: 8),
                const Text(
                  'Current sale',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                const Spacer(),
                Text(
                  '${_cart.fold(0, (sum, line) => sum + line.quantity)} items',
                  style: const TextStyle(color: Colors.white38, fontSize: 11),
                ),
              ],
            ),
          ),
          Expanded(
            child: _cart.isEmpty
                ? const Center(
                    child: Text(
                      'Add products to start a sale',
                      style: TextStyle(color: Colors.white38, fontSize: 12),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: _cart.length,
                    separatorBuilder: (_, index) =>
                        const Divider(height: 1, color: Color(0xFF202A2F)),
                    itemBuilder: (context, index) {
                      final line = _cart[index];
                      return ListTile(
                        dense: true,
                        title: Text(
                          line.product.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          line.variant.name,
                          style: const TextStyle(fontSize: 10),
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              visualDensity: VisualDensity.compact,
                              onPressed: () => setState(() {
                                if (line.quantity <= 1) {
                                  _cart.removeAt(index);
                                } else {
                                  line.quantity--;
                                }
                              }),
                              icon: const Icon(Icons.remove, size: 16),
                            ),
                            Text(
                              '${line.quantity}',
                              style: const TextStyle(fontFamily: 'monospace'),
                            ),
                            IconButton(
                              visualDensity: VisualDensity.compact,
                              onPressed: () => setState(() => line.quantity++),
                              icon: const Icon(Icons.add, size: 16),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFF263036))),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    const Text(
                      'Total',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const Spacer(),
                    Text(
                      _moneyText(_totalMinor, data.currency),
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: FilledButton.icon(
                    onPressed: open && _cart.isNotEmpty ? _chargeCash : null,
                    icon: const Icon(Icons.payments_outlined),
                    label: const Text('Charge · Cash'),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'M-Pesa is enabled by the API but its Windows flow is the next UI phase.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white24, fontSize: 9),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.data,
    required this.open,
    required this.onRefresh,
    required this.onLogout,
  });

  final TerminalBootstrap data;
  final bool open;
  final VoidCallback onRefresh;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      decoration: const BoxDecoration(
        color: Color(0xFF12181C),
        border: Border(bottom: BorderSide(color: Color(0xFF263036))),
      ),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: const Color(0xFF5BBFE6).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(9),
            ),
            child: const Icon(
              Icons.point_of_sale,
              color: Color(0xFF5BBFE6),
              size: 18,
            ),
          ),
          const SizedBox(width: 10),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                data.branchName,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                '${data.user['name']} · ${(data.region?['currency_code'] ?? 'KES')}',
                style: const TextStyle(fontSize: 10, color: Colors.white38),
              ),
            ],
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: open ? const Color(0xFF1B3A2A) : const Color(0xFF3A2424),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              open ? 'TILL OPEN' : 'TILL CLOSED',
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w700,
                color: open ? const Color(0xFF4FCE8A) : const Color(0xFFFF6B6B),
                letterSpacing: 1,
              ),
            ),
          ),
          IconButton(
            onPressed: onRefresh,
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh, size: 18),
          ),
          IconButton(
            onPressed: onLogout,
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout, size: 18),
          ),
        ],
      ),
    );
  }
}
