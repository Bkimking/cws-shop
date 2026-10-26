<?php

namespace App\Http\Controllers\Admin\Ai;

use App\Ai\AiProviders;
use App\Http\Controllers\Controller;
use App\Models\AiSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AiSettingsController extends Controller
{
    private const SURFACES = [
        'admin_chat' => 'Admin chat and AI Panel',
        'admin_insights' => 'Nightly insights',
        'shop_chat' => 'Public shop assistant',
    ];

    public function edit(): Response
    {
        $stored = AiSetting::query()
            ->where('scope_key', 'global')
            ->get()
            ->keyBy('surface');

        $settings = collect(self::SURFACES)->map(function (string $label, string $surface) use ($stored): array {
            $setting = $stored->get($surface);

            if ($setting !== null) {
                return [
                    'surface' => $surface,
                    'label' => $label,
                    'enabled' => (bool) $setting->enabled,
                    'daily_token_cap' => $setting->daily_token_cap,
                    'daily_cost_cap' => $setting->daily_cost_cap,
                ];
            }

            return [
                'surface' => $surface,
                'label' => $label,
                'enabled' => (bool) config("ai.surfaces.{$surface}", false),
                'daily_token_cap' => config("ai.limits.{$surface}.daily_tokens"),
                'daily_cost_cap' => config("ai.limits.{$surface}.daily_cost"),
            ];
        })->values();

        return Inertia::render('admin/ai/settings', [
            'settings' => $settings,
            'aiEnabled' => (bool) config('ai.enabled'),
            'providers' => AiProviders::chain(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*.surface' => ['required', 'string', 'in:'.implode(',', array_keys(self::SURFACES))],
            'settings.*.enabled' => ['required', 'boolean'],
            'settings.*.daily_token_cap' => ['nullable', 'integer', 'min:1000'],
            'settings.*.daily_cost_cap' => ['nullable', 'numeric', 'min:0'],
        ]);

        foreach ($validated['settings'] as $row) {
            AiSetting::query()->updateOrCreate(
                ['scope_key' => 'global', 'surface' => $row['surface']],
                [
                    'enabled' => (bool) $row['enabled'],
                    'daily_token_cap' => $row['daily_token_cap'] ?? null,
                    'daily_cost_cap' => $row['daily_cost_cap'] ?? null,
                ],
            );
        }

        return back()->with('success', 'AI settings saved.');
    }
}
