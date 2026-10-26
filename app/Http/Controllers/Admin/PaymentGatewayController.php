<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ToastHelper;
use App\Http\Controllers\Controller;
use App\Models\PaymentGatewayConfig;
use App\Models\Region;
use App\Services\MpesaStkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PaymentGatewayController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', PaymentGatewayConfig::class);

        $scopedRegionId = $request->attributes->get('scoped_region_id');

        $gateways = PaymentGatewayConfig::with('region')
            ->when($scopedRegionId, fn ($query, $regionId) => $query->where('region_id', $regionId))
            ->orderBy('gateway')
            ->get();

        return Inertia::render('admin/payment-gateways/index', [
            'gateways' => $gateways,
            'regions' => Region::query()
                ->where('is_active', true)
                ->when($scopedRegionId, fn ($query, $regionId) => $query->where('id', $regionId))
                ->get(['id', 'name']),
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', PaymentGatewayConfig::class);

        return Inertia::render('admin/payment-gateways/create', [
            'regions' => Region::query()
                ->where('is_active', true)
                ->when($request->attributes->get('scoped_region_id'), fn ($query, $regionId) => $query->where('id', $regionId))
                ->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', PaymentGatewayConfig::class);

        $validated = $request->validate([
            'region_id' => 'required|exists:regions,id',
            'gateway' => [
                'required', 'string', 'in:cash,mpesa,airtel,card,paypal',
                Rule::unique('payment_gateway_configs', 'gateway')
                    ->where(fn ($query) => $query->where('region_id', $request->input('region_id'))),
            ],
            'is_enabled' => 'boolean',
            'encrypted_credentials' => 'array',
        ]);

        $this->assertRegionInScope($request, (int) $validated['region_id']);

        PaymentGatewayConfig::create([
            'region_id' => $validated['region_id'],
            'gateway' => $validated['gateway'],
            'is_enabled' => $validated['is_enabled'] ?? false,
            'encrypted_credentials' => $validated['encrypted_credentials'] ?? [],
        ]);

        ToastHelper::success('Payment gateway configured successfully!');

        return redirect()->route('admin.payment-gateways.index');
    }

    public function edit(Request $request, PaymentGatewayConfig $paymentGatewayConfig): Response
    {
        $this->authorize('update', $paymentGatewayConfig);

        return Inertia::render('admin/payment-gateways/edit', [
            'gateway' => $paymentGatewayConfig,
            'regions' => Region::query()
                ->where('is_active', true)
                ->when($request->attributes->get('scoped_region_id'), fn ($query, $regionId) => $query->where('id', $regionId))
                ->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, PaymentGatewayConfig $paymentGatewayConfig): RedirectResponse
    {
        $this->authorize('update', $paymentGatewayConfig);

        $validated = $request->validate([
            'region_id' => 'required|exists:regions,id',
            'gateway' => 'required|string|in:cash,mpesa,airtel,card,paypal',
            'is_enabled' => 'boolean',
            'encrypted_credentials' => 'array',
        ]);

        $this->assertRegionInScope($request, (int) $validated['region_id']);

        $paymentGatewayConfig->update([
            'region_id' => $validated['region_id'],
            'gateway' => $validated['gateway'],
            'is_enabled' => $validated['is_enabled'] ?? false,
            'encrypted_credentials' => $validated['encrypted_credentials'] ?? [],
        ]);

        ToastHelper::success('Payment gateway updated successfully!');

        return redirect()->route('admin.payment-gateways.index');
    }

    public function activate(PaymentGatewayConfig $paymentGatewayConfig): RedirectResponse
    {
        $this->authorize('activate', $paymentGatewayConfig);

        $paymentGatewayConfig->update([
            'is_enabled' => ! $paymentGatewayConfig->is_enabled,
        ]);

        ToastHelper::success(
            $paymentGatewayConfig->is_enabled
                ? 'Payment gateway activated.'
                : 'Payment gateway deactivated.'
        );

        return back();
    }

    public function destroy(PaymentGatewayConfig $paymentGatewayConfig): RedirectResponse
    {
        $this->authorize('delete', $paymentGatewayConfig);

        $paymentGatewayConfig->delete();

        ToastHelper::success('Payment gateway deleted successfully!');

        return redirect()->route('admin.payment-gateways.index');
    }

    private function assertRegionInScope(Request $request, int $regionId): void
    {
        $scopedRegionId = $request->attributes->get('scoped_region_id');

        if ($scopedRegionId && (int) $scopedRegionId !== $regionId) {
            throw ValidationException::withMessages([
                'region_id' => 'You can only configure gateways for your own region.',
            ]);
        }
    }

    public function testConnection(PaymentGatewayConfig $paymentGatewayConfig, MpesaStkService $mpesa): JsonResponse
    {
        $this->authorize('update', $paymentGatewayConfig);

        $configured = match ($paymentGatewayConfig->gateway) {
            'cash' => true,
            'mpesa' => $mpesa->isConfigured(),
            'paypal' => (bool) config('paypal.enabled'),
            default => false,
        };

        return response()->json([
            'success' => $configured,
            'message' => $configured
                ? 'Gateway configuration is present.'
                : 'Gateway credentials are not configured for this deployment.',
        ], $configured ? 200 : 422);
    }
}
