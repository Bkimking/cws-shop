<?php

namespace App\Services\Portal;

use App\Models\PortalEntitlement;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class EntitlementService
{
    public function __construct(private readonly PortalClient $client) {}

    /**
     * Refresh the cached snapshot from the portal.
     */
    public function refresh(): ?PortalEntitlement
    {
        if (! $this->configured()) {
            return $this->current();
        }

        try {
            $payload = $this->current() === null
                ? $this->client->connect()
                : $this->client->status();

            $snapshot = $payload['entitlement'] ?? $payload['data']['entitlement'] ?? null;

            if (! is_array($snapshot)) {
                throw new RuntimeException('Portal response did not include an entitlement snapshot.');
            }

            return $this->store($snapshot);
        } catch (Throwable $exception) {
            Log::warning('Portal entitlement refresh failed.', [
                'message' => $exception->getMessage(),
            ]);

            return $this->current();
        }
    }

    /**
     * @param  array<string, mixed>  $snapshot
     */
    public function store(array $snapshot): PortalEntitlement
    {
        $signature = (string) ($snapshot['signature'] ?? '');
        unset($snapshot['signature']);

        $secret = (string) config('portal.api_secret');

        if ($secret === '' || ! hash_equals($this->sign($snapshot, $secret), $signature)) {
            throw new RuntimeException('Entitlement signature is invalid.');
        }

        if (($snapshot['installation_id'] ?? null) !== config('portal.installation_id')) {
            throw new RuntimeException('Entitlement installation does not match this CWS.');
        }

        return PortalEntitlement::updateOrCreate(
            ['installation_id' => (string) config('portal.installation_id')],
            [
                'status' => (string) ($snapshot['status'] ?? 'active'),
                'plan_code' => $snapshot['plan']['code'] ?? null,
                'features' => $snapshot['features'] ?? [],
                'period_end' => $snapshot['period_end'] ?? null,
                'grace_until' => $snapshot['grace_until'] ?? null,
                'issued_at' => $snapshot['issued_at'] ?? null,
                'snapshot_expires_at' => $snapshot['expires_at'] ?? null,
                'signature' => $signature,
                'raw_payload' => [...$snapshot, 'signature' => $signature],
                'fetched_at' => now(),
            ],
        );
    }

    public function current(): ?PortalEntitlement
    {
        return PortalEntitlement::query()
            ->where('installation_id', (string) config('portal.installation_id'))
            ->first();
    }

    public function status(): string
    {
        $entitlement = $this->current();

        if ($entitlement === null) {
            // Legacy installations must keep working until the portal is connected.
            return 'active';
        }

        if (in_array($entitlement->status, ['suspended', 'maintenance', 'lifetime'], true)) {
            return $entitlement->status;
        }

        if ($entitlement->grace_until !== null && now()->greaterThan($entitlement->grace_until)) {
            return 'suspended';
        }

        if ($entitlement->period_end !== null && now()->greaterThan($entitlement->period_end)) {
            return 'grace';
        }

        return 'active';
    }

    public function allowsSales(): bool
    {
        return in_array($this->status(), ['active', 'grace', 'lifetime'], true);
    }

    /**
     * @return array<string, mixed>
     */
    public function frontend(): array
    {
        $entitlement = $this->current();

        return [
            'status' => $this->status(),
            'allows_sales' => $this->allowsSales(),
            'plan' => $entitlement?->plan_code,
            'period_end' => $entitlement?->period_end?->toIso8601String(),
            'grace_until' => $entitlement?->grace_until?->toIso8601String(),
        ];
    }

    public function configured(): bool
    {
        return (bool) config('portal.enabled')
            && filled(config('portal.installation_id'))
            && filled(config('portal.api_secret'));
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function sign(array $payload, string $secret): string
    {
        return hash_hmac(
            'sha256',
            json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
            $secret,
        );
    }
}
