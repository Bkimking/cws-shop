import 'dart:io';
import 'dart:typed_data';

import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:flutter_bluetooth_serial/flutter_bluetooth_serial.dart';
import 'package:intl/intl.dart';

import 'printer_exception.dart';
import 'printer_settings.dart';

class EscPosReceipt {
  Future<List<int>> build(Map<String, dynamic> order, String branch) async {
    final profile = await CapabilityProfile.load();
    final generator = Generator(PaperSize.mm80, profile);
    final items = (order['items'] as List? ?? const []).whereType<Map>();
    final currency = (order['currency'] ?? 'KES').toString();
    var bytes = <int>[];

    bytes += generator.text(
      'CWSPOS',
      styles: const PosStyles(
        align: PosAlign.center,
        bold: true,
        height: PosTextSize.size2,
        width: PosTextSize.size2,
      ),
    );
    bytes += generator.text(
      branch,
      styles: const PosStyles(align: PosAlign.center),
    );
    bytes += generator.hr();
    bytes += generator.text('Order ${order['number'] ?? ''}');
    bytes += generator.text(
      order['created_at_label']?.toString() ??
          DateFormat('dd MMM yyyy HH:mm').format(DateTime.now()),
    );
    bytes += generator.hr();

    for (final item in items) {
      final name =
          '${item['quantity']}x ${item['name']}'
          '${item['variant'] != null ? ' · ${item['variant']}' : ''}';
      final amount = NumberFormat('#,##0.00')
          .format((item['line_total'] as num?)?.toDouble() ?? 0);
      bytes += generator.text(
        '$name  $currency $amount',
        styles: const PosStyles(fontType: PosFontType.fontB),
      );
    }

    bytes += generator.hr();
    bytes += generator.text(
      'TOTAL  $currency ${NumberFormat('#,##0.00').format((order['total'] as num?)?.toDouble() ?? 0)}',
      styles: const PosStyles(
        bold: true,
        height: PosTextSize.size2,
        width: PosTextSize.size2,
      ),
    );
    bytes += generator.feed(1);
    bytes += generator.text(
      'Thank you. Keep this receipt.',
      styles: const PosStyles(align: PosAlign.center),
    );
    bytes += generator.feed(2);
    bytes += generator.cut();

    return bytes;
  }
}

class EscPosPrinter {
  EscPosPrinter({EscPosReceipt? receipt})
    : _receipt = receipt ?? EscPosReceipt();

  final EscPosReceipt _receipt;

  Future<void> printNetwork(
    Map<String, dynamic> order,
    String branch,
    PrinterSettings settings,
  ) async {
    final host = settings.networkHost.trim();
    if (host.isEmpty) {
      throw PrinterException('Enter the network printer IP address.');
    }

    final bytes = await _receipt.build(order, branch);
    Socket? socket;

    try {
      socket = await Socket.connect(
        host,
        settings.networkPort.clamp(1, 65535),
        timeout: const Duration(seconds: 6),
      );
      socket.add(Uint8List.fromList(bytes));
      await socket.flush();
    } on SocketException {
      throw PrinterException('Could not reach the printer at $host.');
    } finally {
      await socket?.close();
    }
  }

  Future<void> printBluetooth(
    Map<String, dynamic> order,
    String branch,
    PrinterSettings settings,
  ) async {
    if (!Platform.isAndroid && !Platform.isIOS) {
      throw PrinterException(
        'Bluetooth printing is available on Android and iOS. Use network or system print on Windows.',
      );
    }

    if (settings.bluetoothAddress.trim().isEmpty) {
      throw PrinterException('Choose a paired Bluetooth printer first.');
    }

    final bytes = await _receipt.build(order, branch);
    BluetoothConnection? connection;

    try {
      connection = await BluetoothConnection.toAddress(
        settings.bluetoothAddress,
      );
      connection.output.add(Uint8List.fromList(bytes));
      await connection.output.allSent;
    } catch (_) {
      throw PrinterException(
        'Could not send the receipt to the Bluetooth printer. Pair it in Android settings and try again.',
      );
    } finally {
      await connection?.close();
      connection?.dispose();
    }
  }
}
