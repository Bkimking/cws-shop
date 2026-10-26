<?php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        if ($request->wantsJson()) {
            return response()->json(['two_factor' => false]);
        }

        $user = $request->user();

        // Resolver order from doc 05 §5.3: back-office first, then the till,
        // then the public landing page for accounts with no assignment yet.
        if ($user->can('access admin panel')) {
            return redirect()->intended('/admin');
        }

        if ($user->can('use pos terminal')) {
            return redirect()->intended('/pos');
        }

        return redirect()->intended('/');
    }
}
