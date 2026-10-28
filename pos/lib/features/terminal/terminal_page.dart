import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:uuid/uuid.dart';

import '../../core/config/env.dart';
import '../../core/network/api_exception.dart';
import '../../core/offline/offline_outbox.dart';
import '../../core/printing/receipt_printer.dart';
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
  final _printer = ReceiptPrinter();
  final _outbox = OfflineOutbox();
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
      await _syncOutbox();
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

  void _scanSubmit() {
    final term = _search.text.trim().toLowerCase();
    if (term.isEmpty) return;

    for (final product in _bootstrap?.products ?? const <PosProduct>[]) {
      if ((product.barcode ?? '').toLowerCase() == term) {
        _add(product);
        _search.clear();
        setState(() {});
        return;
      }

      for (final variant in product.variants) {
        if ((variant.barcode ?? '').toLowerCase() == term ||
            '${product.name} ${variant.name}'.toLowerCase() == term) {
          _addVariant(product, variant);
          _search.clear();
          setState(() {});
          return;
        }
      }
    }
  }

  void _addVariant(PosProduct product, PosVariant variant) {
    final matching = _cart
        .where((line) => line.variant.id == variant.id)
        .toList();
    setState(() {
      if (matching.isNotEmpty) {
        matching.first.quantity++;
      } else {
        _cart.add(CartLine(product: product, variant: variant));
      }
    });
  }

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

  Future<void> _syncOutbox() async {
    final pending = await _outbox.all();

    for (final sale in pending) {
      try {
        await _repository.cashSaleItems(
          items: sale.items,
          tenderedMinor: sale.tenderedMinor,
          idempotencyKey: sale.key,
        );
        await _outbox.remove(sale.key);
      } on ApiException catch (exception) {
        if (exception.statusCode != null && exception.statusCode! < 500) {
          await _outbox.remove(sale.key);
        } else {
          break;
        }
      }
    }
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

  Future<void> _closeTill() async {
    final data = _bootstrap;
    if (data == null) return;

    final expected = ((data.till?['expected_cash'] as num?)?.toDouble() ?? 0);
    final cashController = TextEditingController(
      text: expected.toStringAsFixed(2),
    );
    final reasonController = TextEditingController();
    final close = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Close the till'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Expected cash: ${_moneyText((expected * 100).round(), data.currency)}',
            ),
            const SizedBox(height: 12),
            TextField(
              controller: cashController,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(labelText: 'Closing cash'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                labelText: 'Variance reason (if any)',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Close till'),
          ),
        ],
      ),
    );

    if (close != true) return;

    try {
      final result = await _repository.closeTill(
        double.tryParse(cashController.text) ?? expected,
        reasonController.text.trim().isEmpty
            ? null
            : reasonController.text.trim(),
      );
      if (!mounted) return;
      final till = result['till'] as Map? ?? const {};
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Till closed'),
          content: Text(
            'Gross: ${_moneyText((((till['gross'] as num?)?.toDouble() ?? 0) * 100).round(), data.currency)}\n'
            'Expected cash: ${_moneyText((((till['expected_cash'] as num?)?.toDouble() ?? 0) * 100).round(), data.currency)}\n'
            'Variance: ${_moneyText((((till['variance'] as num?)?.toDouble() ?? 0) * 100).round(), data.currency)}',
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Done'),
            ),
          ],
        ),
      );
      await _load();
    } on ApiException catch (exception) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(exception.message)));
      }
    }
  }

  Future<void> _openOffice() async {
    final opened = await launchUrl(
      Uri.parse(ApiEnv.webUrl),
      mode: LaunchMode.externalApplication,
    );

    if (!opened && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open the office web app.')),
      );
    }
  }

  Future<void> _openSecurity() async {
    final opened = await launchUrl(
      Uri.parse('${ApiEnv.webUrl}/settings/security'),
      mode: LaunchMode.externalApplication,
    );

    if (!opened && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open the security page.')),
      );
    }
  }

  Future<void> _chargeMpesa() async {
    final data = _bootstrap;
    if (data == null || _cart.isEmpty) return;

    final phone = TextEditingController(text: '07');
    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('M-Pesa · ${_moneyText(_totalMinor, data.currency)}'),
        content: TextField(
          controller: phone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(
            labelText: 'Customer phone',
            hintText: '0712 345 678',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Send STK'),
          ),
        ],
      ),
    );

    if (submitted != true) return;

    try {
      final result = await _repository.mpesaSale(
        lines: _cart,
        phone: phone.text.trim(),
      );
      final order = Map<String, dynamic>.from(
        result['order'] as Map? ?? const {},
      );
      final payment = order['payment'] as Map? ?? const {};

      if (order['status'] == 'completed') {
        setState(() => _cart.clear());
        await _load();
        return;
      }

      if (!mounted) return;

      final paid = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (context) => MpesaWaitingDialog(
          orderId: (order['id'] as num).toInt(),
          paymentId: (payment['id'] as num?)?.toInt(),
          repository: _repository,
          amount: _moneyText(_totalMinor, data.currency),
          currency: data.currency,
        ),
      );

      if (paid == true) {
        setState(() => _cart.clear());
        await _load();
        if (!mounted) return;
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('M-Pesa payment confirmed'),
            content: Text('Order ${order['number'] ?? ''} is paid.'),
            actions: [
              TextButton(
                onPressed: () =>
                    _printer.printOrder(order, branch: data.branchName),
                child: const Text('Print receipt'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('New sale'),
              ),
            ],
          ),
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('M-Pesa payment did not complete.')),
        );
      }
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

    final saleKey = const Uuid().v4();

    try {
      final result = await _repository.cashSale(
        lines: _cart,
        tenderedMinor: (tendered * 100).round(),
        idempotencyKey: saleKey,
      );
      if (!mounted) return;
      setState(() => _cart.clear());
      await _load();
      if (!mounted) return;
      final order = Map<String, dynamic>.from(
        result['order'] as Map? ?? const {},
      );
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Sale completed'),
          content: Text(
            'Order ${order['number'] ?? ''}\n${_moneyText((((order['total'] as num?)?.toDouble() ?? 0) * 100).round(), data.currency)}',
          ),
          actions: [
            TextButton(
              onPressed: () =>
                  _printer.printOrder(order, branch: data.branchName),
              child: const Text('Print receipt'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('New sale'),
            ),
          ],
        ),
      );
    } on ApiException catch (exception) {
      if (exception.statusCode == null) {
        await _outbox.enqueue(
          PendingSale(
            key: saleKey,
            items: _cart
                .map(
                  (line) => {
                    'product_variant_id': line.variant.id,
                    'quantity': line.quantity,
                  },
                )
                .toList(),
            tenderedMinor: (tendered * 100).round(),
            createdAt: DateTime.now(),
          ),
        );
        if (mounted) {
          setState(() => _cart.clear());
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Server unreachable. Sale saved offline and will sync automatically.',
              ),
            ),
          );
        }
      } else if (mounted) {
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
    final session = ref.watch(authControllerProvider).session;
    final canOffice =
        session?.permissions.contains('access admin panel') ?? false;
    final needsTwoFactor = session != null && !session.twoFactorEnabled;

    return Scaffold(
      body: Column(
        children: [
          _TopBar(
            data: data,
            open: open,
            canOffice: canOffice,
            needsTwoFactor: needsTwoFactor,
            onOffice: _openOffice,
            onSecurity: _openSecurity,
            onCloseTill: _closeTill,
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
                  onSubmitted: (_) => _scanSubmit(),
                  decoration: const InputDecoration(
                    hintText: 'Scan barcode or search products…',
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
                if ((data.paymentMethods['mpesa'] as Map?)?['available'] ==
                    true) ...[
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: OutlinedButton.icon(
                      onPressed: open && _cart.isNotEmpty ? _chargeMpesa : null,
                      icon: const Icon(Icons.phone_android, size: 18),
                      label: const Text('Charge · M-Pesa STK'),
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                const Text(
                  'Payment details stay on the server; the cashier never asks for an M-Pesa PIN.',
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
    required this.canOffice,
    required this.needsTwoFactor,
    required this.onOffice,
    required this.onSecurity,
    required this.onCloseTill,
    required this.onRefresh,
    required this.onLogout,
  });

  final TerminalBootstrap data;
  final bool open;
  final bool canOffice;
  final bool needsTwoFactor;
  final VoidCallback onOffice;
  final VoidCallback onSecurity;
  final VoidCallback onCloseTill;
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
          if (canOffice)
            TextButton.icon(
              onPressed: onOffice,
              icon: const Icon(Icons.open_in_new, size: 15),
              label: const Text('Office'),
            ),
          if (needsTwoFactor)
            TextButton.icon(
              onPressed: onSecurity,
              icon: const Icon(Icons.security, size: 15),
              label: const Text('Enable 2FA'),
            ),
          if (open)
            TextButton.icon(
              onPressed: onCloseTill,
              icon: const Icon(Icons.lock_outline, size: 15),
              label: const Text('Close till'),
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

class MpesaWaitingDialog extends StatefulWidget {
  const MpesaWaitingDialog({
    super.key,
    required this.orderId,
    required this.paymentId,
    required this.repository,
    required this.amount,
    required this.currency,
  });

  final int orderId;
  final int? paymentId;
  final TerminalRepository repository;
  final String amount;
  final String currency;

  @override
  State<MpesaWaitingDialog> createState() => _MpesaWaitingDialogState();
}

class _MpesaWaitingDialogState extends State<MpesaWaitingDialog> {
  String _message = 'Approve the M-Pesa prompt on the customer phone.';

  @override
  void initState() {
    super.initState();
    _poll();
  }

  Future<void> _poll() async {
    for (var attempt = 0; attempt < 40; attempt++) {
      await Future<void>.delayed(const Duration(seconds: 3));
      if (!mounted) return;

      try {
        final paymentId = widget.paymentId;
        if (paymentId == null) {
          Navigator.pop(context, false);
          return;
        }

        final payment = await widget.repository.paymentStatus(paymentId);
        final status = payment['status']?.toString();

        if (status == 'completed' && mounted) {
          Navigator.pop(context, true);
          return;
        }

        if (status == 'failed' && mounted) {
          Navigator.pop(context, false);
          return;
        }

        if (mounted) {
          setState(() => _message = 'Still waiting for M-Pesa confirmation…');
        }
      } catch (_) {
        if (mounted) setState(() => _message = 'Checking payment status…');
      }
    }

    if (mounted) Navigator.pop(context, false);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Waiting for M-Pesa'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 18),
          Text(
            widget.amount,
            style: const TextStyle(
              fontFamily: 'monospace',
              fontSize: 22,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white54, fontSize: 12),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () async {
            if (widget.paymentId != null) {
              try {
                await widget.repository.cancelPayment(widget.paymentId!);
              } catch (_) {}
            }
            if (context.mounted) Navigator.pop(context, false);
          },
          child: const Text('Cancel payment'),
        ),
      ],
    );
  }
}
