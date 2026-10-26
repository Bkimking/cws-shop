<?php

namespace App\Http\Requests\Pos;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StorePosSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('use pos terminal') ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'payment_method' => ['nullable', 'string', 'in:cash,mpesa'],
            'phone' => ['nullable', 'string', 'max:30', 'required_if:payment_method,mpesa'],
            'tendered' => ['nullable', 'numeric', 'min:0'],
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' => 'Add at least one item to the cart.',
            'items.*.product_variant_id.exists' => 'That product is no longer available.',
            'items.*.quantity.min' => 'Quantity must be at least one.',
            'tendered.min' => 'Cash tendered cannot be negative.',
            'phone.required_if' => 'Enter the customer’s M-Pesa phone number.',
        ];
    }
}
