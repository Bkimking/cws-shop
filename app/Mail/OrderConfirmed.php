<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderConfirmed extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Payment received for order #'.str_pad((string) $this->order->id, 4, '0', STR_PAD_LEFT),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.order-confirmed',
            with: [
                'order' => $this->order,
                'pickup' => $this->order->pickupWarehouse,
                'branch' => $this->order->branch,
                'orderUrl' => route('shop.order', $this->order->public_token),
            ],
        );
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
