<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ToastHelper;
use App\Http\Controllers\Controller;
use App\Tour\TourService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GuideController extends Controller
{
    public function index(Request $request, TourService $tour): Response
    {
        $user = $request->user();

        return Inertia::render('admin/guide', [
            'steps' => $tour->stepsFor($user),
            'completedSteps' => $user->tour_completed_steps ?? [],
            'currentStep' => $user->tour_current_step,
            'completedAt' => $user->tour_completed_at?->toIso8601String(),
            'skippedAt' => $user->tour_skipped_at?->toIso8601String(),
        ]);
    }

    public function step(Request $request, TourService $tour): RedirectResponse
    {
        $validated = $request->validate([
            'step_key' => ['required', 'string'],
            'next_step_key' => ['nullable', 'string'],
            'completed' => ['nullable', 'boolean'],
        ]);

        $user = $request->user();
        $keys = collect($tour->stepsFor($user))->pluck('key');

        abort_unless($keys->contains($validated['step_key']), 422);
        abort_if(
            isset($validated['next_step_key']) && ! $keys->contains($validated['next_step_key']),
            422,
        );

        $completed = collect($user->tour_completed_steps ?? []);

        if ($request->boolean('completed')) {
            $completed->push($validated['step_key']);
        }

        $resume = $validated['next_step_key'] ?? $validated['step_key'];

        $user->forceFill([
            'tour_current_step' => $resume,
            'tour_completed_steps' => $completed->unique()->values()->all(),
        ])->save();

        return back();
    }

    public function complete(Request $request, TourService $tour): RedirectResponse
    {
        $user = $request->user();

        $user->forceFill([
            'tour_completed_at' => now(),
            'tour_skipped_at' => null,
            'tour_current_step' => null,
            'tour_completed_steps' => collect($tour->stepsFor($user))->pluck('key')->all(),
        ])->save();

        ToastHelper::success('Tour complete. You can replay any section from the guide.');

        return back();
    }

    public function skip(Request $request): RedirectResponse
    {
        $request->user()->forceFill([
            'tour_skipped_at' => now(),
        ])->save();

        ToastHelper::success('Tour skipped. Open Guide any time to explore a section.');

        return back();
    }

    public function reset(Request $request): RedirectResponse
    {
        $request->user()->forceFill([
            'tour_completed_at' => null,
            'tour_skipped_at' => null,
            'tour_current_step' => null,
            'tour_completed_steps' => null,
        ])->save();

        ToastHelper::success('Guided tour reset.');

        return back();
    }
}
