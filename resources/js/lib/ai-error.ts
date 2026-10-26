export function formatAiError(error: string | null | undefined): string {
    const message = (error ?? '').toLowerCase();

    if (message === '') {
        return 'The AI assistant could not complete that request. Try again.';
    }

    if (
        message.includes('rate limit') ||
        message.includes('too many requests') ||
        message.includes('429')
    ) {
        return 'All configured AI providers are busy right now. Try again in a moment.';
    }

    if (
        message.includes('quota') ||
        message.includes('insufficient') ||
        message.includes('billing')
    ) {
        return 'The AI provider quota is exhausted. Top up the provider account or add another provider key.';
    }

    if (
        message.includes('api key') ||
        message.includes('unauthorized') ||
        message.includes('401') ||
        message.includes('403')
    ) {
        return 'An AI provider rejected its API key. Check the provider keys in .env and clear the config cache.';
    }

    if (message.includes('timeout') || message.includes('timed out')) {
        return 'The AI providers took too long to respond. Try again.';
    }

    if (message.includes('model') && message.includes('not found')) {
        return 'The configured AI model is unavailable. Check the model settings.';
    }

    if (
        message.includes('no ai provider') ||
        message.includes('not configured')
    ) {
        return 'No AI provider is configured yet. Add at least one provider API key.';
    }

    if (message.includes('turned off')) {
        return 'AI is turned off for this surface. A Superadmin can enable it in AI settings.';
    }

    if (message.includes('limit is used up')) {
        return 'Today’s AI limit is used up. It resets at midnight.';
    }

    if (message.includes('do not have access')) {
        return 'You do not have access to an AI specialist for this request.';
    }

    return 'The AI assistant could not complete that request. Try again.';
}
