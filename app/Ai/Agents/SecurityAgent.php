<?php

namespace App\Ai\Agents;

use App\Ai\AiScope;
use App\Ai\Concerns\UsesProviderFailover;
use App\Ai\Tools\FailedLoginsTool;
use App\Ai\Tools\ListUsersTool;
use App\Ai\Tools\SecurityEventsTool;
use App\Ai\Tools\SecurityOverviewTool;
use App\Ai\Tools\UserAccessTool;
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
class SecurityAgent implements Agent, CanActAsTool, HasTools
{
    use Promptable, UsesProviderFailover;

    public function __construct(public readonly AiScope $scope) {}

    public function name(): string
    {
        return 'security_agent';
    }

    public function description(): Stringable|string
    {
        return 'Delegates Superadmin-only user access and security-risk reviews. It is read-only and never returns passwords, 2FA secrets, tokens or keys.';
    }

    public function instructions(): Stringable|string
    {
        return 'You are the security and access specialist for CWSPOS. Only Superadmin data is available. Use the user tools for staff roles, scope, 2FA, passkeys and sessions. Use the security tools for risk summaries, audit events and failed sign-in attempts. Never expose passwords, two-factor secrets, recovery codes, tokens or API keys. Never change accounts. State that security recommendations need a human decision.';
    }

    public function tools(): iterable
    {
        return [
            new SecurityOverviewTool($this->scope),
            new ListUsersTool($this->scope),
            new UserAccessTool($this->scope),
            new SecurityEventsTool($this->scope),
            new FailedLoginsTool($this->scope),
        ];
    }
}
