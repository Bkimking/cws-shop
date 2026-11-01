<?php

namespace App\Services\Portal;

use App\Models\SupportMessage;
use App\Models\SupportTicket;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class SupportService
{
    public function __construct(private readonly PortalClient $client) {}

    public function sync(): void
    {
        if (! $this->configured()) {
            return;
        }

        $this->pushPending();

        try {
            $path = '/api/control/v1/tickets';
            $headers = $this->client->signedHeaders('GET', '', $path);
            $response = Http::acceptJson()->timeout(15)->withHeaders($headers)
                ->get(rtrim((string) config('portal.url'), '/').$path);

            if ($response->failed()) {
                throw new RuntimeException('Support sync failed.');
            }

            foreach ((array) $response->json('tickets', []) as $data) {
                $this->upsert($data);
            }
        } catch (Throwable $exception) {
            Log::warning('CWS support sync failed.', ['message' => $exception->getMessage()]);
        }
    }

    public function create(string $subject, string $body, string $sender = 'CWS Superadmin'): SupportTicket
    {
        $local = SupportTicket::create([
            'subject' => $subject, 'status' => 'open', 'sync_state' => 'pending', 'last_message_at' => now(),
        ]);
        $local->messages()->create([
            'sender_type' => 'cws', 'sender_name' => $sender, 'body' => $body, 'sync_state' => 'pending',
        ]);

        if (! $this->configured()) {
            return $local;
        }

        try {
            $payload = ['subject' => $subject, 'body' => $body, 'sender_name' => $sender];
            $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
            $path = '/api/control/v1/tickets';
            $headers = $this->client->signedHeaders('POST', $json, $path);

            $response = Http::acceptJson()->timeout(15)->withHeaders($headers)
                ->withBody($json, 'application/json')->post(rtrim((string) config('portal.url'), '/').$path);

            if ($response->failed()) {
                throw new RuntimeException('Support ticket push failed.');
            }

            $ticket = $this->upsert((array) $response->json('ticket'));
            $local->delete();

            return $ticket;
        } catch (Throwable $exception) {
            Log::warning('Support ticket kept locally.', ['message' => $exception->getMessage()]);

            return $local;
        }
    }

    public function reply(SupportTicket $ticket, string $body, string $sender = 'CWS Superadmin'): void
    {
        $message = $ticket->messages()->create([
            'sender_type' => 'cws', 'sender_name' => $sender, 'body' => $body, 'sync_state' => 'pending',
        ]);
        $ticket->update(['last_message_at' => now()]);

        if (! $this->configured() || $ticket->portal_ticket_id === null) {
            return;
        }

        try {
            $payload = ['body' => $body, 'sender_name' => $sender];
            $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
            $path = '/api/control/v1/tickets/'.$ticket->portal_ticket_id.'/messages';
            $headers = $this->client->signedHeaders('POST', $json, $path);

            $response = Http::acceptJson()->timeout(15)->withHeaders($headers)
                ->withBody($json, 'application/json')
                ->post(rtrim((string) config('portal.url'), '/').$path);

            if ($response->failed()) {
                throw new RuntimeException('Support reply push failed.');
            }

            $message->update([
                'sync_state' => 'synced',
                'portal_message_id' => $response->json('message.id'),
            ]);
        } catch (Throwable $exception) {
            Log::warning('Support reply kept locally.', ['message' => $exception->getMessage()]);
        }
    }

    public function pushPending(): void
    {
        if (! $this->configured()) {
            return;
        }

        SupportTicket::query()
            ->whereNull('portal_ticket_id')
            ->where('sync_state', 'pending')
            ->each(function (SupportTicket $ticket) {
                $first = $ticket->messages()->oldest()->first();
                if ($first === null) {
                    return;
                }

                $payload = [
                    'subject' => $ticket->subject,
                    'body' => $first->body,
                    'sender_name' => $first->sender_name ?? 'CWS Superadmin',
                ];
                $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
                $path = '/api/control/v1/tickets';
                $headers = $this->client->signedHeaders('POST', $json, $path);

                try {
                    $response = Http::acceptJson()->timeout(15)->withHeaders($headers)
                        ->withBody($json, 'application/json')
                        ->post(rtrim((string) config('portal.url'), '/').$path);

                    if ($response->failed()) {
                        return;
                    }

                    $this->upsert((array) $response->json('ticket'));
                    $ticket->delete();
                } catch (Throwable $exception) {
                    Log::warning('Pending support ticket retry failed.', ['message' => $exception->getMessage()]);
                }
            });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function upsert(array $data): SupportTicket
    {
        $ticket = SupportTicket::updateOrCreate(
            ['portal_ticket_id' => $data['id']],
            [
                'subject' => (string) ($data['subject'] ?? 'Support ticket'),
                'status' => (string) ($data['status'] ?? 'open'),
                'last_message_at' => $data['last_message_at'] ?? now(),
            ],
        );

        foreach ((array) ($data['messages'] ?? []) as $message) {
            SupportMessage::updateOrCreate(
                ['portal_message_id' => $message['id']],
                [
                    'support_ticket_id' => $ticket->id,
                    'sender_type' => (string) ($message['sender_type'] ?? 'portal'),
                    'sender_name' => $message['sender_name'] ?? null,
                    'body' => (string) ($message['body'] ?? ''),
                ],
            );
        }

        return $ticket;
    }

    private function configured(): bool
    {
        return (bool) config('portal.enabled')
            && filled(config('portal.installation_id'))
            && filled(config('portal.api_secret'));
    }
}
