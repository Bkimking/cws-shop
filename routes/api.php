<?php

use App\Http\Controllers\Api\MpesaCallbackController;
use Illuminate\Support\Facades\Route;

Route::post('/payments/mpesa/callback', MpesaCallbackController::class)
    ->name('payments.mpesa.callback');
