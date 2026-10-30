import 'package:shared_preferences/shared_preferences.dart';

enum PrinterMode { system, network, bluetooth }

class PrinterSettings {
  const PrinterSettings({
    this.mode = PrinterMode.system,
    this.networkHost = '',
    this.networkPort = 9100,
    this.bluetoothAddress = '',
    this.bluetoothName = '',
  });

  final PrinterMode mode;
  final String networkHost;
  final int networkPort;
  final String bluetoothAddress;
  final String bluetoothName;

  bool get isConfigured => switch (mode) {
    PrinterMode.system => true,
    PrinterMode.network => networkHost.trim().isNotEmpty,
    PrinterMode.bluetooth => bluetoothAddress.trim().isNotEmpty,
  };

  PrinterSettings copyWith({
    PrinterMode? mode,
    String? networkHost,
    int? networkPort,
    String? bluetoothAddress,
    String? bluetoothName,
  }) {
    return PrinterSettings(
      mode: mode ?? this.mode,
      networkHost: networkHost ?? this.networkHost,
      networkPort: networkPort ?? this.networkPort,
      bluetoothAddress: bluetoothAddress ?? this.bluetoothAddress,
      bluetoothName: bluetoothName ?? this.bluetoothName,
    );
  }
}

class PrinterSettingsStore {
  static const _mode = 'pos_printer_mode';
  static const _host = 'pos_printer_host';
  static const _port = 'pos_printer_port';
  static const _btAddress = 'pos_printer_bt_address';
  static const _btName = 'pos_printer_bt_name';

  Future<PrinterSettings> load() async {
    final prefs = await SharedPreferences.getInstance();

    return PrinterSettings(
      mode: PrinterMode.values.firstWhere(
        (mode) => mode.name == prefs.getString(_mode),
        orElse: () => PrinterMode.system,
      ),
      networkHost: prefs.getString(_host) ?? '',
      networkPort: prefs.getInt(_port) ?? 9100,
      bluetoothAddress: prefs.getString(_btAddress) ?? '',
      bluetoothName: prefs.getString(_btName) ?? '',
    );
  }

  Future<void> save(PrinterSettings settings) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_mode, settings.mode.name);
    await prefs.setString(_host, settings.networkHost);
    await prefs.setInt(_port, settings.networkPort);
    await prefs.setString(_btAddress, settings.bluetoothAddress);
    await prefs.setString(_btName, settings.bluetoothName);
  }
}
