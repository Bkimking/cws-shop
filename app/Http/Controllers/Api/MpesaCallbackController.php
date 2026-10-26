<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\MpesaPaymentFinalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MpesaCallbackController extends Controller
{
    public function __invoke(Request $request, MpesaPaymentFinalizer $finalizer): JsonResponse
    {
        $secret = (string) config('mpesa.callback_secret');

        if ($secret !== '' && ! hash_equals($secret, (string) $request->query('secret'))) {
            abort(403);
        }

        $callback = $request->input('Body.stkCallback', []);
        $checkoutId = (string) ($callback['CheckoutRequestID'] ?? '');
        $resultCode = (int) ($callback['ResultCode'] ?? 1);

        if ($checkoutId === '') {
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Ignored']);
        }

        $payment = Payment::query()
            ->where('gateway', 'mpesa')
            ->where('gateway_reference', $checkoutId)
            ->first();

        if (! $payment) {
            Log::warning('M-Pesa callback for unknown payment.', ['checkout_request_id' => $checkoutId]);

            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        if ($payment->status !== 'pending') {
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Already processed']);
        }

        $metadata = [];

        foreach ((array) data_get($callback, 'CallbackMetadata.Item', []) as $item) {
            if (isset($item['Name'])) {
                $metadata[$item['Name']] = $item['Value'] ?? null;
            }
        }

        if ($resultCode === 0 && array_key_exists('Amount', $metadata)) {
            $callbackAmount = (float) $metadata['Amount'];

            if ($callbackAmount + 0.01 < (float) $payment->amount) {
                $resultCode = 1;
                $callback['ResultDesc'] = 'Callback amount does not match the expected payment amount.';
            }
        }

        if ($resultCode === 0) {
            $finalizer->complete($payment, [
                'callback' => $callback,
                'receipt' => $metadata['MpesaReceiptNumber'] ?? null,
                'phone' => $metadata['PhoneNumber'] ?? null,
            ]);
        } else {
            $finalizer->fail(
                $payment,
                (string) ($callback['ResultDesc'] ?? 'Payment failed.'),
                ['callback' => $callback],
            );
        }

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }
}
