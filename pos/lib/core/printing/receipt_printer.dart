import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import 'esc_pos_receipt.dart';
import 'printer_settings.dart';

class ReceiptPrinter {
  final _store = PrinterSettingsStore();
  final _escPos = EscPosPrinter();

  Future<void> printOrder(
    Map<String, dynamic> order, {
    required String branch,
  }) async {
    final settings = await _store.load();

    if (settings.mode == PrinterMode.network) {
      await _escPos.printNetwork(order, branch, settings);
      return;
    }

    if (settings.mode == PrinterMode.bluetooth) {
      await _escPos.printBluetooth(order, branch, settings);
      return;
    }

    await _printSystemPdf(order, branch: branch);
  }

  Future<void> _printSystemPdf(
    Map<String, dynamic> order, {
    required String branch,
  }) async {
    final document = pw.Document();
    final items = (order['items'] as List? ?? const [])
        .whereType<Map>()
        .toList();
    final currency = (order['currency'] ?? 'KES').toString();

    document.addPage(
      pw.Page(
        pageFormat: const PdfPageFormat(
          80 * PdfPageFormat.mm,
          200 * PdfPageFormat.mm,
        ),
        margin: const pw.EdgeInsets.all(10),
        build: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.stretch,
          children: [
            pw.Center(
              child: pw.Text(
                'CWSPOS',
                style: pw.TextStyle(
                  fontSize: 16,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
            ),
            pw.Center(
              child: pw.Text(branch, style: const pw.TextStyle(fontSize: 9)),
            ),
            pw.SizedBox(height: 8),
            pw.Divider(),
            pw.Text(
              'Order ${order['number'] ?? ''}',
              style: const pw.TextStyle(fontSize: 10),
            ),
            pw.Text(
              order['created_at_label']?.toString() ??
                  DateFormat('dd MMM yyyy HH:mm').format(DateTime.now()),
              style: const pw.TextStyle(fontSize: 8),
            ),
            pw.SizedBox(height: 6),
            ...items.map(
              (item) => pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Expanded(
                    child: pw.Text(
                      '${item['quantity']}x ${item['name']}${item['variant'] != null ? ' · ${item['variant']}' : ''}',
                      style: const pw.TextStyle(fontSize: 8),
                    ),
                  ),
                  pw.Text(
                    '$currency ${NumberFormat('#,##0.00').format((item['line_total'] as num?)?.toDouble() ?? 0)}',
                    style: const pw.TextStyle(fontSize: 8),
                  ),
                ],
              ),
            ),
            pw.Divider(),
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  'TOTAL',
                  style: pw.TextStyle(
                    fontSize: 11,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.Text(
                  '$currency ${NumberFormat('#,##0.00').format((order['total'] as num?)?.toDouble() ?? 0)}',
                  style: pw.TextStyle(
                    fontSize: 11,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 8),
            pw.Center(
              child: pw.Text(
                'Thank you. Keep this receipt.',
                style: const pw.TextStyle(fontSize: 8),
              ),
            ),
          ],
        ),
      ),
    );

    await Printing.layoutPdf(
      name: 'receipt-${order['number'] ?? 'sale'}',
      onLayout: (_) async => document.save(),
    );
  }
}
