<?php

namespace App\Ai\Agents;

use App\Ai\AiScope;
use App\Ai\Concerns\UsesProviderFailover;
use App\Ai\Tools\LowStockTool;
use App\Ai\Tools\StockOnHandTool;
use Laravel\Ai\Attributes\MaxSteps;
use Laravel\Ai\Attributes\MaxTokens;
use Laravel\Ai\Attributes\Timeout;
use Laravel\Ai\Attributes\UseCheapestModel;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\CanActAsTool;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Promptable;
use Stringable;

#[UseCheapestModel]
#[MaxSteps(5)]
#[MaxTokens(1200)]
#[Timeout(60)]
class InventoryAgent implements Agent, CanActAsTool, HasTools
{
    use Promptable, UsesProviderFailover;

    public function __construct(public readonly AiScope $scope) {}

    public function name(): string
    {
        return 'inventory_agent';
    }

    public function description(): Stringable|string
    {
        return 'Delegates stock-on-hand, low-stock and reorder questions for the scoped branch or region.';
    }

    public function instructions(): Stringable|string
    {
        return 'You are the inventory specialist for '.$this->scope->label().'. Use stock tools. Never invent quantities. Do not change stock.';
    }

    public function tools(): iterable
    {
        return [
            new LowStockTool($this->scope),
            new StockOnHandTool($this->scope),
        ];
    }
}
