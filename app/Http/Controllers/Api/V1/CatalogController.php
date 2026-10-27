<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Pos\Concerns\ResolvesTerminalBranch;
use App\Services\PosCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    use ResolvesTerminalBranch;

    public function categories(Request $request, PosCatalogService $catalog): JsonResponse
    {
        $branch = $this->terminalBranch($request);

        return response()->json([
            'message' => 'Categories loaded.',
            'data' => $catalog->forBranch($branch)['categories'],
        ]);
    }

    public function products(Request $request, PosCatalogService $catalog): JsonResponse
    {
        $branch = $this->terminalBranch($request);
        $data = $catalog->forBranch($branch);
        $since = $request->query('since');

        if (is_string($since) && $since !== '') {
            $data['products'] = collect($data['products'])
                ->filter(fn (array $product) => ($product['updated_at'] ?? '') > $since)
                ->values()
                ->all();
        }

        return response()->json([
            'message' => 'Products loaded.',
            'data' => [
                'products' => $data['products'],
                'categories' => $data['categories'],
                'server_time' => now()->toIso8601String(),
            ],
        ]);
    }
}
