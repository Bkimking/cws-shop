<?php

namespace App\Http\Controllers\Admin\Ai;

use App\Ai\AiConversationService;
use App\Ai\AiProviders;
use App\Ai\AiScope;
use App\Ai\AiSettings;
use App\Ai\AiUsage;
use App\Http\Controllers\Controller;
use App\Models\Region;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Ai\Models\Conversation;

class AiCenterController extends Controller
{
    public function index(Request $request, AiConversationService $conversations, AiSettings $settings, AiUsage $usage): Response
    {
        return $this->page($request, null, $conversations, $settings, $usage);
    }

    public function show(
        Request $request,
        Conversation $conversation,
        AiConversationService $conversations,
        AiSettings $settings,
        AiUsage $usage,
    ): Response {
        Gate::authorize('view', $conversation);

        return $this->page($request, $conversation, $conversations, $settings, $usage);
    }

    private function page(
        Request $request,
        ?Conversation $conversation,
        AiConversationService $conversations,
        AiSettings $settings,
        AiUsage $usage,
    ): Response {
        $user = $request->user();
        $scope = AiScope::forStaff($user, $request);

        $conversationList = $conversations->forUser($user)
            ->map(fn (Conversation $item) => [
                'id' => $item->getKey(),
                'title' => $item->getAttribute('title') ?: 'New chat',
                'updated_at' => Carbon::parse($item->getAttribute('updated_at'))->toISOString(),
            ])
            ->values();

        $regions = $user->hasRole('Superadmin')
            ? Region::query()
                ->where('is_active', true)
                ->with(['branches' => fn ($query) => $query->where('is_active', true)->select('id', 'region_id', 'name')])
                ->get(['id', 'name', 'currency_code'])
            : [];

        return Inertia::render('admin/ai/index', [
            'conversations' => $conversationList,
            'activeConversation' => $conversation ? [
                'id' => $conversation->getKey(),
                'title' => $conversation->getAttribute('title'),
            ] : null,
            'messages' => $conversation ? $conversations->uiMessages($conversation) : [],
            'scope' => [
                'label' => $scope->label(),
                'region_id' => $scope->region?->id,
                'branch_id' => $scope->branch?->id,
                'currency' => $scope->currency(),
                'timezone' => $scope->timezone(),
            ],
            'regions' => $regions,
            'can' => [
                'use' => $user->can('use ai assistant') && $scope->hasAdminSpecialistAccess(),
                'manage' => $user->can('manage ai settings'),
                'insights' => $user->can('view ai insights'),
            ],
            'aiEnabled' => $settings->enabled($scope),
            'providerConfigured' => $settings->providerConfigured(),
            'providers' => AiProviders::chain(),
            'usage' => $usage->snapshot($scope),
        ]);
    }
}
