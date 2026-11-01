<?php

/**
 * SCAFFOLD ONLY — this file is intentionally not loaded by bootstrap/app.php.
 *
 * Copy into routes/ only after the controllers, middleware, models and tests
 * exist. The portal is the only caller.
 */

use App\Http\Controllers\Api\Control\V1\AnnouncementController;
use App\Http\Controllers\Api\Control\V1\EntitlementController;
use App\Http\Controllers\Api\Control\V1\EventController;
use App\Http\Controllers\Api\Control\V1\HealthController;
use App\Http\Controllers\Api\Control\V1\HeartbeatController;
use App\Http\Controllers\Api\Control\V1\OperationsController;
use App\Http\Controllers\Api\Control\V1\TicketController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/control/v1')
    ->middleware(['portal.signature'])
    ->group(function () {
        Route::get('health', [HealthController::class, 'show']);
        Route::get('entitlement', [EntitlementController::class, 'show']);
        Route::post('heartbeat', [HeartbeatController::class, 'store']);

        Route::post('events', [EventController::class, 'store']);
        Route::get('overview', [OperationsController::class, 'overview']);
        Route::get('orders', [OperationsController::class, 'orders']);

        Route::get('tickets', [TicketController::class, 'index']);
        Route::post('tickets', [TicketController::class, 'store']);
        Route::post('tickets/{ticket}/messages', [TicketController::class, 'message']);

        Route::get('announcements', [AnnouncementController::class, 'index']);
        Route::post('announcements/{announcement}/read', [AnnouncementController::class, 'read']);
    });
