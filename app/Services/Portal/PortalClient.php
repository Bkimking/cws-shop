<?php

namespace App\Services\Portal;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class PortalClient
{
    /**
     * First connection. The secret is sent once in the body and exchanged for
     * an installation identity; subsequent calls are HMAC signed.
     *
     * @return array<string, mixed>
     */
    public function connect(): array
    {
        $response = Http::acceptJson()
            ->timeout(15)
            ->post($this->url('/api/control/v1/connect'), [
                'installation_id' => $this->installationId(),
                'api_secret' => $this->secret(),
                'api_key' => $this->apiKey(),
                'app_version' => (string) config('app.version', '1.0.0'),
                'environment' => app()->environment(),
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Portal handshake failed: '.$response->body());
        }

        return (array) $response->json();
    }

    /**
     * Fetch the latest signed entitlement snapshot.
     *
     * @return array<string, mixed>
     */
    public function status(): array
    {
        $path = '/api/control/v1/status';
        $headers = $this->signedHeaders('GET', '', $path);

        $response = Http::acceptJson()
            ->timeout(15)
            ->withHeaders($headers)
            ->get($this->url($path));

        if ($response->failed()) {
            throw new RuntimeException('Portal status request failed: '.$response->body());
        }

        return (array) $response->json();
    }

    /**
     * @return array<string, string>
     */
    public function signedHeaders(string $method, string $body, string $path): array
    {
        $timestamp = (string) time();
        $nonce = (string) Str::uuid();
        $canonical = $timestamp."\n".$nonce."\n".hash('sha256', $body);
        $signature = hash_hmac('sha256', $canonical, $this->secret());

        return [
            'X-Installation-Id' => $this->installationId(),
            'X-Timestamp' => $timestamp,
            'X-Nonce' => $nonce,
            'X-Signature' => $signature,
        ];
    }

    private function url(string $path): string
    {
        return rtrim((string) config('portal.url'), '/').$path;
    }

    private function installationId(): string
    {
        $value = (string) config('portal.installation_id');
        if ($value === '') {
            throw new RuntimeException('PORTAL_INSTALLATION_ID is not configured.');
        }

        return $value;
    }

    private function apiKey(): string
    {
        return (string) config('portal.api_key');
    }

    private function secret(): string
    {
        $value = (string) config('portal.api_secret');
        if ($value === '') {
            throw new RuntimeException('PORTAL_API_SECRET is not configured.');
        }

        return $value;
    }
}
