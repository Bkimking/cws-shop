<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class MpesaStkService
{
    public function isConfigured(): bool
    {
        return (bool) config('mpesa.fake')
            || ((bool) config('mpesa.enabled')
            && filled(config('mpesa.consumer_key'))
            && filled(config('mpesa.consumer_secret'))
            && filled(config('mpesa.shortcode'))
            && filled(config('mpesa.passkey')));
    }

    /**
     * @return array<string, mixed>
     */
    public function push(string $phone, float $amount, string $reference, string $description): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('M-Pesa is not configured yet.');
        }

        $phone = $this->normalizePhone($phone);

        if (config('mpesa.fake')) {
            return [
                'ResponseCode' => '0',
                'ResponseDescription' => 'Fake M-Pesa accepted the request.',
                'MerchantRequestID' => 'FAKE-MERCHANT-'.now()->timestamp,
                'CheckoutRequestID' => 'FAKE-'.$reference,
            ];
        }
        $token = $this->accessToken();
        $timestamp = now()->format('YmdHis');
        $password = base64_encode(
            (string) config('mpesa.shortcode')
            .(string) config('mpesa.passkey')
            .$timestamp
        );

        $payload = [
            'BusinessShortCode' => (string) config('mpesa.shortcode'),
            'Password' => $password,
            'Timestamp' => $timestamp,
            'TransactionType' => (string) config('mpesa.transaction_type'),
            'Amount' => (int) round($amount),
            'PartyA' => $phone,
            'PartyB' => (string) config('mpesa.shortcode'),
            'PhoneNumber' => $phone,
            'CallBackURL' => $this->callbackUrl(),
            'AccountReference' => Str::limit($reference, 12, ''),
            'TransactionDesc' => Str::limit($description, 13, ''),
        ];

        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout(30)
            ->post(rtrim((string) config('mpesa.base_url'), '/').'/mpesa/stkpush/v1/processrequest', $payload);

        if ($response->failed()) {
            throw new RuntimeException(
                'M-Pesa rejected the STK request. Check the sandbox credentials and phone number.'
            );
        }

        $body = $response->json();

        if (($body['ResponseCode'] ?? null) !== '0') {
            throw new RuntimeException(
                (string) ($body['errorMessage'] ?? $body['ResponseDescription'] ?? 'M-Pesa did not accept the STK request.')
            );
        }

        return $body;
    }

    /**
     * Query the status of a pending STK request. This is used by the
     * reconciliation job when a callback never arrives.
     *
     * @return array<string, mixed>
     */
    public function queryStatus(string $checkoutRequestId): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('M-Pesa is not configured yet.');
        }

        if (config('mpesa.fake')) {
            return ['ResultCode' => '0', 'ResultDesc' => 'Fake M-Pesa status'];
        }

        $token = $this->accessToken();
        $timestamp = now()->format('YmdHis');
        $password = base64_encode(
            (string) config('mpesa.shortcode')
            .(string) config('mpesa.passkey')
            .$timestamp
        );

        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout(30)
            ->post(rtrim((string) config('mpesa.base_url'), '/').'/mpesa/stkpushquery/v1/query', [
                'BusinessShortCode' => (string) config('mpesa.shortcode'),
                'Password' => $password,
                'Timestamp' => $timestamp,
                'CheckoutRequestID' => $checkoutRequestId,
            ]);

        if ($response->failed()) {
            throw new RuntimeException('M-Pesa status query was rejected.');
        }

        return $response->json();
    }

    public function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '0')) {
            return '254'.substr($digits, 1);
        }

        if (str_starts_with($digits, '7') || str_starts_with($digits, '1')) {
            return '254'.$digits;
        }

        if (str_starts_with($digits, '254')) {
            return $digits;
        }

        throw new RuntimeException('Enter a valid Kenyan phone number, e.g. 0712 345 678.');
    }

    private function accessToken(): string
    {
        $response = Http::withBasicAuth(
            (string) config('mpesa.consumer_key'),
            (string) config('mpesa.consumer_secret'),
        )
            ->acceptJson()
            ->timeout(20)
            ->get(rtrim((string) config('mpesa.base_url'), '/').'/oauth/v1/generate?grant_type=client_credentials');

        if ($response->failed() || blank($response->json('access_token'))) {
            throw new RuntimeException('M-Pesa authentication failed. Check the sandbox consumer key and secret.');
        }

        return (string) $response->json('access_token');
    }

    private function callbackUrl(): string
    {
        $url = (string) config('mpesa.callback_url');

        if ($url === '') {
            $url = route('payments.mpesa.callback');
        }

        $secret = (string) config('mpesa.callback_secret');

        if ($secret !== '') {
            $url .= (str_contains($url, '?') ? '&' : '?').'secret='.urlencode($secret);
        }

        return $url;
    }
}
