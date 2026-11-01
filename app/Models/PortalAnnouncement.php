<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PortalAnnouncement extends Model
{
    protected $fillable = ['portal_id', 'title', 'body', 'type', 'pinned', 'download_url', 'published_at', 'read_at'];

    protected function casts(): array
    {
        return ['pinned' => 'boolean', 'published_at' => 'datetime', 'read_at' => 'datetime'];
    }
}
