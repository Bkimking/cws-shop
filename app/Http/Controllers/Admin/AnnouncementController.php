<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PortalAnnouncement;
use App\Services\Portal\AnnouncementService;
use Inertia\Inertia;

class AnnouncementController extends Controller
{
    public function index(AnnouncementService $announcements)
    {
        $announcements->sync();

        return Inertia::render('admin/announcements/index', [
            'announcements' => PortalAnnouncement::query()->orderByDesc('pinned')->latest('published_at')->get(),
        ]);
    }

    public function read(PortalAnnouncement $announcement, AnnouncementService $announcements)
    {
        $announcements->markRead($announcement);
        $announcement->update(['read_at' => now()]);

        return redirect()->back();
    }
}
