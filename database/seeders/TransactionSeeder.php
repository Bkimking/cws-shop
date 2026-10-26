<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\TillSession;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TransactionSeeder extends Seeder
{
    public function run(): void
    {
        $branch = Branch::where('slug', 'ngong')->first();

        if (! $branch) {
            $this->command->error('Ngong branch not found. Run DatabaseSeeder first.');

            return;
        }

        $warehouse = Warehouse::firstOrCreate([
            'branch_id' => $branch->id,
            'name' => 'Shop floor',
        ]);

        // Create additional categories
        $categories = $this->createCategories();

        // Create expanded product catalog
        $products = $this->createProducts($categories, $warehouse);

        // Create customers
        $customers = $this->createCustomers($branch->region_id);

        // Create cashiers
        $cashiers = $this->createCashiers($branch);

        // Generate 10 days of transactions
        $this->generateTransactions($branch, $warehouse, $products, $customers, $cashiers);

        $this->command->info('Transaction data seeded successfully (10 days of realistic data).');
    }

    private function createCategories(): array
    {
        $categoryMap = [];

        $categories = [
            'Beverages', 'Snacks', 'Dairy', 'Bakery', 'Pantry',
            'Household', 'Personal Care', 'Electronics', 'Stationery',
        ];

        foreach ($categories as $name) {
            $category = Category::firstOrCreate(['name' => $name]);
            $categoryMap[$name] = $category->id;
        }

        return $categoryMap;
    }

    private function createProducts(array $categoryMap, Warehouse $warehouse): array
    {
        $products = [];

        $catalog = [
            // Beverages
            ['category' => 'Beverages', 'name' => 'Mineral Water 500ml', 'sku' => 'WATER-500', 'price' => 50, 'variants' => [['name' => '500ml', 'suffix' => '-500', 'delta' => 0, 'stock' => 100]]],
            ['category' => 'Beverages', 'name' => 'Mineral Water 1L', 'sku' => 'WATER-1L', 'price' => 80, 'variants' => [['name' => '1L', 'suffix' => '-1L', 'delta' => 0, 'stock' => 80]]],
            ['category' => 'Beverages', 'name' => 'Soda', 'sku' => 'SODA', 'price' => 60, 'variants' => [['name' => '500ml', 'suffix' => '-500', 'delta' => 0, 'stock' => 50], ['name' => '1L', 'suffix' => '-1L', 'delta' => 40, 'stock' => 30]]],
            ['category' => 'Beverages', 'name' => 'Energy Drink', 'sku' => 'ENERGY', 'price' => 150, 'variants' => [['name' => '250ml', 'suffix' => '-250', 'delta' => 0, 'stock' => 40]]],
            ['category' => 'Beverages', 'name' => 'Orange Juice', 'sku' => 'JUICE-ORANGE', 'price' => 120, 'variants' => [['name' => '1L', 'suffix' => '-1L', 'delta' => 0, 'stock' => 25]]],
            ['category' => 'Beverages', 'name' => 'Milk 1L', 'sku' => 'MILK-1L', 'price' => 130, 'variants' => [['name' => '1L', 'suffix' => '-1L', 'delta' => 0, 'stock' => 30]]],

            // Snacks
            ['category' => 'Snacks', 'name' => 'Potato Chips', 'sku' => 'CHIPS', 'price' => 50, 'variants' => [['name' => 'Regular', 'suffix' => '-REG', 'delta' => 0, 'stock' => 60], ['name' => 'Large', 'suffix' => '-LGE', 'delta' => 30, 'stock' => 35]]],
            ['category' => 'Snacks', 'name' => 'Biscuits', 'sku' => 'BISCUITS', 'price' => 40, 'variants' => [['name' => 'Pack', 'suffix' => '-PK', 'delta' => 0, 'stock' => 45]]],
            ['category' => 'Snacks', 'name' => 'Chocolate Bar', 'sku' => 'CHOCO', 'price' => 80, 'variants' => [['name' => 'Regular', 'suffix' => '-REG', 'delta' => 0, 'stock' => 55]]],
            ['category' => 'Snacks', 'name' => 'Popcorn', 'sku' => 'POPCORN', 'price' => 30, 'variants' => [['name' => 'Small', 'suffix' => '-SML', 'delta' => 0, 'stock' => 70]]],

            // Dairy
            ['category' => 'Dairy', 'name' => 'Yogurt', 'sku' => 'YOGURT', 'price' => 70, 'variants' => [['name' => '400g', 'suffix' => '-400', 'delta' => 0, 'stock' => 40]]],
            ['category' => 'Dairy', 'name' => 'Cheese', 'sku' => 'CHEESE', 'price' => 250, 'variants' => [['name' => '200g', 'suffix' => '-200', 'delta' => 0, 'stock' => 20]]],
            ['category' => 'Dairy', 'name' => 'Butter', 'sku' => 'BUTTER', 'price' => 180, 'variants' => [['name' => '250g', 'suffix' => '-250', 'delta' => 0, 'stock' => 25]]],

            // Bakery
            ['category' => 'Bakery', 'name' => 'Bread 400g', 'sku' => 'BREAD-400', 'price' => 65, 'variants' => [['name' => '400g', 'suffix' => '-400', 'delta' => 0, 'stock' => 50]]],
            ['category' => 'Bakery', 'name' => 'Bread 800g', 'sku' => 'BREAD-800', 'price' => 110, 'variants' => [['name' => '800g', 'suffix' => '-800', 'delta' => 0, 'stock' => 35]]],
            ['category' => 'Bakery', 'name' => 'Eggs (tray)', 'sku' => 'EGGS-TRAY', 'price' => 420, 'variants' => [['name' => '30 pcs', 'suffix' => '-30', 'delta' => 0, 'stock' => 15]]],
            ['category' => 'Bakery', 'name' => 'Mandazi', 'sku' => 'MANDAZI', 'price' => 20, 'variants' => [['name' => 'Piece', 'suffix' => '-PC', 'delta' => 0, 'stock' => 200]]],

            // Pantry
            ['category' => 'Pantry', 'name' => 'Sugar 1kg', 'sku' => 'SUGAR-1KG', 'price' => 210, 'variants' => [['name' => '1kg', 'suffix' => '-1KG', 'delta' => 0, 'stock' => 30]]],
            ['category' => 'Pantry', 'name' => 'Sugar 2kg', 'sku' => 'SUGAR-2KG', 'price' => 400, 'variants' => [['name' => '2kg', 'suffix' => '-2KG', 'delta' => 0, 'stock' => 20]]],
            ['category' => 'Pantry', 'name' => 'Cooking Oil 1L', 'sku' => 'OIL-1L', 'price' => 320, 'variants' => [['name' => '1L', 'suffix' => '-1L', 'delta' => 0, 'stock' => 25]]],
            ['category' => 'Pantry', 'name' => 'Cooking Oil 2L', 'sku' => 'OIL-2L', 'price' => 600, 'variants' => [['name' => '2L', 'suffix' => '-2L', 'delta' => 0, 'stock' => 15]]],
            ['category' => 'Pantry', 'name' => 'Rice 1kg', 'sku' => 'RICE-1KG', 'price' => 180, 'variants' => [['name' => '1kg', 'suffix' => '-1KG', 'delta' => 0, 'stock' => 40]]],
            ['category' => 'Pantry', 'name' => 'Rice 2kg', 'sku' => 'RICE-2KG', 'price' => 350, 'variants' => [['name' => '2kg', 'suffix' => '-2KG', 'delta' => 0, 'stock' => 25]]],
            ['category' => 'Pantry', 'name' => 'Salt', 'sku' => 'SALT', 'price' => 50, 'variants' => [['name' => '500g', 'suffix' => '-500', 'delta' => 0, 'stock' => 60]]],
            ['category' => 'Pantry', 'name' => 'Maize Flour 1kg', 'sku' => 'FLOUR-MAIZE', 'price' => 120, 'variants' => [['name' => '1kg', 'suffix' => '-1KG', 'delta' => 0, 'stock' => 45]]],
            ['category' => 'Pantry', 'name' => 'Wheat Flour 1kg', 'sku' => 'FLOUR-WHEAT', 'price' => 140, 'variants' => [['name' => '1kg', 'suffix' => '-1KG', 'delta' => 0, 'stock' => 40]]],

            // Household
            ['category' => 'Household', 'name' => 'Detergent', 'sku' => 'DETERGENT', 'price' => 150, 'variants' => [['name' => '1L', 'suffix' => '-1L', 'delta' => 0, 'stock' => 30]]],
            ['category' => 'Household', 'name' => 'Toilet Paper', 'sku' => 'TOILET-PAPER', 'price' => 300, 'variants' => [['name' => '4 rolls', 'suffix' => '-4', 'delta' => 0, 'stock' => 25]]],
            ['category' => 'Household', 'name' => 'Tissues', 'sku' => 'TISSUES', 'price' => 100, 'variants' => [['name' => 'Box', 'suffix' => '-BOX', 'delta' => 0, 'stock' => 40]]],
            ['category' => 'Household', 'name' => 'Soap', 'sku' => 'SOAP', 'price' => 60, 'variants' => [['name' => 'Bar', 'suffix' => '-BAR', 'delta' => 0, 'stock' => 80]]],

            // Personal Care
            ['category' => 'Personal Care', 'name' => 'Toothpaste', 'sku' => 'TOOTHPASTE', 'price' => 150, 'variants' => [['name' => '100ml', 'suffix' => '-100', 'delta' => 0, 'stock' => 35]]],
            ['category' => 'Personal Care', 'name' => 'Toothbrush', 'sku' => 'TOOTHBRUSH', 'price' => 80, 'variants' => [['name' => 'Soft', 'suffix' => '-SOFT', 'delta' => 0, 'stock' => 45]]],
            ['category' => 'Personal Care', 'name' => 'Shampoo', 'sku' => 'SHAMPOO', 'price' => 250, 'variants' => [['name' => '400ml', 'suffix' => '-400', 'delta' => 0, 'stock' => 30]]],
            ['category' => 'Personal Care', 'name' => 'Body Lotion', 'sku' => 'LOTION', 'price' => 200, 'variants' => [['name' => '200ml', 'suffix' => '-200', 'delta' => 0, 'stock' => 25]]],

            // Electronics
            ['category' => 'Electronics', 'name' => 'Flashlight', 'sku' => 'FLASHLIGHT', 'price' => 450, 'variants' => [['name' => 'LED', 'suffix' => '-LED', 'delta' => 0, 'stock' => 15]]],
            ['category' => 'Electronics', 'name' => 'Batteries AA', 'sku' => 'BATTERY-AA', 'price' => 100, 'variants' => [['name' => '4 pack', 'suffix' => '-4', 'delta' => 0, 'stock' => 30]]],
            ['category' => 'Electronics', 'name' => 'Phone Charger', 'sku' => 'CHARGER', 'price' => 800, 'variants' => [['name' => 'USB', 'suffix' => '-USB', 'delta' => 0, 'stock' => 20]]],

            // Stationery
            ['category' => 'Stationery', 'name' => 'Notebook', 'sku' => 'NOTEBOOK', 'price' => 80, 'variants' => [['name' => '96 pages', 'suffix' => '-96', 'delta' => 0, 'stock' => 50]]],
            ['category' => 'Stationery', 'name' => 'Pen', 'sku' => 'PEN', 'price' => 30, 'variants' => [['name' => 'Blue', 'suffix' => '-BLU', 'delta' => 0, 'stock' => 100], ['name' => 'Black', 'suffix' => '-BLK', 'delta' => 0, 'stock' => 100]]],
            ['category' => 'Stationery', 'name' => 'Pencil', 'sku' => 'PENCIL', 'price' => 20, 'variants' => [['name' => 'HB', 'suffix' => '-HB', 'delta' => 0, 'stock' => 80]]],
            ['category' => 'Stationery', 'name' => 'Ruler', 'sku' => 'RULER', 'price' => 25, 'variants' => [['name' => '30cm', 'suffix' => '-30', 'delta' => 0, 'stock' => 60]]],
        ];

        foreach ($catalog as $row) {
            $categoryId = $categoryMap[$row['category']] ?? null;
            if (! $categoryId) {
                continue;
            }

            $product = Product::firstOrCreate(
                ['sku' => $row['sku']],
                [
                    'category_id' => $categoryId,
                    'name' => $row['name'],
                    'description' => null,
                    'base_price' => $row['price'],
                    'is_active' => true,
                ]
            );

            $product->update([
                'category_id' => $categoryId,
                'name' => $row['name'],
                'base_price' => $row['price'],
                'is_active' => true,
            ]);

            foreach ($row['variants'] as $variantRow) {
                $variant = ProductVariant::firstOrCreate(
                    [
                        'product_id' => $product->id,
                        'variant_name' => $variantRow['name'],
                    ],
                    [
                        'sku_suffix' => $variantRow['suffix'],
                        'price_delta' => $variantRow['delta'],
                    ]
                );

                StockLevel::firstOrCreate(
                    [
                        'warehouse_id' => $warehouse->id,
                        'product_variant_id' => $variant->id,
                    ],
                    [
                        'quantity_on_hand' => $variantRow['stock'],
                        'reorder_point' => 5,
                    ]
                );

                $products[] = $variant->id;
            }
        }

        return $products;
    }

    private function createCustomers(int $regionId): array
    {
        $customers = [];

        $customerData = [
            ['name' => 'John Kamau', 'email' => 'john.kamau@example.com', 'phone' => '+254712345678'],
            ['name' => 'Mary Wanjiku', 'email' => 'mary.wanjiku@example.com', 'phone' => '+254723456789'],
            ['name' => 'Peter Omondi', 'email' => 'peter.omondi@example.com', 'phone' => '+254734567890'],
            ['name' => 'Grace Achieng', 'email' => 'grace.achieng@example.com', 'phone' => '+254745678901'],
            ['name' => 'David Kimani', 'email' => 'david.kimani@example.com', 'phone' => '+254756789012'],
            ['name' => 'Sarah Njeri', 'email' => 'sarah.njeri@example.com', 'phone' => '+254767890123'],
            ['name' => 'James Ochieng', 'email' => 'james.ochieng@example.com', 'phone' => '+254778901234'],
            ['name' => 'Elizabeth Muthoni', 'email' => 'elizabeth.muthoni@example.com', 'phone' => '+254789012345'],
            ['name' => 'Michael Kipkorir', 'email' => 'michael.kipkorir@example.com', 'phone' => '+254790123456'],
            ['name' => 'Fatuma Ali', 'email' => 'fatuma.ali@example.com', 'phone' => '+254701234567'],
        ];

        foreach ($customerData as $data) {
            $customer = Customer::firstOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'phone' => $data['phone'],
                    'password' => null,
                    'region_id' => $regionId,
                ]
            );
            $customers[] = $customer->id;
        }

        return $customers;
    }

    private function createCashiers(Branch $branch): array
    {
        $cashiers = [];

        $cashierData = [
            ['name' => 'Wanjiku Kamau', 'email' => 'cashier1@cws.com'],
            ['name' => 'Kevin Omondi', 'email' => 'cashier2@cws.com'],
            ['name' => 'Lucy Njeri', 'email' => 'cashier3@cws.com'],
        ];

        foreach ($cashierData as $data) {
            $cashier = User::firstOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => Hash::make('password'),
                    'branch_id' => $branch->id,
                    'is_active' => true,
                ]
            );

            $cashier->forceFill(['email_verified_at' => now()])->save();
            $cashier->assignRole('Cashier');
            $cashiers[] = $cashier->id;
        }

        return $cashiers;
    }

    private function generateTransactions(
        Branch $branch,
        Warehouse $warehouse,
        array $productVariants,
        array $customers,
        array $cashiers
    ): void {
        $statuses = ['pending', 'completed', 'cancelled', 'refunded'];
        $paymentGateways = ['cash', 'mpesa', 'card'];
        $sources = ['pos', 'online'];

        // Generate transactions for 10 days
        $startDate = now()->subDays(10);

        for ($day = 0; $day < 10; $day++) {
            $currentDate = $startDate->copy()->addDays($day);

            // Number of orders varies by day (more on weekends)
            $isWeekend = $currentDate->isWeekend();
            $orderCount = $isWeekend ? rand(15, 25) : rand(8, 18);

            // Create till sessions for the day
            $tillSessions = [];
            foreach ($cashiers as $cashierId) {
                if (rand(0, 1)) { // Not all cashiers work every day
                    $session = TillSession::create([
                        'branch_id' => $branch->id,
                        'user_id' => $cashierId,
                        'opened_at' => $currentDate->copy()->setHour(8 + rand(0, 1))->setMinute(rand(0, 30)),
                        'closed_at' => $currentDate->copy()->setHour(17 + rand(0, 2))->setMinute(rand(0, 59)),
                        'opening_cash' => rand(5000, 10000) / 100,
                        'closing_cash' => rand(15000, 35000) / 100,
                        'status' => 'closed',
                    ]);
                    $tillSessions[] = $session->id;
                }
            }

            // Generate orders throughout the day
            for ($i = 0; $i < $orderCount; $i++) {
                $hour = rand(8, 20);
                $minute = rand(0, 59);
                $orderTime = $currentDate->copy()->setHour($hour)->setMinute($minute);

                $status = $this->weightedRandomStatus();
                $tillSessionId = ! empty($tillSessions) ? $tillSessions[array_rand($tillSessions)] : null;
                $customerId = (rand(0, 1) && ! empty($customers)) ? $customers[array_rand($customers)] : null;
                $source = $sources[array_rand($sources)];

                // Create order
                $order = Order::create([
                    'branch_id' => $branch->id,
                    'customer_id' => $customerId,
                    'till_session_id' => $tillSessionId,
                    'source' => $source,
                    'status' => $status,
                    'subtotal' => 0,
                    'tax' => 0,
                    'total' => 0,
                    'currency_code' => 'KES',
                    'created_at' => $orderTime,
                    'updated_at' => $orderTime,
                ]);

                // Add order items
                $itemCount = rand(1, 8);
                $subtotal = 0;

                for ($j = 0; $j < $itemCount; $j++) {
                    $variantId = $productVariants[array_rand($productVariants)];
                    $variant = ProductVariant::find($variantId);
                    $product = $variant->product;

                    $quantity = rand(1, 5);
                    $unitPrice = $product->base_price + $variant->price_delta;
                    $discount = (rand(0, 10) === 0) ? rand(5, 20) : 0; // 10% chance of discount

                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_variant_id' => $variantId,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'discount' => $discount,
                        'created_at' => $orderTime,
                        'updated_at' => $orderTime,
                    ]);

                    $subtotal += ($unitPrice * $quantity) - $discount;

                    // Update stock if order is completed
                    if ($status === 'completed') {
                        $stockLevel = StockLevel::where('warehouse_id', $warehouse->id)
                            ->where('product_variant_id', $variantId)
                            ->first();

                        if ($stockLevel && $stockLevel->quantity_on_hand >= $quantity) {
                            $stockLevel->decrement('quantity_on_hand', $quantity);

                            StockMovement::create([
                                'warehouse_id' => $warehouse->id,
                                'product_variant_id' => $variantId,
                                'quantity' => -$quantity,
                                'type' => 'sale',
                                'reference_id' => $order->id,
                                'created_by' => $cashiers[array_rand($cashiers)],
                                'notes' => "Order #{$order->id}",
                                'created_at' => $orderTime,
                                'updated_at' => $orderTime,
                            ]);
                        }
                    }
                }

                // Calculate tax (16% in Kenya)
                $tax = round($subtotal * 0.16, 2);
                $total = $subtotal + $tax;

                $order->update([
                    'subtotal' => $subtotal,
                    'tax' => $tax,
                    'total' => $total,
                ]);

                // Create payment for completed orders
                if (in_array($status, ['completed', 'pending'])) {
                    $gateway = $paymentGateways[array_rand($paymentGateways)];
                    $paymentStatus = $status === 'completed' ? 'success' : 'pending';

                    Payment::create([
                        'order_id' => $order->id,
                        'gateway' => $gateway,
                        'amount' => $total,
                        'status' => $paymentStatus,
                        'gateway_reference' => strtoupper(Str::random(12)),
                        'raw_response' => json_encode(['status' => $paymentStatus]),
                        'created_at' => $orderTime,
                        'updated_at' => $orderTime,
                    ]);
                }
            }
        }
    }

    private function weightedRandomStatus(): string
    {
        // Most orders are completed, some pending, few cancelled/refunded
        $rand = rand(1, 100);

        if ($rand <= 85) {
            return 'completed';
        } elseif ($rand <= 95) {
            return 'pending';
        } elseif ($rand <= 98) {
            return 'cancelled';
        } else {
            return 'refunded';
        }
    }
}
