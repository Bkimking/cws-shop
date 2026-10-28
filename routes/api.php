<?php

use App\Http\Controllers\Api\MpesaCallbackController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\MiscController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\TillController;
use App\Http\Middleware\EnsureIdempotent;
use Illuminate\Support\Facades\Route;

Route::post('/payments/mpesa/callback', MpesaCallbackController::class)
    ->name('payments.mpesa.callback');

Route::prefix('v1')->group(function () {
    Route::post('payments/mpesa/callback', MpesaCallbackController::class)->name('v1.payments.mpesa.callback');

    Route::get('health', [MiscController::class, 'health'])->name('v1.health');
    Route::get('min-version', [MiscController::class, 'minVersion'])->name('v1.min-version');

    Route::prefix('auth')->name('v1.auth.')->group(function () {
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:6,1')->name('login');
        Route::post('two-factor', [AuthController::class, 'twoFactor'])->middleware('throttle:6,1')->name('two-factor');

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('me', [AuthController::class, 'me'])->name('me');
            Route::post('logout', [AuthController::class, 'logout'])->name('logout');
        });
    });

    Route::middleware(['auth:sanctum', 'permission:use pos terminal'])->group(function () {
        Route::get('bootstrap', [MiscController::class, 'bootstrap'])->name('v1.bootstrap');
        Route::get('settings', [MiscController::class, 'settings'])->name('v1.settings');

        Route::prefix('catalog')->name('v1.catalog.')->group(function () {
            Route::get('categories', [CatalogController::class, 'categories'])->name('categories');
            Route::get('products', [CatalogController::class, 'products'])->name('products');
            Route::get('updated-since', [CatalogController::class, 'products'])->name('updated-since');
        });

        Route::prefix('till')->name('v1.till.')->group(function () {
            Route::get('current', [TillController::class, 'current'])->name('current');
            Route::get('x-report', [TillController::class, 'xReport'])->name('x-report');
            Route::post('open', [TillController::class, 'open'])->middleware('permission:manage till')->name('open');
            Route::post('close', [TillController::class, 'close'])->middleware('permission:manage till')->name('close');
        });

        Route::prefix('orders')->name('v1.orders.')->group(function () {
            Route::get('today', [OrderController::class, 'today'])->name('today');
            Route::get('{order}', [OrderController::class, 'show'])->name('show');
            Route::post('/', [OrderController::class, 'store'])
                ->middleware(['permission:create orders', EnsureIdempotent::class])
                ->name('store');
        });

        Route::prefix('payments')->name('v1.payments.')->group(function () {
            Route::get('{payment}/status', [OrderController::class, 'paymentStatus'])->name('status');
            Route::post('{payment}/cancel', [OrderController::class, 'cancelPayment'])
                ->middleware('permission:create orders')
                ->name('cancel');
        });
    });
});
