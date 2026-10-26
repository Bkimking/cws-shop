<?php

namespace App\Ai\Agents;

use App\Ai\AiScope;
use App\Ai\Concerns\UsesProviderFailover;
use App\Ai\Tools\LowStockTool;
use App\Ai\Tools\RefundSummaryTool;
use App\Ai\Tools\TillSummaryTool;
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
class InsightsAgent implements Agent, CanActAsTool, HasTools
{
    use Promptable, UsesProviderFailover;

    public function __construct(public readonly AiScope $scope) {}

    public function name(): string
    {
        return 'insights_agent';
    }

    public function description(): Stringable|string
    {
        return 'Delegates anomaly and risk questions: low stock, refunds and till variances inside the scope.';
    }

    public function instructions(): Stringable|string
    {
        return 'You are the insights specialist for '.$this->scope->label().'. Look for anomalies using the tools. State evidence and never invent causes.';
    }

    public function tools(): iterable
    {
        return [
            new LowStockTool($this->scope),
            new RefundSummaryTool($this->scope),
            new TillSummaryTool($this->scope),
        ];
    }
}
