<?php

namespace App\Ai\Agents;

use App\Ai\AiScope;
use App\Ai\Concerns\UsesProviderFailover;
use App\Ai\Tools\PaymentBreakdownTool;
use App\Ai\Tools\RefundSummaryTool;
use App\Ai\Tools\SalesSummaryTool;
use App\Ai\Tools\SalesTrendTool;
use App\Ai\Tools\TillSummaryTool;
use App\Ai\Tools\TopProductsTool;
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
class ReportsAgent implements Agent, CanActAsTool, HasTools
{
    use Promptable, UsesProviderFailover;

    public function __construct(public readonly AiScope $scope) {}

    public function name(): string
    {
        return 'reports_agent';
    }

    public function description(): Stringable|string
    {
        return 'Delegates sales, payment, refund, till and branch-comparison questions. It only sees the scope passed to it.';
    }

    public function instructions(): Stringable|string
    {
        return 'You are the reports specialist for '.$this->scope->label().'. Use the sales tools. Never invent figures. Return concise facts with dates and currency. Do not change data.';
    }

    public function tools(): iterable
    {
        return [
            new SalesSummaryTool($this->scope),
            new SalesTrendTool($this->scope),
            new TopProductsTool($this->scope),
            new PaymentBreakdownTool($this->scope),
            new RefundSummaryTool($this->scope),
            new TillSummaryTool($this->scope),
        ];
    }
}
