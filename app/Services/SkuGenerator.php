<?php

namespace App\Services;

class SkuGenerator
{
    /**
     * Generate product SKU from category ID, product name, and product ID.
     *
     * @param  int  $categoryId  The category ID
     * @param  string  $productName  The product name
     * @param  int|null  $productId  The product ID (null for preview)
     * @return string The generated SKU
     */
    public function generateProductSku(int $categoryId, string $productName, ?int $productId = null): string
    {
        $nameAbbreviation = $this->abbreviateName($productName);
        $sequence = $productId ?? 'NEW';

        return sprintf('%d-%s-%s', $categoryId, $nameAbbreviation, $sequence);
    }

    /**
     * Generate variant suffix from variant name.
     *
     * @param  string  $variantName  The variant name (e.g., "Large", "Blue", "Size L")
     * @return string The generated suffix (e.g., "-L", "-B")
     */
    public function generateVariantSuffix(string $variantName): string
    {
        // Take first letter of the first word, uppercase
        $firstWord = $this->getFirstWord($variantName);
        $firstLetter = strtoupper(substr($firstWord, 0, 1));

        return '-'.$firstLetter;
    }

    /**
     * Abbreviate product name by taking first 3 letters of each word.
     *
     * @param  string  $name  The product name
     * @return string The abbreviated name (e.g., "Cotton T-Shirt" -> "CTN-TSH")
     */
    private function abbreviateName(string $name): string
    {
        $words = preg_split('/[\s\-_]+/', $name);
        $abbreviated = [];

        foreach ($words as $word) {
            if (strlen($word) >= 3) {
                $abbreviated[] = strtoupper(substr($word, 0, 3));
            } else {
                $abbreviated[] = strtoupper($word);
            }
        }

        return implode('-', $abbreviated);
    }

    /**
     * Get the first word from a string.
     *
     * @param  string  $string  The input string
     * @return string The first word
     */
    private function getFirstWord(string $string): string
    {
        $words = preg_split('/[\s\-_]+/', trim($string));

        return $words[0] ?? '';
    }
}
