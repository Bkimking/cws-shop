<?php

namespace App\Ai\Agents;

use App\Ai\AiScope;
use App\Ai\Concerns\UsesProviderFailover;
use App\Ai\Tools\OrderLookupTool;
use App\Ai\Tools\OrderSearchTool;
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
class OrdersAgent implements Agent, CanActAsTool, HasTools
{
    use Promptable, UsesProviderFailover;

    public function __construct(public readonly AiScope $scope) {}

    public function name(): string
    {
        return 'orders_agent';
    }

    public function description(): Stringable|string
    {
        return 'Delegates order lookup and order search questions inside the scoped branch or region.';
    }

    public function instructions(): Stringable|string
    {
        return 'You are the orders specialist for '.$this->scope->label().'. Use order tools. Never invent orders or payments. Do not change orders.';
    }

    public function tools(): iterable
    {
        return [
            new OrderLookupTool($this->scope),
            new OrderSearchTool($this->scope),
        ];
    }
}
