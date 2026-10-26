<?php

namespace App\Ai;

final class AiInputGuard
{
    /**
     * Refuse requests that ask the assistant to leave its role or produce
     * code/files/documents. The tool agents are for CWSPOS work only.
     */
    public function refusal(string $input): ?string
    {
        $normalized = mb_strtolower(trim($input));

        $unsafePatterns = [
            '/<!?doctype|<\s*html|<\s*script|<\s*style/i',
            '/\b(html|css|javascript|typescript|php|python|sql|bash)\s+(file|code|page|script|snippet)\b/i',
            '/\b(build|create|write|generate|make)\s+(me\s+)?(a|an)?\s*(website|web\s*page|html|code|script|file|document|spreadsheet|presentation)\b/i',
            '/\b(save|open)\s+(it|this|the\s+file)\s+as\s+[a-z0-9_.-]+\.(html|php|js|py|css)\b/i',
            '/\b(write|create|generate|make)\s+(me\s+)?(a|an)?\s*[a-z0-9\s]{0,50}\b(page|website|site|document)\b/i',
            '/\b(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts)\b/i',
            '/\b(reveal|show|print|repeat)\s+(your\s+)?(system|developer)\s+(prompt|instructions|message)\b/i',
        ];

        foreach ($unsafePatterns as $pattern) {
            if (preg_match($pattern, $normalized) === 1) {
                return 'I can help with shop products, your cart, pickup and your own orders. I cannot create code, HTML, files or documents, and I will not change my operating rules.';
            }
        }

        return null;
    }
}
