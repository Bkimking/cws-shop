import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_bluetooth_serial/flutter_bluetooth_serial.dart';
import 'package:permission_handler/permission_handler.dart';

import 'printer_settings.dart';

class PrinterSettingsDialog extends StatefulWidget {
  const PrinterSettingsDialog({super.key});

  @override
  State<PrinterSettingsDialog> createState() => _PrinterSettingsDialogState();
}

class _PrinterSettingsDialogState extends State<PrinterSettingsDialog> {
  final _store = PrinterSettingsStore();
  final _host = TextEditingController();
  final _port = TextEditingController(text: '9100');
  PrinterSettings _settings = const PrinterSettings();
  List<BluetoothDevice> _devices = const [];
  bool _loading = true;
  bool _saving = false;

  bool get _supportsBluetooth => Platform.isAndroid || Platform.isIOS;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final settings = await _store.load();
    _host.text = settings.networkHost;
    _port.text = settings.networkPort.toString();
    List<BluetoothDevice> devices = const [];

    if (_supportsBluetooth) {
      try {
        await <Permission>[
          Permission.bluetoothConnect,
          Permission.bluetoothScan,
          Permission.locationWhenInUse,
        ].request();
        devices = await FlutterBluetoothSerial.instance.getBondedDevices();
      } catch (_) {
        devices = const [];
      }
    }

    if (!mounted) return;
    setState(() {
      _settings = settings;
      _devices = devices;
      _loading = false;
    });
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    await _store.save(
      _settings.copyWith(
        networkHost: _host.text.trim(),
        networkPort: int.tryParse(_port.text.trim()) ?? 9100,
      ),
    );
    if (mounted) Navigator.pop(context);
  }

  @override
  void dispose() {
    _host.dispose();
    _port.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Receipt printer'),
      content: _loading
          ? const SizedBox(
              width: 280,
              height: 100,
              child: Center(child: CircularProgressIndicator()),
            )
          : SingleChildScrollView(
              child: SizedBox(
                width: 320,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    DropdownButtonFormField<PrinterMode>(
                      initialValue: _settings.mode,
                      decoration: const InputDecoration(
                        labelText: 'Connection',
                      ),
                      items: [
                        const DropdownMenuItem(
                          value: PrinterMode.system,
                          child: Text('System print dialog'),
                        ),
                        const DropdownMenuItem(
                          value: PrinterMode.network,
                          child: Text('Network / Wi-Fi ESC/POS'),
                        ),
                        if (_supportsBluetooth)
                          const DropdownMenuItem(
                            value: PrinterMode.bluetooth,
                            child: Text('Bluetooth printer'),
                          ),
                      ],
                      onChanged: (mode) {
                        if (mode != null) {
                          setState(
                            () => _settings = _settings.copyWith(mode: mode),
                          );
                        }
                      },
                    ),
                    if (_settings.mode == PrinterMode.network) ...[
                      const SizedBox(height: 12),
                      TextField(
                        controller: _host,
                        keyboardType: TextInputType.url,
                        decoration: const InputDecoration(
                          labelText: 'Printer IP',
                          hintText: '192.168.1.50',
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _port,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Port'),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Most Wi-Fi/network thermal printers use port 9100.',
                        style: TextStyle(fontSize: 10, color: Colors.white38),
                      ),
                    ],
                    if (_settings.mode == PrinterMode.bluetooth) ...[
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: _settings.bluetoothAddress.isEmpty
                            ? null
                            : _settings.bluetoothAddress,
                        decoration: const InputDecoration(
                          labelText: 'Paired printer',
                        ),
                        items: _devices
                            .map(
                              (device) => DropdownMenuItem(
                                value: device.address,
                                child: Text(
                                  '${device.name ?? 'Bluetooth device'} · ${device.address}',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: (address) {
                          if (address == null) return;
                          final device = _devices
                              .where((item) => item.address == address)
                              .firstOrNull;
                          setState(
                            () => _settings = _settings.copyWith(
                              bluetoothAddress: address,
                              bluetoothName: device?.name ?? '',
                            ),
                          );
                        },
                      ),
                      if (_devices.isEmpty)
                        const Padding(
                          padding: EdgeInsets.only(top: 6),
                          child: Text(
                            'No paired devices. Pair the printer in Android Bluetooth settings first.',
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.white38,
                            ),
                          ),
                        ),
                      const SizedBox(height: 6),
                      const Text(
                        'Android requires Location permission for Bluetooth discovery on older versions.',
                        style: TextStyle(fontSize: 10, color: Colors.white38),
                      ),
                    ],
                    if (_settings.mode == PrinterMode.system)
                      const Padding(
                        padding: EdgeInsets.only(top: 12),
                        child: Text(
                          'Uses the Windows/Android print dialog. Best for A4 or driver-installed printers.',
                          style: TextStyle(fontSize: 10, color: Colors.white38),
                        ),
                      ),
                  ],
                ),
              ),
            ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saving || _loading ? null : _save,
          child: const Text('Save printer'),
        ),
      ],
    );
  }
}
