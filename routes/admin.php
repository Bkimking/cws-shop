<?php

use App\Http\Controllers\Admin\ActivityLogsController;
use App\Http\Controllers\Admin\Ai\AiCenterController;
use App\Http\Controllers\Admin\Ai\AiChatController;
use App\Http\Controllers\Admin\Ai\AiConversationController;
use App\Http\Controllers\Admin\Ai\AiFeedbackController;
use App\Http\Controllers\Admin\Ai\AiSettingsController;
use App\Http\Controllers\Admin\BranchController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\GuideController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\PaymentGatewayController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\RegionController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\RolePermissionController;
use App\Http\Controllers\Admin\StockController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\WarehouseController;
use App\Http\Controllers\Admin\WorkspaceController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'admin', 'region.scope', 'branch.scope'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        // Dashboard
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

        Route::get('guide', [GuideController::class, 'index'])->name('guide.index');
        Route::post('guide/step', [GuideController::class, 'step'])->name('guide.step');
        Route::post('guide/complete', [GuideController::class, 'complete'])->name('guide.complete');
        Route::post('guide/skip', [GuideController::class, 'skip'])->name('guide.skip');
        Route::post('guide/reset', [GuideController::class, 'reset'])->name('guide.reset');

        // Role workspaces
        Route::middleware('permission:view region reports')
            ->get('region', [WorkspaceController::class, 'region'])
            ->name('workspace.region');

        Route::middleware('permission:view branch reports')
            ->get('branch', [WorkspaceController::class, 'branch'])
            ->name('workspace.branch');

        Route::middleware('permission:view stock')
            ->get('inventory', [WorkspaceController::class, 'inventory'])
            ->name('workspace.inventory');

        // AI assistant
        Route::middleware('permission:use ai assistant')
            ->prefix('ai')
            ->name('ai.')
            ->group(function () {
                Route::get('/', [AiCenterController::class, 'index'])->name('index');
                Route::get('settings', [AiSettingsController::class, 'edit'])
                    ->middleware('permission:manage ai settings')
                    ->name('settings.edit');
                Route::put('settings', [AiSettingsController::class, 'update'])
                    ->middleware('permission:manage ai settings')
                    ->name('settings.update');
                Route::post('conversations', [AiConversationController::class, 'store'])->name('conversations.store');
                Route::post('chat', [AiChatController::class, 'store'])->middleware('throttle:ai-chat')->name('chat');
                Route::post('feedback', [AiFeedbackController::class, 'store'])->name('feedback');
                Route::get('{conversation}/messages', [AiConversationController::class, 'messages'])->name('conversations.messages');
                Route::patch('{conversation}', [AiConversationController::class, 'update'])->name('conversations.update');
                Route::delete('{conversation}', [AiConversationController::class, 'destroy'])->name('conversations.destroy');
                Route::get('{conversation}', [AiCenterController::class, 'show'])->name('show');
            });

        // Regions - manage regions permission
        Route::middleware('permission:manage regions')
            ->resource('regions', RegionController::class)
            ->except(['show']);

        Route::middleware('permission:manage regions')
            ->post('regions/{region}/reactivate', [RegionController::class, 'reactivate'])
            ->name('regions.reactivate');

        // Branches - manage branches permission
        Route::middleware('permission:manage branches')
            ->resource('branches', BranchController::class)
            ->except(['show']);

        Route::middleware('permission:manage branches')
            ->post('branches/{branch}/reactivate', [BranchController::class, 'reactivate'])
            ->name('branches.reactivate');

        // Users - granular permissions
        Route::middleware('permission:manage users|view users')
            ->get('users', [UserController::class, 'index'])
            ->name('users.index');

        Route::middleware('permission:create users')
            ->group(function () {
                Route::get('users/create', [UserController::class, 'create'])->name('users.create');
                Route::post('users', [UserController::class, 'store'])->name('users.store');
            });

        Route::middleware('permission:edit users')
            ->group(function () {
                Route::get('users/{user}/edit', [UserController::class, 'edit'])->name('users.edit');
                Route::put('users/{user}', [UserController::class, 'update'])->name('users.update');
            });

        Route::middleware('permission:delete users')
            ->group(function () {
                Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
                Route::post('users/{user}/reactivate', [UserController::class, 'reactivate'])->name('users.reactivate');
            });

        // Categories - manage categories permission
        Route::middleware('permission:manage categories')
            ->group(function () {
                Route::get('categories', [CategoryController::class, 'index'])->name('categories.index');
                Route::get('categories/create', [CategoryController::class, 'create'])->name('categories.create');
                Route::get('categories/{category}/edit', [CategoryController::class, 'edit'])->name('categories.edit');
                Route::post('categories', [CategoryController::class, 'store'])->name('categories.store');
                Route::put('categories/{category}', [CategoryController::class, 'update'])->name('categories.update');
                Route::delete('categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');
            });

        // Products - multiple permissions for different actions
        Route::middleware('permission:view products')
            ->group(function () {
                Route::get('products', [ProductController::class, 'index'])->name('products.index');
                Route::get('products/create', [ProductController::class, 'create'])->name('products.create');
                Route::get('products/{product}/edit', [ProductController::class, 'edit'])->name('products.edit');
                Route::post('products/generate-sku', [ProductController::class, 'generateSku'])->name('products.generate-sku');
            });

        Route::middleware('permission:create products')
            ->group(function () {
                Route::post('products', [ProductController::class, 'store'])->name('products.store');
            });

        Route::middleware('permission:edit products')
            ->group(function () {
                Route::put('products/{product}', [ProductController::class, 'update'])->name('products.update');
            });

        Route::middleware('permission:delete products')
            ->group(function () {
                Route::delete('products/{product}', [ProductController::class, 'destroy'])->name('products.destroy');
                Route::post('products/{product}/reactivate', [ProductController::class, 'reactivate'])->name('products.reactivate');
            });

        Route::middleware('permission:edit products')
            ->group(function () {
                Route::delete('products/{product}/images/{image}', [ProductController::class, 'removeImage'])->name('products.images.destroy');
                Route::post('products/{product}/images/{image}/primary', [ProductController::class, 'primaryImage'])->name('products.images.primary');
            });

        // Stock Management - multiple permissions
        Route::prefix('stock')
            ->name('stock.')
            ->group(function () {
                Route::middleware('permission:view stock')
                    ->group(function () {
                        Route::get('/', [StockController::class, 'index'])->name('index');
                        Route::get('{stockLevel}', [StockController::class, 'show'])->name('show');
                    });

                Route::middleware('permission:adjust stock')
                    ->group(function () {
                        Route::post('{stockLevel}/adjust', [StockController::class, 'adjust'])->name('adjust');
                        Route::post('{stockLevel}/reorder-point', [StockController::class, 'updateReorderPoint'])->name('updateReorderPoint');
                        Route::post('create-stock-level', [StockController::class, 'createStockLevel'])->name('createStockLevel');
                    });

                Route::middleware('permission:transfer stock')
                    ->group(function () {
                        Route::post('transfer', [StockController::class, 'transfer'])->name('transfer');
                    });
            });

        // Warehouses - granular permissions
        Route::middleware('permission:manage warehouses')
            ->get('warehouses', [WarehouseController::class, 'index'])
            ->name('warehouses.index');

        Route::middleware('permission:create warehouses')
            ->group(function () {
                Route::get('warehouses/create', [WarehouseController::class, 'create'])->name('warehouses.create');
                Route::post('warehouses', [WarehouseController::class, 'store'])->name('warehouses.store');
            });

        Route::middleware('permission:edit warehouses')
            ->group(function () {
                Route::get('warehouses/{warehouse}/edit', [WarehouseController::class, 'edit'])->name('warehouses.edit');
                Route::put('warehouses/{warehouse}', [WarehouseController::class, 'update'])->name('warehouses.update');
            });

        Route::middleware('permission:delete warehouses')
            ->delete('warehouses/{warehouse}', [WarehouseController::class, 'destroy'])
            ->name('warehouses.destroy');

        // Orders - multiple permissions
        Route::middleware('permission:view orders')
            ->group(function () {
                Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
                Route::get('orders/create', [OrderController::class, 'create'])->name('orders.create');
                Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show');
                Route::get('orders/{order}/edit', [OrderController::class, 'edit'])->name('orders.edit');
            });

        Route::middleware('permission:create orders')
            ->group(function () {
                Route::post('orders', [OrderController::class, 'store'])->name('orders.store');
            });

        Route::middleware('permission:edit orders')
            ->group(function () {
                Route::put('orders/{order}', [OrderController::class, 'update'])->name('orders.update');
            });

        Route::middleware('permission:refund orders')
            ->group(function () {
                Route::post('orders/{order}/refund', [OrderController::class, 'refund'])->name('orders.refund');
            });

        Route::middleware('permission:manage pickups')
            ->group(function () {
                Route::post('orders/{order}/pickup/ready', [OrderController::class, 'pickupReady'])->name('orders.pickup.ready');
                Route::post('orders/{order}/pickup/collected', [OrderController::class, 'pickupCollected'])->name('orders.pickup.collected');
            });

        // Payment Gateways - granular permissions
        Route::middleware('permission:manage payment gateways')
            ->get('payment-gateways', [PaymentGatewayController::class, 'index'])
            ->name('payment-gateways.index');

        Route::middleware('permission:create payment gateways')
            ->group(function () {
                Route::get('payment-gateways/create', [PaymentGatewayController::class, 'create'])->name('payment-gateways.create');
                Route::post('payment-gateways', [PaymentGatewayController::class, 'store'])->name('payment-gateways.store');
            });

        Route::middleware('permission:edit payment gateways')
            ->group(function () {
                Route::get('payment-gateways/{paymentGatewayConfig}/edit', [PaymentGatewayController::class, 'edit'])->name('payment-gateways.edit');
                Route::put('payment-gateways/{paymentGatewayConfig}', [PaymentGatewayController::class, 'update'])->name('payment-gateways.update');
                Route::post('payment-gateways/{paymentGatewayConfig}/test-connection', [PaymentGatewayController::class, 'testConnection'])->name('payment-gateways.test-connection');
            });

        Route::middleware('permission:activate payment gateways')
            ->post('payment-gateways/{paymentGatewayConfig}/activate', [PaymentGatewayController::class, 'activate'])
            ->name('payment-gateways.activate');

        Route::middleware('permission:delete payment gateways')
            ->delete('payment-gateways/{paymentGatewayConfig}', [PaymentGatewayController::class, 'destroy'])
            ->name('payment-gateways.destroy');

        // Reports - view reports permission
        Route::middleware('permission:view reports')
            ->prefix('reports')
            ->name('reports.')
            ->group(function () {
                Route::get('/', [ReportController::class, 'index'])->name('index');
            });

        // Roles & Permissions - manage permissions and roles permission
        Route::middleware('permission:manage permissions and roles')
            ->prefix('roles')
            ->name('roles.')
            ->group(function () {
                Route::get('/', [RolePermissionController::class, 'index'])->name('index');
                Route::post('/', [RolePermissionController::class, 'store'])->name('store');
                Route::put('{role}', [RolePermissionController::class, 'update'])->name('update');
                Route::delete('{role}', [RolePermissionController::class, 'destroy'])->name('destroy');
            });
        // Activity log - view activity log permission
        Route::middleware('permission:view activity log')
            ->group(function () {
                Route::get('activity', [ActivityLogsController::class, 'index'])
                    ->name('activity.index');

                // Detail-page endpoints (JSON; consumed by Activity tabs)
                Route::get('regions/{region}/activity', [ActivityLogsController::class, 'region'])
                    ->name('activity.region');

                Route::get('branches/{branch}/activity', [ActivityLogsController::class, 'branch'])
                    ->name('activity.branch');

                Route::get('users/{user}/activity', [ActivityLogsController::class, 'user'])
                    ->name('activity.user');

                Route::get('categories/{category}/activity', [ActivityLogsController::class, 'category'])
                    ->name('activity.category');

                Route::get('products/{product}/activity', [ActivityLogsController::class, 'product'])
                    ->name('activity.product');

                Route::get('orders/{order}/activity', [ActivityLogsController::class, 'order'])
                    ->name('activity.order');

                Route::get('payment-gateways/{payment_gateway_config}/activity', [ActivityLogsController::class, 'paymentGateway'])
                    ->name('activity.paymentGateway');

                Route::get('warehouses/{warehouse}/activity', [ActivityLogsController::class, 'warehouse'])
                    ->name('activity.warehouse');
            });
    });
