<?php

namespace App\Services\Portal;

use App\Models\PortalAnnouncement;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AnnouncementService
{
    public function __construct(private readonly PortalClient $client) {}

    public function sync(): void
    {
        if (! $this->configured()) {
            return;
        }

        try {
            $path = '/api/control/v1/announcements?platform=web';
            $headers = $this->client->signedHeaders('GET', '', $path);
            $response = Http::acceptJson()->timeout(15)->withHeaders($headers)
                ->get(rtrim((string) config('portal.url'), '/').$path);

            if ($response->failed()) {
                return;
            }

            foreach ((array) $response->json('announcements', []) as $data) {
                PortalAnnouncement::updateOrCreate(
                    ['portal_id' => $data['id']],
                    [
                        'title' => $data['title'],
                        'body' => $data['body'],
                        'type' => $data['type'] ?? 'update',
                        'pinned' => (bool) ($data['pinned'] ?? false),
                        'download_url' => $data['download_url'] ?? null,
                        'published_at' => $data['published_at'] ?? now(),
                    ],
                );
            }
        } catch (\Throwable $exception) {
            Log::warning('CWS announcement sync failed.', ['message' => $exception->getMessage()]);
        }
    }

    public function markRead(PortalAnnouncement $announcement): void
    {
        if (! $this->configured()) {
            return;
        }

        try {
            $path = '/api/control/v1/announcements/'.$announcement->portal_id.'/read';
            $headers = $this->client->signedHeaders('POST', '', $path);

            Http::acceptJson()->timeout(15)->withHeaders($headers)
                ->post(rtrim((string) config('portal.url'), '/').$path);
        } catch (\Throwable $exception) {
            Log::warning('Announcement read receipt failed.', ['message' => $exception->getMessage()]);
        }
    }

    private function configured(): bool
    {
        return (bool) config('portal.enabled')
            && filled(config('portal.installation_id'))
            && filled(config('portal.api_secret'));
    }
}
