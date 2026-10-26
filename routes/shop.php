<?php

use App\Http\Controllers\Shop\ShopAssistantController;
use App\Http\Controllers\Shop\ShopController;
use Illuminate\Support\Facades\Route;

Route::get('/', [ShopController::class, 'landing'])->name('home');

Route::prefix('shop')->name('shop.')->group(function () {
    Route::get('/', [ShopController::class, 'index'])->name('index');
    Route::get('product/{product}', [ShopController::class, 'show'])->name('show');
    Route::get('cart', [ShopController::class, 'cart'])->name('cart');
    Route::post('cart/add', [ShopController::class, 'add'])->name('cart.add');
    Route::patch('cart/{variant}', [ShopController::class, 'update'])->name('cart.update');
    Route::delete('cart/{variant}', [ShopController::class, 'remove'])->name('cart.remove');
    Route::get('checkout', [ShopController::class, 'checkout'])->name('checkout');
    Route::post('checkout', [ShopController::class, 'placeOrder'])->name('checkout.store');
    Route::get('orders/{order:public_token}', [ShopController::class, 'order'])->name('order');
    Route::post('orders/{order:public_token}/retry', [ShopController::class, 'retry'])->name('order.retry');
    Route::post('orders/{order:public_token}/refresh', [ShopController::class, 'refreshStatus'])->name('order.refresh');
    Route::post('orders/{order:public_token}/email', [ShopController::class, 'emailReceipt'])->name('order.email');
    Route::get('orders/{order:public_token}/status', [ShopController::class, 'orderStatus'])->name('order.status');
    Route::get('assistant', [ShopAssistantController::class, 'index'])->name('assistant');
    Route::post('assistant/chat', [ShopAssistantController::class, 'chat'])->middleware('throttle:shop-ai')->name('assistant.chat');
    Route::get('about', [ShopController::class, 'about'])->name('about');
    Route::get('contact', [ShopController::class, 'contact'])->name('contact');
});
