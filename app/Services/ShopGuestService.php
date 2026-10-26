<?php

namespace App\Services;

use App\Models\ShopGuest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;

class ShopGuestService
{
    public const COOKIE = 'shop_guest_token';

    public function resolve(Request $request): ShopGuest
    {
        $token = (string) ($request->cookie(self::COOKIE) ?: $request->session()->get(self::COOKIE, ''));
        $guest = $token !== ''
            ? ShopGuest::query()->where('token', $token)->first()
            : null;

        if (! $guest) {
            $guest = ShopGuest::create([
                'token' => (string) Str::uuid(),
                'last_seen_at' => now(),
            ]);
        } else {
            $guest->forceFill(['last_seen_at' => now()])->save();
        }

        Cookie::queue(cookie()->forever(self::COOKIE, $guest->token));
        $request->session()->put(self::COOKIE, $guest->token);

        return $guest;
    }

    public function rememberContact(ShopGuest $guest, string $email, string $phone): ShopGuest
    {
        $guest->forceFill([
            'email' => $email,
            'phone' => $phone,
            'last_seen_at' => now(),
        ])->save();

        return $guest;
    }
}
