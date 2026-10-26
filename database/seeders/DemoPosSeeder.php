<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockLevel;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Optional local demo data for the cashier terminal.
 *
 * Not called by DatabaseSeeder. Run it with:
 *   php artisan db:seed --class=DemoPosSeeder
 */
class DemoPosSeeder extends Seeder
{
    public function run(): void
    {
        $branch = Branch::query()->where('slug', 'ngong')->first();

        if (! $branch) {
            $this->command->error('Ngong branch not found. Run DatabaseSeeder first.');

            return;
        }

        $warehouse = Warehouse::firstOrCreate([
            'branch_id' => $branch->id,
            'name' => 'Shop floor',
        ]);

        $catalog = [
            [
                'category' => 'Drinks',
                'name' => 'Milk 1L',
                'sku' => 'MILK-1L',
                'price' => 130,
                'stock' => 24,
                'variants' => [['name' => '1L', 'suffix' => '-1L', 'delta' => 0, 'stock' => 24]],
            ],
            [
                'category' => 'Bakery',
                'name' => 'Bread 400g',
                'sku' => 'BREAD-400',
                'price' => 65,
                'stock' => 8,
                'variants' => [['name' => '400g', 'suffix' => '-400', 'delta' => 0, 'stock' => 8]],
            ],
            [
                'category' => 'Pantry',
                'name' => 'Sugar 1kg',
                'sku' => 'SUGAR-1KG',
                'price' => 210,
                'stock' => 2,
                'variants' => [['name' => '1kg', 'suffix' => '-1KG', 'delta' => 0, 'stock' => 2]],
            ],
            [
                'category' => 'Drinks',
                'name' => 'Soda',
                'sku' => 'SODA',
                'price' => 60,
                'stock' => 46,
                'variants' => [
                    ['name' => '500ml', 'suffix' => '-500', 'delta' => 0, 'stock' => 40],
                    ['name' => '1L', 'suffix' => '-1L', 'delta' => 40, 'stock' => 6],
                ],
            ],
            [
                'category' => 'Pantry',
                'name' => 'Cooking Oil 1L',
                'sku' => 'OIL-1L',
                'price' => 320,
                'stock' => 12,
                'variants' => [['name' => '1L', 'suffix' => '-1L', 'delta' => 0, 'stock' => 12]],
            ],
            [
                'category' => 'Bakery',
                'name' => 'Eggs (tray)',
                'sku' => 'EGGS-TRAY',
                'price' => 420,
                'stock' => 6,
                'variants' => [['name' => '30 pcs', 'suffix' => '-30', 'delta' => 0, 'stock' => 6]],
            ],
        ];

        foreach ($catalog as $row) {
            $category = Category::firstOrCreate(['name' => $row['category']]);

            $product = Product::firstOrCreate(
                ['sku' => $row['sku']],
                [
                    'category_id' => $category->id,
                    'name' => $row['name'],
                    'description' => null,
                    'base_price' => $row['price'],
                    'is_active' => true,
                ]
            );

            $product->update([
                'category_id' => $category->id,
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
                        'reorder_point' => 3,
                    ]
                );
            }
        }

        $cashier = User::firstOrCreate(
            ['email' => 'cashier@cws.com'],
            [
                'name' => 'Wanjiku (Cashier)',
                'password' => Hash::make('password'),
                'branch_id' => $branch->id,
                'is_active' => true,
            ]
        );

        $cashier->forceFill(['email_verified_at' => now()])->save();
        $cashier->assignRole('Cashier');

        $this->command->info('Demo POS catalog created for Ngong.');
        $this->command->info('Cashier login: cashier@cws.com / password');
    }
}
