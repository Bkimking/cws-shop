<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiUserPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Laravel\Fortify\Fortify;

class AuthController extends Controller
{
    public function login(Request $request, ApiUserPresenter $presenter): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ]);

        $user = User::query()->where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        if (! $user->canAccessApplication() || ! $user->can('use pos terminal')) {
            return response()->json([
                'message' => 'This account cannot use the POS terminal.',
                'code' => 'permission_denied',
            ], 403);
        }

        if ($user->branch === null || ! $user->branch->is_active) {
            return response()->json([
                'message' => 'No active branch is assigned to this account.',
                'code' => 'account_inactive',
            ], 403);
        }

        if ($user->two_factor_confirmed_at !== null && filled($user->two_factor_secret)) {
            $challenge = (string) Str::uuid();
            Cache::put('api-2fa:'.$challenge, $user->id, now()->addMinutes(5));

            return response()->json([
                'message' => 'Two-factor authentication is required.',
                'data' => [
                    'two_factor_required' => true,
                    'challenge_token' => $challenge,
                ],
            ], 202);
        }

        return $this->tokenResponse($user, $validated['device_name'] ?? 'Windows POS', $presenter);
    }

    public function twoFactor(Request $request, ApiUserPresenter $presenter): JsonResponse
    {
        $validated = $request->validate([
            'challenge_token' => ['required', 'string'],
            'code' => ['required', 'string', 'max:12'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ]);

        $userId = Cache::get('api-2fa:'.$validated['challenge_token']);

        if (! $userId) {
            return response()->json([
                'message' => 'The two-factor challenge has expired. Sign in again.',
                'code' => 'two_factor_expired',
            ], 422);
        }

        /** @var User $user */
        $user = User::query()->findOrFail($userId);

        if (blank($user->two_factor_secret)) {
            return response()->json(['message' => 'Two-factor authentication is not configured.'], 422);
        }

        $secret = Fortify::currentEncrypter()->decrypt($user->two_factor_secret);
        $valid = app(TwoFactorAuthenticationProvider::class)->verify($secret, $validated['code']);

        if (! $valid) {
            throw ValidationException::withMessages([
                'code' => 'That authentication code is invalid.',
            ]);
        }

        Cache::forget('api-2fa:'.$validated['challenge_token']);

        return $this->tokenResponse($user, $validated['device_name'] ?? 'Windows POS', $presenter);
    }

    public function me(Request $request, ApiUserPresenter $presenter): JsonResponse
    {
        return response()->json([
            'message' => 'Authenticated.',
            'data' => $presenter->present($request->user()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Signed out.']);
    }

    private function tokenResponse(User $user, string $deviceName, ApiUserPresenter $presenter): JsonResponse
    {
        $token = $user->createToken($deviceName, ['pos']);

        return response()->json([
            'message' => 'Signed in.',
            'data' => [
                ...$presenter->present($user),
                'token' => $token->plainTextToken,
                'token_type' => 'Bearer',
            ],
        ]);
    }
}
