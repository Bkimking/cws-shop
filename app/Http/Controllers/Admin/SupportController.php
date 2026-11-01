<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Services\Portal\SupportService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SupportController extends Controller
{
    public function index(Request $request, SupportService $support)
    {
        $this->authorizeSuperadmin($request);
        $support->sync();

        $tickets = SupportTicket::query()->with('messages')->latest('last_message_at')->get();

        return Inertia::render('admin/support/index', [
            'tickets' => $tickets,
        ]);
    }

    public function store(Request $request, SupportService $support)
    {
        $this->authorizeSuperadmin($request);
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:10000'],
        ]);

        $support->create($data['subject'], $data['body'], $request->user()->name);

        return redirect()->back()->with('success', 'Support ticket created.');
    }

    public function reply(Request $request, SupportTicket $ticket, SupportService $support)
    {
        $this->authorizeSuperadmin($request);
        $data = $request->validate(['body' => ['required', 'string', 'max:10000']]);

        $support->reply($ticket, $data['body'], $request->user()->name);

        return redirect()->back()->with('success', 'Reply sent.');
    }

    private function authorizeSuperadmin(Request $request): void
    {
        abort_unless($request->user()?->getRoleNames()->contains('Superadmin'), 403);
    }
}
