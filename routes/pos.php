<?php

use App\Http\Controllers\Pos\PosController;
use App\Http\Controllers\Pos\TillController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'permission:use pos terminal'])
    ->prefix('pos')
    ->name('pos.')
    ->group(function () {
        Route::get('/', [PosController::class, 'index'])->name('index');

        Route::post('sales', [PosController::class, 'store'])
            ->middleware('permission:create orders')
            ->name('sales.store');

        Route::get('sales/{order}/status', [PosController::class, 'status'])
            ->middleware('permission:create orders')
            ->name('sales.status');

        Route::post('till/open', [TillController::class, 'open'])
            ->middleware('permission:manage till')
            ->name('till.open');

        Route::post('till/close', [TillController::class, 'close'])
            ->middleware('permission:manage till')
            ->name('till.close');
    });
