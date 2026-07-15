<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FileUpload extends Model
{
    protected $table = 'files';

    protected $fillable = [
        'owner_user_id', 'name', 'original_name',
        'mime_type', 'file_size', 'disk', 'path',
    ];

    protected $casts = [
        'file_size' => 'integer',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }
}
